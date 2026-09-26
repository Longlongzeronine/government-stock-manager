#!/usr/bin/env node
/**
 * Automatic one-way sync: local PostgreSQL (pgAdmin4 primary DB) -> Supabase.
 *
 * The local database stays the source of truth; this watcher pushes every
 * insert/update to the hosted Supabase project so the deployed site can read it.
 *
 * Usage
 *   node scripts/sync-watch.mjs                 # keep watching (Ctrl+C to stop)
 *   node scripts/sync-watch.mjs --once          # single pass (for Task Scheduler)
 *   node scripts/sync-watch.mjs --no-full       # skip the initial full upsert pass
 *   node scripts/sync-watch.mjs --prune         # also delete hosted rows removed locally
 *   node scripts/sync-watch.mjs --interval=2000 # poll every 2 seconds
 *   node scripts/sync-watch.mjs --tables=items,categories
 *
 * Progress is stored in the local `public.sync_state` table (table_name,
 * cursor_column, last_cursor, last_primary_key) so restarts continue where the
 * previous run stopped instead of re-pushing everything.
 */

import { readFileSync } from "fs";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

// ── Configuration ─────────────────────────────────────────────────────────────

const envFile = readFileSync(new URL("../.env", import.meta.url), "utf8");
const readEnv = (key) =>
  envFile.match(new RegExp(`^${key}=(.+)$`, "m"))?.[1]?.trim();

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(`--${name}`);
const getOption = (name) => {
  const prefix = `--${name}=`;
  return args
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length)
    .replace(/^"|"$/g, "")
    .trim();
};

// Tables are pushed parents-first so foreign keys always resolve.
// `cursor` is the incremental watermark column; null means "re-push the whole
// (small) table on every full-scan interval".
const TABLES = [
  { name: "categories", cursor: "created_at" },
  { name: "suppliers", cursor: "created_at" },
  { name: "items", cursor: "updated_at" },
  { name: "transactions", cursor: "updated_at" },
  { name: "iar_forms", cursor: "created_at" },
  { name: "iar_items", cursor: "created_at" },
  { name: "ris_forms", cursor: "created_at" },
  { name: "ris_items", cursor: "created_at" },
  { name: "ics_forms", cursor: "created_at" },
  { name: "ics_items", cursor: "created_at" },
  { name: "par_forms", cursor: "created_at" },
  { name: "par_items", cursor: "created_at" },
  { name: "form_number_counters", cursor: null },
  { name: "form_personnel_memory", cursor: null },
  { name: "reports", cursor: "created_at" },
  { name: "audit_logs", cursor: "created_at" },
];

const supabaseUrl = process.env.VITE_SUPABASE_URL || readEnv("VITE_SUPABASE_URL");
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || readEnv("SUPABASE_SERVICE_ROLE_KEY");
if (!supabaseUrl || !serviceKey) {
  throw new Error("VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (.env)");
}

// process.env wins so DATABASE_URL from the shell (or a Worker secret) is used as-is.
// DB_PORT only rewrites the port of the URL that comes from .env.
let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  databaseUrl = readEnv("DATABASE_URL");
  const dbPort = readEnv("DB_PORT");
  if (databaseUrl && dbPort) databaseUrl = databaseUrl.replace(/:\d+\//, `:${dbPort}/`);
}
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required in .env (local PostgreSQL primary database)");
}

const INTERVAL_MS = Number(
  getOption("interval") || readEnv("SYNC_INTERVAL_MS") || process.env.SYNC_INTERVAL_MS || 5000,
);
const FULL_SCAN_MS = Number(
  readEnv("SYNC_FULL_SCAN_MS") || process.env.SYNC_FULL_SCAN_MS || 60000,
);
const BATCH_SIZE = Number(
  readEnv("SYNC_BATCH_SIZE") || process.env.SYNC_BATCH_SIZE || 500,
);
const ONCE = hasFlag("once");
const SKIP_FULL = hasFlag("no-full");
const PRUNE = hasFlag("prune") || String(readEnv("SYNC_PRUNE")) === "true";
const ONLY = getOption("tables")
  ?.split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const targets = ONLY
  ? TABLES.filter((table) => ONLY.includes(table.name))
  : TABLES;

if (ONLY && targets.length === 0) {
  throw new Error(`Unknown table(s): ${ONLY.join(", ")}`);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sql = postgres(databaseUrl, { max: 4, connect_timeout: 15 });

const stamp = () => new Date().toLocaleTimeString("en-GB");
const log = (...parts) => console.log(`[${stamp()}]`, ...parts);

// ── Supabase schema lookup ────────────────────────────────────────────────────

async function loadRemoteColumns() {
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!response.ok) throw new Error(`Supabase schema lookup failed (${response.status})`);
  const spec = await response.json();
  const map = new Map();
  for (const [table, definition] of Object.entries(spec.definitions ?? {})) {
    map.set(table, Object.keys(definition.properties ?? {}));
  }
  return map;
}

function chunk(list, size) {
  const out = [];
  for (let index = 0; index < list.length; index += size) {
    out.push(list.slice(index, index + size));
  }
  return out;
}

// ── Local schema + sync state ─────────────────────────────────────────────────

// postgres.js sends timestamptz parameters with millisecond precision, which
// would make rows that share the truncated millisecond look "new" on every poll.
// The exact watermark therefore lives in a text column; last_cursor keeps the
// rounded value for readability.
const [textCursorColumn] = await sql`
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'sync_state' AND column_name = 'last_cursor_text'
`;
if (!textCursorColumn) {
  await sql`ALTER TABLE public.sync_state ADD COLUMN last_cursor_text text`;
}

const tableMeta = new Map();

async function getTableMeta(table) {
  if (tableMeta.has(table)) return tableMeta.get(table);

  const columns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
    ORDER BY ordinal_position
  `;
  const primaryKey = await sql`
    SELECT a.attname AS column_name
    FROM pg_index i
    JOIN pg_attribute a
      ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
    WHERE i.indrelid = ${`public.${table}`}::regclass AND i.indisprimary
    ORDER BY array_position(i.indkey, a.attnum)
  `;

  const meta = {
    columns: columns.map((row) => row.column_name),
    primaryKey: primaryKey.map((row) => row.column_name),
  };
  tableMeta.set(table, meta);
  return meta;
}

async function readState(table) {
  const [row] = await sql`
    SELECT cursor_column,
           coalesce(last_cursor_text, last_cursor::text) AS cursor_text,
           last_primary_key
    FROM public.sync_state
    WHERE table_name = ${table}
  `;
  return row ?? null;
}

async function writeState(table, cursorColumn, lastCursor, lastPrimaryKey) {
  await sql`
    INSERT INTO public.sync_state
      (table_name, cursor_column, last_cursor, last_cursor_text, last_primary_key, updated_at)
    VALUES (${table}, ${cursorColumn}, ${lastCursor}, ${lastCursor}, ${lastPrimaryKey}, now())
    ON CONFLICT (table_name) DO UPDATE SET
      cursor_column = EXCLUDED.cursor_column,
      last_cursor = EXCLUDED.last_cursor,
      last_cursor_text = EXCLUDED.last_cursor_text,
      last_primary_key = EXCLUDED.last_primary_key,
      updated_at = now()
  `;
}

// ── Push helpers ──────────────────────────────────────────────────────────────

async function pushRows(table, rows, conflictTarget) {
  let written = 0;
  const failures = [];

  for (const batch of chunk(rows, 200)) {
    const { error } = await supabase.from(table).upsert(batch, { onConflict: conflictTarget });
    if (!error) {
      written += batch.length;
      continue;
    }
    // Row-by-row retry so a single bad row does not hide the rest.
    for (const row of batch) {
      const result = await supabase.from(table).upsert(row, { onConflict: conflictTarget });
      if (result.error) failures.push({ row, error: result.error.message });
      else written += 1;
    }
  }

  return { written, failures };
}

async function fetchRemoteKeys(table, keyColumn) {
  const keys = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(keyColumn)}&limit=${pageSize}&offset=${offset}`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (!response.ok) return keys;
    const rows = await response.json();
    keys.push(...rows.map((row) => String(row[keyColumn])));
    if (rows.length < pageSize) break;
  }
  return keys;
}

/** Deletes hosted rows that no longer exist in the local database. */
async function pruneTable(table, keyColumn) {
  if (!keyColumn) return { deleted: 0, skipped: "composite primary key" };

  const remoteKeys = await fetchRemoteKeys(table, keyColumn);
  const localRows = await sql`
    SELECT ${sql(keyColumn)}::text AS key FROM ${sql("public")}.${sql(table)}
  `;
  const localKeys = new Set(localRows.map((row) => row.key));
  const stale = remoteKeys.filter((key) => !localKeys.has(key));
  if (stale.length === 0) return { deleted: 0 };

  for (const batch of chunk(stale, 100)) {
    await supabase.from(table).delete().in(keyColumn, batch);
  }
  return { deleted: stale.length };
}

// ── Sync engine ───────────────────────────────────────────────────────────────

const remoteColumns = await loadRemoteColumns();
const warned = new Set();

function warnOnce(key, message) {
  if (warned.has(key)) return;
  warned.add(key);
  log(message);
}

async function syncTable({ name, cursor }, { full = false } = {}) {
  const remote = remoteColumns.get(name);
  if (!remote) {
    warnOnce(`missing-remote:${name}`, `skip ${name}: table does not exist in Supabase`);
    return { pushed: 0, failed: 0, deleted: 0 };
  }

  const meta = await getTableMeta(name);
  if (meta.columns.length === 0) {
    warnOnce(`missing-local:${name}`, `skip ${name}: table does not exist locally`);
    return { pushed: 0, failed: 0, deleted: 0 };
  }

  const primaryKey = meta.primaryKey;
  const keyColumn = primaryKey[0] ?? "id";
  const conflictTarget = primaryKey.length > 0 ? primaryKey.join(",") : "id";
  const shared = meta.columns.filter((column) => remote.includes(column));
  const missing = meta.columns.filter((column) => !remote.includes(column));
  if (missing.length > 0) {
    warnOnce(
      `columns:${name}`,
      `note ${name}: Supabase is missing ${missing.join(", ")} (values are skipped until the DDL patch is applied)`,
    );
  }

  // The cursor is a local column: it only has to exist in the local database.
  // Supabase may not have it yet (it is then simply not part of the payload).
  const trackCursor = Boolean(cursor) && meta.columns.includes(cursor);
  const state = trackCursor ? await readState(name) : null;
  const storedCursor = state?.cursor_text ?? null;
  const startFull = full || !trackCursor || !storedCursor;

  let lastCursor = startFull ? "1970-01-01T00:00:00.000000Z" : storedCursor;
  let lastKey = startFull ? "" : String(state.last_primary_key ?? "");

  if (trackCursor && startFull && storedCursor) {
    log(`${name}: full pass (resyncing every row)`);
  }

  let pushed = 0;
  let failed = 0;

  for (;;) {
    const rows = trackCursor
      ? await sql`
          SELECT *, ${sql(cursor)}::text AS __cursor FROM ${sql("public")}.${sql(name)}
          WHERE (${sql(cursor)}, ${sql(keyColumn)}::text) > ((${lastCursor}::text)::timestamptz, ${lastKey})
          ORDER BY ${sql(cursor)}, ${sql(keyColumn)}::text
          LIMIT ${BATCH_SIZE}
        `
      : await sql`
          SELECT * FROM ${sql("public")}.${sql(name)}
          WHERE ${sql(keyColumn)}::text > ${lastKey}
          ORDER BY ${sql(keyColumn)}::text
          LIMIT ${BATCH_SIZE}
        `;

    if (rows.length === 0) break;

    const payload = rows.map((row) => {
      const record = {};
      for (const column of shared) record[column] = row[column];
      return record;
    });

    const result = await pushRows(name, payload, conflictTarget);
    pushed += result.written;
    failed += result.failures.length;
    for (const failure of result.failures.slice(0, 3)) {
      warnOnce(`push:${name}:${failure.error}`, `  ! ${name}: ${failure.error}`);
    }

    // Advance the watermark only past rows Supabase actually accepted, so a row
    // rejected by the hosted schema is retried on the next pass instead of being
    // skipped forever.
    if (result.failures.length > 0) {
      const failedRows = new Set(result.failures.map((failure) => failure.row));
      const firstFailure = payload.findIndex((row) => failedRows.has(row));
      const advanceTo = firstFailure - 1;
      if (advanceTo >= 0 && trackCursor) {
        const lastGoodRow = rows[advanceTo];
        lastKey = String(lastGoodRow[keyColumn]);
        lastCursor = lastGoodRow.__cursor;
        await writeState(name, cursor, lastCursor, lastKey);
      }
      break;
    }

    const lastRow = rows[rows.length - 1];
    lastKey = String(lastRow[keyColumn]);
    if (trackCursor) {
      lastCursor = lastRow.__cursor;
      await writeState(name, cursor, lastCursor, lastKey);
    }

    if (rows.length < BATCH_SIZE) break;
  }

  let deleted = 0;
  if (PRUNE && primaryKey.length === 1) {
    const pruned = await pruneTable(name, keyColumn);
    deleted = pruned.deleted ?? 0;
  }

  return { pushed, failed, deleted };
}

// ── Main loop ─────────────────────────────────────────────────────────────────

let lastFullScanAt = 0;
let running = true;

process.on("SIGINT", () => {
  running = false;
  log("stop requested - finishing the current pass");
});

async function runPass({ full = false } = {}) {
  const now = Date.now();
  const scanSmallTables = full || now - lastFullScanAt >= FULL_SCAN_MS;
  let changed = 0;
  let failed = 0;
  let deleted = 0;

  for (const table of targets) {
    if (!table.cursor && !scanSmallTables) continue;
    try {
      const result = await syncTable(table, { full: full && Boolean(table.cursor) });
      if (result.pushed > 0 || result.deleted > 0) {
        log(
          `${table.name}: ${result.pushed} row(s) pushed` +
            (result.deleted > 0 ? `, ${result.deleted} row(s) deleted` : ""),
        );
      }
      changed += result.pushed;
      deleted += result.deleted;
      failed += result.failed;
    } catch (error) {
      failed += 1;
      log(`error ${table.name}: ${error.message}`);
    }
  }

  if (scanSmallTables) lastFullScanAt = now;
  return { changed, failed, deleted };
}

console.log("Local PostgreSQL  ->  Supabase automatic sync");
console.log(`  source  : ${databaseUrl.replace(/:[^:@/]+@/, ":***@")}`);
console.log(`  target  : ${supabaseUrl}`);
console.log(`  tables  : ${targets.length} (poll every ${INTERVAL_MS} ms, batch ${BATCH_SIZE})`);
console.log(
  `  prune   : ${PRUNE ? "ON - hosted rows missing locally are deleted" : "off (deletes are not propagated)"}`,
);
console.log(`  mode    : ${ONCE ? "single pass" : "watch (Ctrl+C to stop)"}`);
console.log("");

if (ONCE) {
  const result = await runPass({ full: !SKIP_FULL });
  log(`single pass finished: ${result.changed} row(s) pushed, ${result.failed} failure(s)`);
  await sql.end();
  process.exit(result.failed > 0 ? 1 : 0);
}

if (SKIP_FULL) {
  log("starting from the cursors stored in public.sync_state");
} else {
  log("initial full pass - pushing every row so Supabase matches the local database");
  await runPass({ full: true });
}

let idleSince = Date.now();
while (running) {
  const result = await runPass();
  if (result.changed > 0 || result.failed > 0) {
    idleSince = Date.now();
  } else if (Date.now() - idleSince > 60000) {
    idleSince = Date.now();
    log("idle - no local changes detected");
  }
  await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
}

await sql.end();
log("sync stopped");
