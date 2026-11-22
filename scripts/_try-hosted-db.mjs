// Probe whether the hosted Supabase Postgres is reachable over its IPv6 address.
import { readFileSync } from "fs";
import dns from "dns";
import postgres from "postgres";

const envFile = readFileSync(new URL("../.env", import.meta.url), "utf8");
const readEnv = (k) => envFile.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim();
const ref = readEnv("VITE_SUPABASE_PROJECT_ID") || "pogmvgqfirovujjwgaqi";
const pwRaw = readEnv("DB_PASSWORD") || "";
const host = `db.${ref}.supabase.co`;

const addrs = await new Promise((resolve) => dns.resolve6(host, (e, a) => resolve(e ? [] : a)));
console.log("AAAA:", addrs);
if (!addrs.length) { console.log("no IPv6 address"); process.exit(1); }

const passwords = [...new Set([pwRaw, decodeURIComponent(pwRaw)].filter(Boolean))];

for (const pwRawTry of passwords) {
  const pw = encodeURIComponent(pwRawTry); // password may contain '@' / ':' — must be URL-encoded
  const url = `postgresql://postgres:${pw}@[${addrs[0]}]:5432/postgres`;
  try {
    const sql = postgres(url, { max: 1, ssl: { rejectUnauthorized: false }, connect_timeout: 10, family: 6 });
    const cols = await sql`select column_name from information_schema.columns where table_schema='public' and table_name='items' order by ordinal_position`;
    console.log("CONNECT OK (IPv6)");
    console.log("items columns:", cols.map((c) => c.column_name).join(", "));
    await sql.end();
    process.exit(0);
  } catch (e) {
    console.log(`FAIL pw(${pw.length} chars): ${e.message}`);
  }
}
process.exit(1);
