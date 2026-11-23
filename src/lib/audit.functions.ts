import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { writeAuditEvent } from "@/lib/audit.server";
import { FORM_ACCESS_KEYS } from "@/lib/form-definitions";

type UserAuditAction = "login" | "logout" | "form_open";

export const recordUserAuditActivity = createServerFn({ method: "POST" })
  .inputValidator((data: { action: UserAuditAction; formKey?: string }) => data)
  .handler(async ({ data }) => {
    const authorization = getRequestHeader("authorization") || "";
    const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!accessToken) throw Object.assign(new Error("Authentication required."), { statusCode: 401 });

    const workerEnv = (globalThis as typeof globalThis & { __WORKER_ENV__?: Record<string, unknown> }).__WORKER_ENV__;
    const env = (name: string) => String(workerEnv?.[name] ?? process.env[name] ?? "").trim();
    const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || import.meta.env.VITE_SUPABASE_URL;
    const key = env("SUPABASE_PUBLISHABLE_KEY") || env("VITE_SUPABASE_PUBLISHABLE_KEY") || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Authentication service is not configured.");

    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data: auth, error } = await client.auth.getUser(accessToken);
    if (error || !auth.user) throw Object.assign(new Error("Authentication required."), { statusCode: 401 });

    if (data.action === "form_open") {
      if (!data.formKey || !FORM_ACCESS_KEYS.includes(data.formKey)) throw new Error("Invalid form key");
      const { data: allowed, error: accessError } = await client.rpc("user_can_access_form", {
        _user_id: auth.user.id,
        _form_key: data.formKey,
      });
      if (accessError) throw new Error(accessError.message);
      if (!allowed) return { ok: false };
    }

    await writeAuditEvent({
      actorId: auth.user.id,
      actorEmail: auth.user.email ?? null,
      action: data.action === "form_open" ? "form_opened" : `user_${data.action}`,
      tableName: data.action === "form_open" ? "forms" : "authentication",
      rowId: data.formKey ?? auth.user.id,
      payload: {
        event: data.action,
        actor_name: auth.user.user_metadata?.full_name ?? auth.user.email?.split("@")[0] ?? null,
        ...(data.formKey ? { form_key: data.formKey } : {}),
      },
    });
    return { ok: true };
  });
