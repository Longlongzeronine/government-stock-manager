const bundledMigrationModules = import.meta.glob("../../supabase/migrations/*.sql", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

type MigrationFile = { filename: string; version: string; name: string; sql: string };
let migrationSql: any;

function migrationDatabaseUrl() {
  const runtime = globalThis as typeof globalThis & { __WORKER_ENV__?: Record<string, unknown>; process?: { env?: Record<string, string | undefined> } };
  for (const name of ["MIGRATION_DATABASE_URL", "SUPABASE_DB_URL", "DATABASE_URL"]) {
    const value = runtime.__WORKER_ENV__?.[name] ?? runtime.process?.env?.[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function migrationFiles(): MigrationFile[] {
  return Object.entries(bundledMigrationModules).map(([path, sql]) => {
    const filename = path.split("/").at(-1) ?? path;
    const stem = filename.replace(/\.sql$/i, "");
    const match = stem.match(/^(\d+)_?(.*)$/);
    return { filename, version: match?.[1] ?? stem, name: match?.[2] || stem, sql };
  }).sort((a, b) => a.filename.localeCompare(b.filename));
}

function databaseLabel() {
  const url = migrationDatabaseUrl();
  if (!url) return { connection: "not configured", database: "Unavailable" };
  try {
    const parsed = new URL(url);
    return { connection: parsed.protocol.replace(":", ""), database: parsed.pathname.replace(/^\//, "") || "postgres" };
  } catch {
    return { connection: "configured", database: "PostgreSQL" };
  }
}

async function migrationConnection() {
  const databaseUrl = migrationDatabaseUrl();
  if (!databaseUrl) throw new Error("MIGRATION_DATABASE_URL, SUPABASE_DB_URL, or DATABASE_URL must be configured on the server.");
  if (!migrationSql) {
    const { default: postgres } = await import("postgres");
    const hosted = /supabase\.(co|net)|pooler\.supabase/i.test(databaseUrl);
    migrationSql = postgres(databaseUrl, { max: 1, connect_timeout: 20, ...(hosted ? { ssl: "require" } : {}) });
  }
  const sql = migrationSql;
  await sql.unsafe(`create table if not exists public.app_migration_files (
    filename text primary key,
    version text not null,
    applied_at timestamptz not null default now()
  )`);
  return sql;
}

async function migrationState() {
  const sql = await migrationConnection();
  const tracked = await sql.unsafe("select filename, version, applied_at from public.app_migration_files");
  let supabaseVersions: Array<{ version: string }> = [];
  try { supabaseVersions = await sql.unsafe("select version from supabase_migrations.schema_migrations"); } catch { /* Optional CLI history table. */ }
  return {
    sql,
    tracked: new Map(tracked.map((row: any) => [String(row.filename), row])),
    versions: new Set(supabaseVersions.map((row) => String(row.version))),
  };
}

export async function listMigrationStatusHandler() {
  const files = migrationFiles();
  const label = databaseLabel();
  try {
    const { tracked, versions } = await migrationState();
    const rows = files.map((file) => {
      const trackedRow: any = tracked.get(file.filename);
      const executed = Boolean(trackedRow) || versions.has(file.version);
      return {
        filename: file.filename,
        version: file.version,
        name: file.name.replaceAll("_", " "),
        date: file.version.length >= 8 ? `${file.version.slice(0, 4)}-${file.version.slice(4, 6)}-${file.version.slice(6, 8)}` : "—",
        status: executed ? "executed" : "pending",
        appliedAt: trackedRow?.applied_at ?? null,
      };
    });
    return { ...label, ready: true, error: null, total: rows.length, pending: rows.filter((row) => row.status === "pending").length, executed: rows.filter((row) => row.status === "executed").length, latestBatch: rows.filter((row) => row.status === "executed").at(-1)?.version ?? "—", files: rows };
  } catch (error: any) {
    return { ...label, ready: false, error: error?.message ?? "Database connection failed", total: files.length, pending: files.length, executed: 0, latestBatch: "—", files: files.map((file) => ({ filename: file.filename, version: file.version, name: file.name.replaceAll("_", " "), date: file.version.slice(0, 8), status: "pending", appliedAt: null })) };
  }
}

export async function runPendingMigrationsHandler(confirmation: string) {
  if (confirmation.trim().toUpperCase() !== "RUN") throw new Error("Type RUN to confirm pending migrations.");
  const { sql, tracked, versions } = await migrationState();
  const pending = migrationFiles().filter((file) => !tracked.has(file.filename) && !versions.has(file.version));
  const completed: string[] = [];
  for (const file of pending) {
    try {
      await sql.begin(async (transaction: any) => {
        await transaction.unsafe(file.sql);
        await transaction.unsafe("insert into public.app_migration_files(filename, version) values ($1, $2) on conflict (filename) do nothing", [file.filename, file.version]);
      });
      completed.push(file.filename);
    } catch (error: any) {
      throw new Error(`Migration ${file.filename} failed after ${completed.length} completed: ${error?.message ?? error}`);
    }
  }
  return { ok: true, ran: completed.length, files: completed };
}
