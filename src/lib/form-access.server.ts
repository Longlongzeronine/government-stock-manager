import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

async function getRequestClient() {
  const authorization = getRequestHeader("authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const workerEnv = (globalThis as typeof globalThis & { __WORKER_ENV__?: Record<string, unknown> }).__WORKER_ENV__;
  const env = (name: string) => String(workerEnv?.[name] ?? process.env[name] ?? "").trim();
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || import.meta.env.VITE_SUPABASE_URL;
  const key = env("SUPABASE_PUBLISHABLE_KEY") || env("VITE_SUPABASE_PUBLISHABLE_KEY") || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Form access service is not configured.");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  return client;
}

export async function assertFormAccessFromRequest(formKey: string, action: string) {
  const client = await getRequestClient();
  if (!client) {
    const { readDeveloperSession } = await import("@/lib/developer-session.server");
    if (await readDeveloperSession()) return;
    throw Object.assign(new Error("Authentication required."), { statusCode: 401 });
  }
  const { data: allowed, error } = await client.rpc("check_and_log_form_access", { _form_key: formKey, _action: action });
  if (error) throw new Error(`Could not check form access: ${error.message}`);
  if (!allowed) throw Object.assign(new Error("Forbidden: your assigned roles do not allow this form action."), { statusCode: 403 });
}

export async function getPermittedFormKeysFromRequest(formKeys: string[], action: string) {
  const client = await getRequestClient();
  if (!client) {
    const { readDeveloperSession } = await import("@/lib/developer-session.server");
    if (await readDeveloperSession()) return formKeys;
    throw Object.assign(new Error("Authentication required."), { statusCode: 401 });
  }
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) throw Object.assign(new Error("Authentication required."), { statusCode: 401 });
  const permitted: string[] = [];
  for (const formKey of formKeys) {
    const { data, error } = await client.rpc("user_can_access_form", { _user_id: user.id, _form_key: formKey });
    if (error) throw new Error(`Could not check form access: ${error.message}`);
    if (data) permitted.push(formKey);
  }
  if (!permitted.length) {
    await assertFormAccessFromRequest(formKeys[0], action);
  }
  for (const formKey of permitted) {
    await client.rpc("check_and_log_form_access", { _form_key: formKey, _action: action });
  }
  return permitted;
}

export async function assertInventoryWriteFromRequest() {
  const client = await getRequestClient();
  if (!client) {
    const { readDeveloperSession } = await import("@/lib/developer-session.server");
    if (await readDeveloperSession()) return;
    throw Object.assign(new Error("Authentication required."), { statusCode: 401 });
  }
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) throw Object.assign(new Error("Authentication required."), { statusCode: 401 });
  const [{ data: staff }, { data: accounting }] = await Promise.all([
    client.rpc("has_role", { _user_id: user.id, _role: "staff" }),
    client.rpc("has_role", { _user_id: user.id, _role: "accounting" }),
  ]);
  if (!staff && !accounting) throw Object.assign(new Error("Forbidden: inventory write access required."), { statusCode: 403 });
}
