let _sql: any = null;

export async function getDb() {
  if (_sql) return _sql;
  const url =
    process.env.DATABASE_URL ||
    process.env.VITE_DATABASE_URL ||
    import.meta.env.VITE_DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const postgres = await import("postgres");
  _sql = postgres.default(url, { max: 5, idle_timeout: 10, connect_timeout: 10 });
  return _sql;
}
