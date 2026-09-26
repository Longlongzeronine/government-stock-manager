// Align hosted Supabase public.items with local APP-CSE inventory fields.
import { readFileSync } from "fs";
import dns from "dns";
import net from "net";
import postgres from "postgres";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const getEnv = (key) => env.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim();
const ref = getEnv("VITE_SUPABASE_PROJECT_ID");
const password = getEnv("DB_PASSWORD");
if (!ref || !password) throw new Error("VITE_SUPABASE_PROJECT_ID or DB_PASSWORD missing");

const addresses = await new Promise((resolve) =>
  dns.resolve6(`db.${ref}.supabase.co`, (error, values) =>
    resolve(error ? [] : values),
  ),
);
if (!addresses.length) throw new Error("Hosted database has no reachable IPv6 address");

const sql = postgres({
  database: "postgres", username: "postgres", password,
  ssl: { rejectUnauthorized: false }, connect_timeout: 15, max: 1,
  socket: () =>
    new Promise((resolve, reject) => {
      const socket = net.connect({ host: addresses[0], port: 5432, family: 6 });
      socket.once("connect", () => resolve(socket));
      socket.once("error", reject);
    }),
});

try {
  await sql.unsafe(`
    alter table public.items
      add column if not exists description text,
      add column if not exists item_type text not null default 'supply',
      add column if not exists acquisition_cost numeric(14,2) not null default 0,
      add column if not exists inventory_classification text not null default 'expendable_supply',
      add column if not exists semi_expendable_tier text,
      add column if not exists accountability_status text not null default 'available',
      add column if not exists barcode_value text,
      add column if not exists qr_code_value text,
      add column if not exists jan_quantity numeric(12,2) not null default 0,
      add column if not exists feb_quantity numeric(12,2) not null default 0,
      add column if not exists mar_quantity numeric(12,2) not null default 0,
      add column if not exists apr_quantity numeric(12,2) not null default 0,
      add column if not exists may_quantity numeric(12,2) not null default 0,
      add column if not exists jun_quantity numeric(12,2) not null default 0,
      add column if not exists jul_quantity numeric(12,2) not null default 0,
      add column if not exists aug_quantity numeric(12,2) not null default 0,
      add column if not exists sep_quantity numeric(12,2) not null default 0,
      add column if not exists oct_quantity numeric(12,2) not null default 0,
      add column if not exists nov_quantity numeric(12,2) not null default 0,
      add column if not exists dec_quantity numeric(12,2) not null default 0,
      add column if not exists sort_order integer,
      add column if not exists stock_number text;
    notify pgrst, 'reload schema';
  `);
  const rows = await sql`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'items'
    order by ordinal_position
  `;
  console.log("Hosted items schema updated:", rows.map((row) => row.column_name).join(", "));
} finally {
  await sql.end({ timeout: 5 });
}
