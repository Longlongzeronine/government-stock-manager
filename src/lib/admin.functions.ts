import { createServerFn } from "@tanstack/react-start";

type Role = "viewer" | "staff" | "accounting" | "admin";
const roles = new Set<Role>(["viewer", "staff", "accounting", "admin"]);

interface AdminRequest {
  accessToken: string;
}

interface RoleRequest extends AdminRequest {
  userId: string;
  role: Role;
}

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
  role: Role;
}

function assertRole(role: string): asserts role is Role {
  if (!roles.has(role as Role)) throw new Error("Invalid role");
}

function getSupabaseConfig() {
  const workerEnv = (globalThis as typeof globalThis & {
    __WORKER_ENV__?: Record<string, unknown>;
  }).__WORKER_ENV__;
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
  const workerEnv = (globalThis as typeof globalThis & {
    __WORKER_ENV__?: Record<string, unknown>;
  }).__WORKER_ENV__;
  const envValue = (name: string) => {
    const value = workerEnv?.[name];
    return typeof value === "string" ? value.trim() : "";
  };
  const serviceKey =
    envValue("SUPABASE_SERVICE_ROLE_KEY") ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    envValue("VITE_SUPABASE_SERVICE_ROLE_KEY") ||
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const adminClient = createClient(url, serviceKey);
  const { data: auth, error: authError } = await userClient.auth.getUser(accessToken);
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
    const { data: auth, error: authError } = await adminClient.auth.getUser(data.accessToken);
    if (authError || !auth.user) throw new Error("Unauthorized");
    const { data: ownRoles, error: ownRolesError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", auth.user.id);
    if (ownRolesError) throw new Error(ownRolesError.message);
    if (!ownRoles?.some((row) => row.role === "admin")) {
      throw new Error("Admin access required");
    }
    const [{ data: profiles, error: profilesError }, { data: roleRows, error: rolesError }] = await Promise.all([
      adminClient.from("profiles").select("id, full_name, email, created_at, status").limit(5000),
      adminClient.from("user_roles").select("user_id, role").limit(5000),
    ]);
    if (profilesError) throw new Error(`Could not load user profiles: ${profilesError.message}`);
    if (rolesError) throw new Error(`Could not load user roles: ${rolesError.message}`);

    const roleById = new Map<string, Role>();
    (roleRows ?? []).forEach((row: { user_id: string; role: Role }) => {
      roleById.set(row.user_id, roles.has(row.role) ? row.role : "viewer");
    });

    return (profiles ?? []).map((profile: any) => ({
      id: profile.id,
      email: profile.email ?? "",
      full_name: profile.full_name ?? null,
      role: roleById.get(profile.id) ?? "viewer",
      disabled: false,
      status: profile.status ?? "pending",
      created_at: profile.created_at,
    }));
  });

export const createAdminUser = createServerFn({ method: "POST" })
  .inputValidator((d: CreateUserRequest) => d)
  .handler(async ({ data }) => {
    assertRole(data.role);
    const adminClient = await getAdminClient(data.accessToken);
    const { data: created, error } = await adminClient.auth.admin.createUser({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName.trim(), requested_role: data.role },
    });
    if (error) throw new Error(error.message);
    if (!created.user) throw new Error("User creation failed");

    await adminClient.from("profiles").upsert({
      id: created.user.id,
      email: created.user.email,
      full_name: data.fullName.trim(),
      status: "active",
    });
    await adminClient.from("user_roles").delete().eq("user_id", created.user.id);
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({ user_id: created.user.id, role: data.role });
    if (roleError) throw new Error(roleError.message);
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .inputValidator((d: RoleRequest) => d)
  .handler(async ({ data }) => {
    assertRole(data.role);
    const adminClient = await getAdminClient(data.accessToken);
    await adminClient.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await adminClient
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .inputValidator((d: PasswordRequest) => d)
  .handler(async ({ data }) => {
    if (data.password.length < 6) throw new Error("Password must be at least 6 characters");
    const adminClient = await getAdminClient(data.accessToken);
    const { error } = await adminClient.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserDisabled = createServerFn({ method: "POST" })
  .inputValidator((d: DisableRequest) => d)
  .handler(async ({ data }) => {
    const adminClient = await getAdminClient(data.accessToken);
    const { error } = await adminClient.auth.admin.updateUserById(data.userId, {
      ban_duration: data.disabled ? "876000h" : "none",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAdminUser = createServerFn({ method: "POST" })
  .inputValidator((d: DeleteRequest) => d)
  .handler(async ({ data }) => {
    const adminClient = await getAdminClient(data.accessToken);
    await adminClient.from("user_roles").delete().eq("user_id", data.userId);
    await adminClient.from("profiles").delete().eq("id", data.userId);
    const { error } = await adminClient.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
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
    return { ok: true };
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
    return { ok: true };
  });
