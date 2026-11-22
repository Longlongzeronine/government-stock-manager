import { createServerFn } from "@tanstack/react-start";
import { canManageTarget, isAccessSchemaUnavailable, normalizeAccess, type AccessMatrix } from "@/lib/access-control";

type AccessRequest = { accessToken: string };
type SaveAccessRequest = AccessRequest & {
  userId: string;
  access: AccessMatrix;
  reason?: string;
};

function runtimeValue(name: string) {
  const runtime = globalThis as typeof globalThis & {
    __WORKER_ENV__?: Record<string, unknown>;
    process?: { env?: Record<string, string | undefined> };
  };
  const workerValue = runtime.__WORKER_ENV__?.[name];
  if (typeof workerValue === "string" && workerValue.trim()) return workerValue.trim();
  return runtime.process?.env?.[name]?.trim() ?? "";
}

async function getAccessClients(accessToken: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const url = runtimeValue("SUPABASE_URL") || runtimeValue("VITE_SUPABASE_URL") || import.meta.env.VITE_SUPABASE_URL;
  const anonKey = runtimeValue("SUPABASE_PUBLISHABLE_KEY") || runtimeValue("VITE_SUPABASE_PUBLISHABLE_KEY") || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = runtimeValue("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) throw new Error("User access service is not configured.");

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const serviceClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await userClient.auth.getUser(accessToken);
  if (authError || !auth.user) throw Object.assign(new Error("Authentication required."), { statusCode: 401 });
  const { data: allowed, error: accessError } = await serviceClient.rpc("user_can_access", {
    _user_id: auth.user.id,
    _module: "user_access",
    _action: "manage",
  });
  let hasAccess = Boolean(allowed);
  if (accessError) {
    if (!isAccessSchemaUnavailable(accessError)) throw new Error(`Could not verify user access permission: ${accessError.message}`);
    const { data: legacyRoles, error: rolesError } = await serviceClient.from("user_roles").select("role").eq("user_id", auth.user.id);
    if (rolesError) throw new Error("Could not verify bootstrap account permissions.");
    hasAccess = (legacyRoles ?? []).some((row: any) => row.role === "admin" || row.role === "super_admin");
  }
  if (!hasAccess) throw Object.assign(new Error("User access administrator permission required."), { statusCode: 403 });
  return { actor: auth.user, userClient, serviceClient };
}

export const listUserAccess = createServerFn({ method: "POST" })
  .inputValidator((data: AccessRequest) => data)
  .handler(async ({ data }) => {
    const { actor, serviceClient } = await getAccessClients(data.accessToken);
    const [profilesResult, accessResult, auditResult, rolesResult, userRolesResult] = await Promise.all([
      serviceClient.from("profiles").select("id,full_name,email,status,disabled,employment_status,created_at").order("full_name").limit(5000),
      serviceClient.from("user_access").select("user_id,access,assigned_by_user_id,assigned_at,created_at,updated_at").limit(5000),
      serviceClient.from("user_access_audit_logs").select("target_user_id,administrator_user_id,reason,created_at").order("created_at", { ascending: false }).limit(5000),
      serviceClient.from("roles").select("code,label,is_system_admin").order("label"),
      serviceClient.from("user_roles").select("user_id,role").limit(10000),
    ]);
    const directoryError = profilesResult.error || rolesResult.error || userRolesResult.error;
    if (directoryError) throw new Error(directoryError.message);
    const accessSchemaUnavailable = [accessResult.error, auditResult.error].some(isAccessSchemaUnavailable);
    const unexpectedError = [accessResult.error, auditResult.error].find((error) => error && !isAccessSchemaUnavailable(error));
    if (unexpectedError) throw new Error(unexpectedError.message);

    const profiles = profilesResult.data ?? [];
    const profileById = new Map(profiles.map((profile: any) => [profile.id, profile]));
    const accessById = new Map((accessResult.data ?? []).map((entry: any) => [entry.user_id, entry]));
    const rolesByUserId = new Map<string, string[]>();
    for (const assignment of userRolesResult.data ?? []) {
      const assigned = rolesByUserId.get(assignment.user_id) ?? [];
      assigned.push(assignment.role);
      rolesByUserId.set(assignment.user_id, assigned);
    }
    const latestAudit = new Map<string, any>();
    for (const entry of auditResult.data ?? []) if (!latestAudit.has(entry.target_user_id)) latestAudit.set(entry.target_user_id, entry);

    return {
      actorUserId: actor.id,
      schemaReady: !accessSchemaUnavailable,
      roles: rolesResult.data ?? [],
      users: profiles.map((profile: any) => {
        const entry: any = accessById.get(profile.id);
        const audit = latestAudit.get(profile.id);
        const assigner: any = entry?.assigned_by_user_id ? profileById.get(entry.assigned_by_user_id) : null;
        return {
          ...profile,
          roles: rolesByUserId.get(profile.id) ?? [],
          hasAccessRecord: Boolean(entry),
          access: entry ? normalizeAccess(entry.access) : null,
          assignedAt: entry?.assigned_at ?? null,
          assignedBy: assigner ? { id: assigner.id, name: assigner.full_name, email: assigner.email } : null,
          lastReason: audit?.reason ?? null,
          lastChangedAt: audit?.created_at ?? entry?.assigned_at ?? null,
        };
      }),
    };
  });

export const saveUserAccess = createServerFn({ method: "POST" })
  .inputValidator((data: SaveAccessRequest) => data)
  .handler(async ({ data }) => {
    const { actor, userClient } = await getAccessClients(data.accessToken);
    if (!canManageTarget(actor.id, data.userId)) {
      throw Object.assign(new Error("You cannot change your own access from this screen."), { statusCode: 403 });
    }
    const normalized = normalizeAccess(data.access);
    const { data: saved, error } = await userClient.rpc("admin_save_user_access", {
      _target_user_id: data.userId,
      _access: normalized,
      _reason: data.reason?.trim() || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true, access: normalizeAccess(saved?.access ?? normalized), assignedAt: saved?.assigned_at ?? new Date().toISOString() };
  });
