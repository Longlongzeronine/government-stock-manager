import { createServerFn } from "@tanstack/react-start";

export type Role = "admin" | "super_admin" | "regular_user" | "permanent_employee" | "supply_officer" | "inspection_officer" | "financial_analyst";
const roles = new Set<Role>(["admin", "super_admin", "regular_user", "permanent_employee", "supply_officer", "inspection_officer", "financial_analyst"]);

interface AdminRequest {
  accessToken: string;
}

interface RoleRequest extends AdminRequest {
  userId: string;
  roles: Role[];
  employmentStatus: EmploymentStatus;
}
type EmploymentStatus = "Permanent" | "Casual" | "Contractual" | "Job Order";
const employmentStatuses = new Set<EmploymentStatus>(["Permanent", "Casual", "Contractual", "Job Order"]);

interface PasswordRequest extends AdminRequest {
  userId: string;
  password: string;
}

interface DisableRequest extends AdminRequest {
  userId: string;
  disabled: boolean;
}

interface DeleteRequest extends AdminRequest {
  userId: string;
}

interface CreateUserRequest extends AdminRequest {
  email: string;
  password: string;
  fullName: string;
  roles: Role[];
  employmentStatus: EmploymentStatus;
}

function assertRole(role: string): asserts role is Role {
  if (!roles.has(role as Role)) throw new Error("Invalid role");
}

function assertRoles(input: string[]) {
  if (!input.length || input.some((role) => !roles.has(role as Role))) {
    throw new Error("Choose at least one valid role");
  }
  return [...new Set(input)] as Role[];
}

function assertEmploymentStatus(status: string): asserts status is EmploymentStatus {
  if (!employmentStatuses.has(status as EmploymentStatus)) throw new Error("Invalid employment status");
}

export const userRoles: Role[] = ["regular_user", "permanent_employee", "supply_officer", "inspection_officer", "financial_analyst", "admin", "super_admin"];

function isSystemAdmin(role: Role): boolean {
  return role === "admin" || role === "super_admin";
}

function getSupabaseConfig() {
  const workerEnv = (
    globalThis as typeof globalThis & {
      __WORKER_ENV__?: Record<string, unknown>;
    }
  ).__WORKER_ENV__;
  const envValue = (name: string) => {
    const value = workerEnv?.[name];
    return typeof value === "string" ? value.trim() : "";
  };
  const url =
    envValue("SUPABASE_URL") ||
    envValue("VITE_SUPABASE_URL") ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    import.meta.env.VITE_SUPABASE_URL;
  const anonKey =
    envValue("SUPABASE_PUBLISHABLE_KEY") ||
    envValue("VITE_SUPABASE_PUBLISHABLE_KEY") ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) throw new Error("Supabase public env vars missing");
  return { url, anonKey };
}

async function getAdminClient(accessToken: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const { url, anonKey } = getSupabaseConfig();
  const workerEnv = (
    globalThis as typeof globalThis & {
      __WORKER_ENV__?: Record<string, unknown>;
    }
  ).__WORKER_ENV__;
  const envValue = (name: string) => {
    const value = workerEnv?.[name];
    return typeof value === "string" ? value.trim() : "";
  };
  const serviceKey =
    envValue("SUPABASE_SERVICE_ROLE_KEY") ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const adminClient = createClient(url, serviceKey);
  const { data: auth, error: authError } =
    await userClient.auth.getUser(accessToken);
  if (authError || !auth.user) throw new Error("Unauthorized");

  const { data: roleRows, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", auth.user.id);
  if (roleError) throw new Error(roleError.message);
  if (!roleRows?.some((row: { role: string }) => row.role === "admin")) {
    throw new Error("Admin access required");
  }

  return adminClient;
}

export const listAdminUsers = createServerFn({ method: "POST" })
  .inputValidator((d: AdminRequest) => d)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const { url, anonKey } = getSupabaseConfig();
    const adminClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    });
    const { data: auth, error: authError } = await adminClient.auth.getUser(
      data.accessToken,
    );
    if (authError || !auth.user) throw new Error("Unauthorized");
    const { data: ownRoles, error: ownRolesError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", auth.user.id);
    if (ownRolesError) throw new Error(ownRolesError.message);
    if (!ownRoles?.some((row) => row.role === "admin")) {
      throw new Error("Admin access required");
    }
    const [
      { data: profiles, error: profilesError },
      { data: roleRows, error: rolesError },
    ] = await Promise.all([
      adminClient
        .from("profiles")
        .select("id, full_name, email, created_at, status, employment_status, disabled")
        .limit(5000),
      adminClient.from("user_roles").select("user_id, role").limit(5000),
    ]);
    if (profilesError)
      throw new Error(`Could not load user profiles: ${profilesError.message}`);
    if (rolesError)
      throw new Error(`Could not load user roles: ${rolesError.message}`);

    const roleById = new Map<string, Role[]>();
    (roleRows ?? []).forEach((row: { user_id: string; role: Role }) => {
      const current = roleById.get(row.user_id) ?? [];
      if (roles.has(row.role) && !current.includes(row.role)) current.push(row.role);
      roleById.set(row.user_id, current);
    });

    return (profiles ?? []).map((profile: any) => ({
      id: profile.id,
      email: profile.email ?? "",
      full_name: profile.full_name ?? null,
      roles: roleById.get(profile.id) ?? ["regular_user"],
      employment_status: profile.employment_status ?? "Casual",
      disabled: profile.disabled ?? false,
      status: profile.status ?? "pending",
      created_at: profile.created_at,
    }));
  });

export const createAdminUser = createServerFn({ method: "POST" })
  .inputValidator((d: CreateUserRequest) => d)
  .handler(async ({ data }) => {
    const assignedRoles = assertRoles(data.roles);
    assertEmploymentStatus(data.employmentStatus);

    // Pre-check Super Admin limit before creating the auth account.
    if (assignedRoles.includes("super_admin")) {
      const adminClient = await getAdminClient(data.accessToken);
      const { data: actor, error: actorError } = await adminClient.auth.getUser(data.accessToken);
      if (actorError || !actor.user) throw new Error("Could not identify administrator");
      // enforce_super_admin_limit counts active Super Admins; throws if at max.
      await adminClient.rpc("enforce_super_admin_limit", { _target_user_id: actor.user.id });
    }

    const adminClient = await getAdminClient(data.accessToken);
    const { data: created, error } = await adminClient.auth.admin.createUser({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName.trim(),
        requested_role: "regular_user",
        employment_status: data.employmentStatus,
      },
    });
    if (error) throw new Error(error.message);
    if (!created.user) throw new Error("User creation failed");

    await adminClient.from("profiles").upsert({
      id: created.user.id,
      email: created.user.email,
      full_name: data.fullName.trim(),
      status: "active",
      employment_status: data.employmentStatus,
    });
    const { data: actor, error: actorError } = await adminClient.auth.getUser(data.accessToken);
    if (actorError || !actor.user) throw new Error("Could not identify administrator");
    const { error: roleError } = await adminClient.rpc("admin_replace_user_roles", {
      _changed_by: actor.user.id, _user_id: created.user.id, _roles: assignedRoles, _employment_status: data.employmentStatus,
    });
    if (roleError) throw new Error(roleError.message);
    return { ok: true, userId: created.user.id, email: created.user.email };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .inputValidator((d: RoleRequest) => d)
  .handler(async ({ data }) => {
    const assignedRoles = assertRoles(data.roles);
    assertEmploymentStatus(data.employmentStatus);
    const adminClient = await getAdminClient(data.accessToken);
    const { data: actor, error: actorError } = await adminClient.auth.getUser(data.accessToken);
    if (actorError || !actor.user) throw new Error("Could not identify administrator");
    const { error } = await adminClient.rpc("admin_replace_user_roles", {
      _changed_by: actor.user.id, _user_id: data.userId, _roles: assignedRoles, _employment_status: data.employmentStatus,
    });
    if (error) throw new Error(error.message);
    return { ok: true, userId: data.userId, roles: assignedRoles, employmentStatus: data.employmentStatus };
  });

export const listRoleMatrix = createServerFn({ method: "POST" })
  .inputValidator((d: AdminRequest) => d)
  .handler(async ({ data }) => {
    const adminClient = await getAdminClient(data.accessToken);
    const [{ data: roleRows, error: roleError }, { data: forms, error: formsError }, { data: permissionRows, error: permissionError }] = await Promise.all([
      adminClient.from("roles").select("code,label,is_system_admin").order("label"),
      adminClient.from("forms").select("form_key,section,label,sort_order").order("sort_order"),
      adminClient.from("role_form_permissions").select("role_code,form_key,can_access"),
    ]);
    if (roleError || formsError || permissionError) throw new Error(roleError?.message ?? formsError?.message ?? permissionError?.message);
    return { roles: roleRows ?? [], forms: forms ?? [], permissions: permissionRows ?? [] };
  });

export const setRoleFormPermission = createServerFn({ method: "POST" })
  .inputValidator((d: AdminRequest & { role: Role; formKey: string; canAccess: boolean }) => d)
  .handler(async ({ data }) => {
    assertRole(data.role);
    if (data.role === "super_admin")
      throw new Error("Super Admin permissions cannot be changed through the matrix.");
    const adminClient = await getAdminClient(data.accessToken);

    const { error } = await adminClient.from("role_form_permissions").upsert(
      {
        role_code: data.role,
        form_key: data.formKey,
        can_access: data.canAccess,
      },
      { onConflict: "role_code,form_key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true, role: data.role, formKey: data.formKey, canAccess: data.canAccess };
  });

interface BatchFormPermissionRequest extends AdminRequest {
  changes: Array<{ role: Role; formKey: string; canAccess: boolean }>;
}

export const batchSetRoleFormPermissions = createServerFn({ method: "POST" })
  .inputValidator((d: BatchFormPermissionRequest) => d)
  .handler(async ({ data }) => {
    const adminClient = await getAdminClient(data.accessToken);

    for (const change of data.changes) {
      assertRole(change.role);
      if (change.role === "super_admin")
        throw new Error("Super Admin permissions cannot be changed through the matrix.");
      const { error } = await adminClient.from("role_form_permissions").upsert(
        {
          role_code: change.role,
          form_key: change.formKey,
          can_access: change.canAccess,
        },
        { onConflict: "role_code,form_key" },
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true, changesCount: data.changes.length };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .inputValidator((d: PasswordRequest) => d)
  .handler(async ({ data }) => {
    if (data.password.length < 6)
      throw new Error("Password must be at least 6 characters");
    const adminClient = await getAdminClient(data.accessToken);
    const { error } = await adminClient.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true, userId: data.userId };
  });

export const setUserDisabled = createServerFn({ method: "POST" })
  .inputValidator((d: DisableRequest) => d)
  .handler(async ({ data }) => {
    const adminClient = await getAdminClient(data.accessToken);
    const { error } = await adminClient.auth.admin.updateUserById(data.userId, {
      ban_duration: data.disabled ? "876000h" : "none",
    });
    if (error) throw new Error(error.message);
    const { error: profileError } = await adminClient.from("profiles").update({ disabled: data.disabled }).eq("id", data.userId);
    if (profileError) throw new Error(profileError.message);
    return { ok: true, userId: data.userId, disabled: data.disabled };
  });

export const deleteAdminUser = createServerFn({ method: "POST" })
  .inputValidator((d: DeleteRequest) => d)
  .handler(async ({ data }) => {
    const adminClient = await getAdminClient(data.accessToken);
    const { data: profile, error: profileLookupError } = await adminClient.from("profiles").select("email").eq("id", data.userId).maybeSingle();
    if (profileLookupError) throw new Error(profileLookupError.message);
    await adminClient.from("user_roles").delete().eq("user_id", data.userId);
    await adminClient.from("profiles").delete().eq("id", data.userId);
    const { error } = await adminClient.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true, userId: data.userId, email: profile?.email ?? null };
  });

interface ApproveRequest extends AdminRequest {
  userId: string;
}

export const approveUser = createServerFn({ method: "POST" })
  .inputValidator((d: ApproveRequest) => d)
  .handler(async ({ data }) => {
    const adminClient = await getAdminClient(data.accessToken);
    const { error } = await adminClient
      .from("profiles")
      .update({ status: "active" })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true, userId: data.userId, status: "active" };
  });

export const declineUser = createServerFn({ method: "POST" })
  .inputValidator((d: ApproveRequest) => d)
  .handler(async ({ data }) => {
    const adminClient = await getAdminClient(data.accessToken);
    const { error } = await adminClient
      .from("profiles")
      .update({ status: "declined" })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true, userId: data.userId, status: "declined" };
  });
