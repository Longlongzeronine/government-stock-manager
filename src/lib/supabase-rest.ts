/**
 * Server-side Supabase REST fallback for Cloudflare Workers.
 *
 * Local dev uses direct Postgres (src/lib/local-db.ts). The deployed Worker
 * cannot open a raw TCP connection to localhost:5433 (or reliably to the
 * Supabase pooler), so when the SQL path fails we talk to the hosted project
 * over HTTPS via PostgREST, using the service-role key (bypasses RLS).
 * Secrets are provided as Worker secrets / process.env  never VITE_*.
 */

function restEnv(key: string): string {
  const fromProcess =
    (globalThis as any)?.process?.env?.[key] ??
    (typeof process !== "undefined" ? (process as any).env?.[key] : "");
  return String(fromProcess || "").trim();
}

function workerVar(key: string): string {
  // TanStack Start serializes server-function closures per request — free
  // variables from the module scope are NOT available inside handlers on the
  // Worker. src/server.ts copies Worker `env` bindings into
  // globalThis.__WORKER_ENV__ and process.env, so read them fresh per call.
  const g = globalThis as any;
  const fromWorkerEnv = String(g?.__WORKER_ENV__?.[key] ?? "").trim();
  if (fromWorkerEnv) return fromWorkerEnv;
  const proc = g?.process;
  return String(proc?.env?.[key] ?? "").trim();
}

export function getRestConfig(): { url: string; key: string } | null {
  // NOTE: server-function handlers are serialized per request on the Worker 
  // Worker secrets are NOT reliably visible here via process.env/globalThis.
  // So reads use the public (publishable) key baked in at build time via
  // Writes prefer the service-role key when present (local dev / preview  preview), otherwise fall back to anon
  // (governed by RLS).
  const url =
    (import.meta as any).env?.VITE_SUPABASE_URL ||
    workerVar("SUPABASE_URL") ||
    workerVar("VITE_SUPABASE_URL") ||
    "";
  const serviceKey = workerVar("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey =
    (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
    workerVar("VITE_SUPABASE_PUBLISHABLE_KEY") ||
    "";
  const key = serviceKey || anonKey;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

/** Service-role config for writes (bypasses RLS). Null when key not visible. */
export function getRestWriteConfig(): { url: string; key: string } | null {
  const url =
    (import.meta as any).env?.VITE_SUPABASE_URL ||
    workerVar("SUPABASE_URL") ||
    workerVar("VITE_SUPABASE_URL") ||
    "";
  const key = workerVar("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

function headers(key: string, extra: Record<string, string> = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function throwIfError(res: Response, body: unknown, what: string) {
  if (res.ok) return;
  const msg =
    (body as any)?.message ||
    (body as any)?.error ||
    (typeof body === "string" ? body : res.statusText);
  throw new Error(`${what} failed: ${msg} (HTTP ${res.status})`);
}

export async function sbSelect<T = any>(
  table: string,
  query = "",
): Promise<T[]> {
  const cfg = getRestConfig();
  if (!cfg) throw new Error("Supabase REST config missing");
  const res = await fetch(
    `${cfg.url}/rest/v1/${table}${query ? `?${query}` : ""}`,
    { headers: headers(cfg.key) },
  );
  const body = await res.json().catch(() => null);
  throwIfError(res, body, `select ${table}`);
  return (body ?? []) as T[];
}

export async function sbInsert<T = any>(
  table: string,
  row: Record<string, unknown>,
  writeCfg: { url: string; key: string } | null = null,
): Promise<T> {
  const cfg = writeCfg || getRestConfig();
  if (!cfg) throw new Error("Supabase REST config missing");
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v !== undefined) clean[k] = v;
  }
  const res = await fetch(`${cfg.url}/rest/v1/${table}?select=*`, {
    method: "POST",
    headers: headers(cfg.key, { Prefer: "return=representation" }),
    body: JSON.stringify(clean),
  });
  const body = await res.json().catch(() => null);
  throwIfError(res, body, `insert ${table}`);
  return (Array.isArray(body) ? body[0] : body) as T;
}

export async function sbUpdate<T = any>(
  table: string,
  filter: string,
  patch: Record<string, unknown>,
  writeCfg: { url: string; key: string } | null = null,
): Promise<T[]> {
  const cfg = writeCfg || getRestConfig();
  if (!cfg) throw new Error("Supabase REST config missing");
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row(patch))) {
    if (v !== undefined) clean[k] = v;
  }
  const res = await fetch(`${cfg.url}/rest/v1/${table}?${filter}&select=*`, {
    method: "PATCH",
    headers: headers(cfg.key, { Prefer: "return=representation" }),
    body: JSON.stringify(clean),
  });
  const body = await res.json().catch(() => null);
  throwIfError(res, body, `update ${table}`);
  return (body ?? []) as T[];
}

function row(patch: Record<string, unknown>) {
  return patch;
}

export async function sbDelete(
  table: string,
  filter: string,
  writeCfg: { url: string; key: string } | null = null,
): Promise<void> {
  const cfg = writeCfg || getRestConfig();
  if (!cfg) throw new Error("Supabase REST config missing");
  const res = await fetch(`${cfg.url}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: headers(cfg.key),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`delete ${table} failed: ${body} (HTTP ${res.status})`);
  }
}

export async function sbRpc<T = any>(
  fn: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const cfg = getRestConfig();
  if (!cfg) throw new Error("Supabase REST config missing");
  const res = await fetch(`${cfg.url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: headers(cfg.key),
    body: JSON.stringify(params),
  });
  const body = await res.json().catch(() => null);
  throwIfError(res, body, `rpc ${fn}`);
  return body as T;
}

/** True when running inside Cloudflare Workers (no local Postgres reachable). */
export function isWorkersRuntime(): boolean {
  const proc = (globalThis as any)?.process;
  // Workers with nodejs_compat still expose process, but DATABASE_URL secret
  // is only present when explicitly set  localhost fallback means misconfig.
  const url = String(proc?.env?.DATABASE_URL || "").trim();
  if (!url) return true;
  if (/localhost|127\.0\.0\.1/.test(url)) return true;
  return false;
}
