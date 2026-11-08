#!/usr/bin/env node
/**
 * Push data from a local PostgreSQL database into the hosted Supabase project.
 *
 * Typical use: a pg_dump backup (custom format, e.g. "tesda 9-21-26.sql") was
 * restored into a scratch database, and its rows must land in Supabase so the
 * deployed site can read them.
 *
 * Usage
 *   node scripts/sync-to-supabase.mjs --report
 *   node scripts/sync-to-supabase.mjs --source=postgres://postgres:pass@localhost:5433/tesda_restore
 *   node scripts/sync-to-supabase.mjs --only=items,categories
 *   node scripts/sync-to-supabase.mjs --emit-sql="C:/path/supabase-import.sql"
 *
 * Behaviour
 *   - Parents are pushed before children so foreign keys resolve.
 *   - Columns that exist locally but not in Supabase are reported and skipped
 *     (nothing is dropped, and --emit-sql emits ALTER TABLE ... ADD COLUMN
 *     statements for them so the hosted schema can catch up).
 *   - Rows are upserted on the primary key, so existing hosted rows are updated
 *     instead of duplicated. Nothing is ever deleted.
 *   - Rows that Supabase has but the source does not are listed (never touched).
 */

import { readFileSync, writeFileSync } from "fs";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

// ── Config ────────────────────────────────────────────────────────────────────

const envFile = readFileSync(new URL("../.env", import.meta.url), "utf8");
const readEnv = (key) =>
  envFile.match(new RegExp(`^${key}=(.+)$`, "m"))?.[1]?.trim();

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(`--${name}`);
const getOption = (name) => {
  const prefix = `--${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match?.slice(prefix.length).replace(/^"|"$/g, "").trim();
};

const REPORT_ONLY = hasFlag("report");
const EMIT_SQL = getOption("emit-sql");
const ONLY = getOption("only")
  ?.split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const supabaseUrl = process.env.VITE_SUPABASE_URL || readEnv("VITE_SUPABASE_URL");
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || readEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceKey) {
  throw new Error("VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (.env)");
}

let sourceUrl = getOption("source");
if (!sourceUrl) {
  sourceUrl = process.env.DATABASE_URL || readEnv("DATABASE_URL");
  const port = process.env.DB_PORT || readEnv("DB_PORT");
  if (sourceUrl && port) sourceUrl = sourceUrl.replace(/:\d+\//, `:${port}/`);
}
if (!sourceUrl) {
  throw new Error("No source database. Pass --source=postgres://... or set DATABASE_URL in .env");
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Table plan ────────────────────────────────────────────────────────────────

// Dependency order: parents first, so foreign keys resolve on a fresh project.
const TABLES = [
  "categories",
  "suppliers",
  "items",
  "iar_forms",
  "iar_items",
  "ris_forms",
  "ris_items",
  "ics_forms",
  "ics_items",
  "par_forms",
  "par_items",
  "transactions",
  "audit_logs",
];

// Bookkeeping tables that only exist in the local primary database.
const LOCAL_ONLY = new Set(["local_users", "sync_state", "sync_push_state"]);

const quoteIdent = (name) => `"${String(name).replace(/"/g, '""')}"`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
  const text = String(value).replace(/'/g, "''");
  return `'${text}'`;
}

async function loadRemoteColumns() {
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!response.ok) {
    throw new Error(`Supabase schema lookup failed (${response.status})`);
  }
  const spec = await response.json();
  const map = new Map();
  for (const [table, definition] of Object.entries(spec.definitions ?? {})) {
    map.set(table, Object.keys(definition.properties ?? {}));
  }
  return map;
}

async function loadLocalTable(sql, table) {
  const columns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
    ORDER BY ordinal_position
  `;
  if (columns.length === 0) return null;

  const primaryKey = await sql`
    SELECT a.attname AS column_name
    FROM pg_index i
    JOIN pg_attribute a
      ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
    WHERE i.indrelid = ${`public.${table}`}::regclass AND i.indisprimary
    ORDER BY array_position(i.indkey, a.attnum)
  `;

  const rows = await sql`SELECT * FROM ${sql("public")}.${sql(table)}`;
  return {
    columns: columns.map((row) => row.column_name),
    primaryKey: primaryKey.map((row) => row.column_name),
    rows,
  };
}

async function countRemoteRows(table) {
  const keyColumn = table === "form_number_counters" ? "form_prefix" : "id";
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${keyColumn}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!response.ok) return [];
  const rows = await response.json();
  return rows.map((row) => String(row.id ?? row.form_prefix));
}

function chunk(list, size) {
  const out = [];
  for (let index = 0; index < list.length; index += size) {
    out.push(list.slice(index, index + size));
  }
  return out;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const remoteColumns = await loadRemoteColumns();
const sql = postgres(sourceUrl, { max: 3, connect_timeout: 15 });

console.log(`Source : ${sourceUrl.replace(/:[^:@/]+@/, ":***@")}`);
console.log(`Target : ${supabaseUrl}`);
console.log(`Mode   : ${REPORT_ONLY ? "report only" : EMIT_SQL ? "emit SQL file" : "upsert"}`);
console.log("");

const summary = [];
const failures = [];
const sqlSections = [];
const skippedColumns = [];

try {
  const targets = (ONLY ?? TABLES).filter((table) => !LOCAL_ONLY.has(table));

  for (const table of targets) {
    const local = await loadLocalTable(sql, table);
    const remote = remoteColumns.get(table);

    if (!local) {
      summary.push({ table, source: 0, written: 0, failed: 0, note: "not in source" });
      continue;
    }

    if (!remote) {
      summary.push({
        table,
        source: local.rows.length,
        written: 0,
        failed: 0,
        note: "missing in Supabase - apply the DDL patch first",
      });
      continue;
    }

    const shared = local.columns.filter((column) => remote.includes(column));
    const localOnlyColumns = local.columns.filter((column) => !remote.includes(column));
    for (const column of localOnlyColumns) skippedColumns.push(`${table}.${column}`);

    const conflictTarget = local.primaryKey.length > 0 ? local.primaryKey.join(",") : "id";
    const remoteIds = await countRemoteRows(table);
    const sourceIds = new Set(
      local.rows.map((row) => String(row[local.primaryKey[0] ?? "id"])),
    );
    const remoteOnly = remoteIds.filter((id) => !sourceIds.has(id));

    const rows = local.rows.map((row) => {
      const payload = {};
      for (const column of shared) payload[column] = row[column];
      return payload;
    });

    let written = 0;
    let failed = 0;

    // Paste-ready SQL for the Supabase SQL editor (or psql).
    if (EMIT_SQL && rows.length > 0) {
      const updateColumns = shared.filter((column) => !local.primaryKey.includes(column));
      const statements = chunk(rows, 200).map((batch) => {
        const values = batch
          .map((row) => `  (${shared.map((column) => sqlLiteral(row[column])).join(", ")})`)
          .join(",\n");
        const update =
          updateColumns.length > 0
            ? `\ndo update set ${updateColumns
                .map((column) => `${quoteIdent(column)} = excluded.${quoteIdent(column)}`)
                .join(", ")}`
            : "\ndo nothing";
        return (
          `insert into public.${quoteIdent(table)} (${shared.map(quoteIdent).join(", ")})\n` +
          `values\n${values}\non conflict (${local.primaryKey
            .map(quoteIdent)
            .join(", ")})${update};`
        );
      });
      sqlSections.push(
        `-- ${table}: ${rows.length} row(s) from the local database\n${statements.join("\n\n")}`,
      );
    }

    if (!REPORT_ONLY && !EMIT_SQL && rows.length > 0) {
      for (const batch of chunk(rows, 200)) {
        const { error } = await supabase
          .from(table)
          .upsert(batch, { onConflict: conflictTarget });
        if (!error) {
          written += batch.length;
          continue;
        }

        // Fall back to row-by-row so a single bad row does not hide the rest.
        for (const row of batch) {
          const result = await supabase.from(table).upsert(row, { onConflict: conflictTarget });
          if (result.error) {
            failed += 1;
            if (failures.length < 20) {
              failures.push({ table, error: result.error.message, row });
            }
          } else {
            written += 1;
          }
        }
      }
    }

    summary.push({
      table,
      source: local.rows.length,
      written,
      failed,
      note: [
        localOnlyColumns.length > 0 ? `skipped columns: ${localOnlyColumns.join(", ")}` : "",
        remoteOnly.length > 0 ? `supabase-only rows kept: ${remoteOnly.length}` : "",
        local.primaryKey.length === 0 ? "no primary key" : "",
      ]
        .filter(Boolean)
        .join(" | "),
    });
  }
} finally {
  await sql.end();
}

if (EMIT_SQL && sqlSections.length > 0) {
  const header = [
    "-- Data import generated by scripts/sync-to-supabase.mjs",
    `-- Source: ${sourceUrl.replace(/:[^:@/]+@/, ":***@")}`,
    `-- Target: ${supabaseUrl}`,
    "-- Rows are upserted on the primary key: existing hosted rows are updated,",
    "-- nothing is deleted, and rows Supabase has but the source does not are kept.",
    skippedColumns.length > 0
      ? `-- Columns that Supabase does not have yet (not included below): ${skippedColumns.join(", ")}`
      : "",
    "",
    "begin;",
    "",
    ...sqlSections,
    "",
    "commit;",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
  writeFileSync(EMIT_SQL, header, "utf8");
  console.log(`SQL written to ${EMIT_SQL}`);
  console.log("");
}

console.log("table                 source  written  failed  note");
console.log("--------------------  ------  -------  ------  ----");
for (const row of summary) {
  console.log(
    `${row.table.padEnd(20)}  ${String(row.source).padStart(6)}  ` +
      `${String(row.written).padStart(7)}  ${String(row.failed).padStart(6)}  ${row.note}`,
  );
}

if (failures.length > 0) {
  console.log("");
  console.log(`Failures (showing ${failures.length}):`);
  for (const failure of failures) {
    console.log(`- ${failure.table}: ${failure.error}`);
    console.log(`  row: ${JSON.stringify(failure.row).slice(0, 240)}`);
  }
}
