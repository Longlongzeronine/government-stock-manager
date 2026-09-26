# Local PostgreSQL -> Supabase automatic sync

## Why https://supplify.stockmanagerph.workers.dev/login shows no data

Two different databases are in play:

| Feature | Database used by the deployed site |
| --- | --- |
| Login, users, roles (`src/contexts/AuthContext.tsx`, `src/routes/index.tsx`) | hosted Supabase |
| Form inserts from the browser (`src/routes/_app/forms.tsx`) | hosted Supabase |
| Inventory, stock, dashboard, RIS/IAR/ICS/PAR history, reports | **local PostgreSQL** |

`src/lib/data.functions.ts` -> `src/lib/local-db.ts` connects to `DATABASE_URL`
(`postgres://...@localhost:5433/government_stock_manager`). That address only exists
on your PC:

* inside the Cloudflare Worker `process.env.DATABASE_URL` is not set (the built
  `dist/server/wrangler.json` has `"vars": {}`),
* `readFileSync(".env")` throws on the Worker runtime,
* so `getDbUrl()` falls back to `postgres://postgres:postgres@localhost:5433/government_stock_manager`
  (still visible in `dist/server/assets/local-db-*.js`) and the TCP connect fails,
* every server function that reads the database fails and the pages render empty
  (`listItems` swallows the error and returns `[]`).

Supabase keeps working because the browser talks to it directly, which is why login
and saved forms work but the inventory list is blank.

`pgAdmin4` and this project talk to the **same local server**: `localhost:5433`,
database `government_stock_manager`. That database stays the source of truth; the
scripts below mirror it into Supabase so the deployed site can read it.

## 1. One-time schema patch in Supabase

The hosted project is missing columns/tables the app writes, so part of the data
cannot be mirrored yet (`items.jan_quantity`, `items.sort_order`, `iar_items.amount`,
`ris_forms.priority`, `form_number_counters`, ...).

Open the Supabase dashboard -> **SQL Editor** -> **New query**, then paste and run
these files one by one, in this order:

1. `supabase/migrations/20260727000000_forms_flow_improvements.sql`
2. `supabase/migrations/20260911000000_approval_workflow.sql`
3. `supabase/migrations/20260921000000_inventory_monthly_columns.sql`

All three are idempotent (`if not exists`, `drop ... if exists`), so they are safe to
re-run. After they are applied, backfill the new columns with a full resync:

```bash
npm run sync:once
```

## 2. Import data (report first, then push)

```bash
npm run sync:report   # read-only: rows per table, skipped columns, rows only in Supabase
npm run sync          # push every table once (upsert on the primary key, nothing deleted)
```

To push a single pgAdmin backup instead: restore it into a scratch database and point
the script at it.

```bash
# 1) restore the custom-format dump into a scratch database (pgAdmin backup file)
psql "postgres://postgres:PASSWORD@localhost:5433/postgres" -c "CREATE DATABASE restore_92126;"
pg_restore -d "postgres://postgres:PASSWORD@localhost:5433/restore_92126" --no-owner --no-privileges "C:\Users\Francis\Downloads\tesda 9-21-26.sql"

# 2) push that database into Supabase
node scripts/sync-to-supabase.mjs "--source=postgres://postgres:PASSWORD@localhost:5433/restore_92126"
```

`tesda 9-21-26.sql` is a `pg_dump --format=custom` archive (binary `PGDMP` header), not
text SQL. Readable/executable SQL was generated from it with:

```bash
pg_restore --no-owner --no-privileges --file "C:\Users\Francis\Downloads\tesda 9-21-26-plain.sql" "C:\Users\Francis\Downloads\tesda 9-21-26.sql"
```

## 3. Automatic sync (watch mode)

```bash
npm run sync:watch
```

The watcher polls the local database (default every 5 s) and upserts changes into
Supabase. It keeps its place in the local `public.sync_state` table
(`table_name`, `cursor_column`, `last_cursor`, `last_primary_key`), so a restart
resumes instead of re-pushing everything.

Useful flags:

| Flag | Effect |
| --- | --- |
| `--once` | single pass, then exit (use this from Task Scheduler) |
| `--no-full` | skip the initial full resync, continue from the stored cursors |
| `--tables=items,categories` | limit the sync to some tables |
| `--prune` | also delete hosted rows that were deleted locally (off by default) |
| `--interval=2000` | poll every 2 seconds |

Settings can also live in `.env` (`SYNC_INTERVAL_MS`, `SYNC_FULL_SCAN_MS`,
`SYNC_BATCH_SIZE`, `SYNC_PRUNE`). The direction is always local -> Supabase
(`SYNC_DIRECTION=LOCAL_TO_SUPABASE`).

## 4. Keep it running on Windows (Task Scheduler)

The sync must run on the PC that hosts local PostgreSQL. Register a task that runs one
pass at logon and then every 5 minutes:

```powershell
$project = "C:\Users\Francis\OneDrive\Desktop\government-stock-manager"
$action  = New-ScheduledTaskAction -Execute "node.exe" -Argument "scripts\sync-watch.mjs --once" -WorkingDirectory $project
$repeat  = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration ([TimeSpan]::MaxValue)
$logon   = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName "StockManagerSupabaseSync" -Action $action -Trigger $repeat,$logon -RunLevel Highest
```

Remove it later with `Unregister-ScheduledTask -TaskName "StockManagerSupabaseSync"`.

## 5. Make the deployed Worker read Supabase

The deployed Worker still points at `localhost`. Give it a reachable database (the
hosted project) so the same code works in production:

```bash
# Supabase dashboard -> Project Settings -> Database -> Connection string (pooler, port 6543)
npx wrangler secret put DATABASE_URL
# paste: postgresql://postgres.pogmvgqfirovujjwgaqi:<DB-PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres
npx wrangler deploy
```

`process.env.DATABASE_URL` then resolves inside the Worker and `data.functions.ts`
runs against the synced Supabase data instead of your PC. Local development keeps
using `.env` (`localhost:5433`) unchanged.

## 6. Import through the SQL editor instead of the API

```bash
node scripts/sync-to-supabase.mjs --only=items,categories,suppliers --emit-sql="C:\Users\Francis\Downloads\supabase-import.sql"
```

That writes a paste-ready file (upserts on the primary key, wrapped in a transaction)
for the Supabase SQL editor.

## Notes

* Local-only tables (`local_users`, `sync_state`, `sync_push_state`) are never pushed.
  `user_roles` is skipped too: its rows point at local `auth.users`, which do not exist
  in the hosted project.
* The watcher adds one bookkeeping column to the local database on first run:
  `public.sync_state.last_cursor_text`. postgres.js sends `timestamptz` parameters with
  millisecond precision, so the exact watermark is kept as text; without it, rows that
  share the truncated millisecond would be pushed again on every poll.
* Columns that Supabase does not have yet are reported once per table and skipped;
  nothing is lost because the local row keeps its value and the value is pushed as soon
  as the DDL patch is applied.
* Rows that exist only in Supabase (for example the old test items) are never deleted
  unless you pass `--prune`.
