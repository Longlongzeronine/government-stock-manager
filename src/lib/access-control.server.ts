import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

function runtimeValue(name: string) {
  const runtime = globalThis as typeof globalThis & { __WORKER_ENV__?: Record<string, unknown>; process?: { env?: Record<string, string | undefined> } };
  const workerValue = runtime.__WORKER_ENV__?.[name];
  if (typeof workerValue === "string" && workerValue.trim()) return workerValue.trim();
  return runtime.process?.env?.[name]?.trim() ?? "";
}

export async function assertAccessFromRequest(module: string, action = "view") {
  const { readDeveloperSession } = await import("@/lib/developer-session.server");
  if (await readDeveloperSession()) return;
  const authorization = getRequestHeader("authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw Object.assign(new Error("Authentication required."), { statusCode: 401 });
  const url = runtimeValue("SUPABASE_URL") || runtimeValue("VITE_SUPABASE_URL") || import.meta.env.VITE_SUPABASE_URL;
  const key = runtimeValue("SUPABASE_PUBLISHABLE_KEY") || runtimeValue("VITE_SUPABASE_PUBLISHABLE_KEY") || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: allowed, error } = await client.rpc("user_can_access", { _user_id: (await client.auth.getUser()).data.user?.id, _module: module, _action: action });
  if (error) throw new Error(`Could not verify ${module}.${action}: ${error.message}`);
  if (!allowed) throw Object.assign(new Error(`Forbidden: ${module}.${action} permission required.`), { statusCode: 403 });
}
