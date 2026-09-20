/**
 * Backfill items.sort_order from the APP-CSE 2026 XLSX row order.
 * ==============================================================
 * The website previously sorted items alphabetically (ORDER BY i.name ASC), but the
 * user wants the display to follow the exact order of the APP-CSE template file.
 *
 * This script:
 *   - parses the workbook with the SAME logic as scripts/migrate-app-cse-full.mjs,
 *   - assigns sort_order = the item's 1-based index in file row order,
 *   - updates matching rows: Part I matched by barcode_value, Part II by description.
 *
 * Usage:
 *   node scripts/backfill-sort-order.mjs [path-to-xlsx]
 */
import postgres from "postgres";
import { readFileSync } from "fs";
import XLSX from "xlsx";

const FILE_PATH = process.argv.find((a) => a.endsWith(".xlsx") || a.endsWith(".xls")) || "C:/Users/Francis/Downloads/APP_CSE_Template_2026.xlsx";

// Resolve DB URL from .env, honoring DB_PORT (live DB is on 5433)
let dbUrl = "postgres://postgres:postgres@localhost:5433/government_stock_manager";
try {
  const env = readFileSync(".env", "utf8");
  const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
  const port = env.match(/^DB_PORT=(.+)$/m)?.[1]?.trim();
  if (url) dbUrl = port ? url.replace(/:\d+\//, `:${port}/`) : url;
} catch { /* no .env */ }
console.log(`DB: ${dbUrl.replace(/:[^:@]+@/, ":***@")}`);

const wb = XLSX.readFile(FILE_PATH);

// ── Same parser as scripts/migrate-app-cse-full.mjs ──
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const CODE_RE = /^\d{5,8}-[A-Z0-9-]{2,10}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

function parseWorkbook(rows) {
  let subHdrRow = -1;
  const monthIdx = [];
  for (let r = 0; r < rows.length; r++) {
    let found = 0;
    for (const c of rows[r]) if (MONTHS.some((m) => String(c ?? "").trim().toLowerCase().startsWith(m))) found++;
    if (found >= 6) {
      subHdrRow = r;
      for (let c = 0; c < rows[r].length; c++) {
        const cell = String(rows[r][c] ?? "").toLowerCase().trim();
        const mi = MONTHS.findIndex((m) => cell === m || cell.startsWith(m));
        if (mi >= 0) monthIdx[mi] = c;
      }
      break;
    }
  }
  if (subHdrRow < 0) throw new Error("Could not find month columns in workbook");
  const subHdr = rows[subHdrRow];
  let nameCol = 2;
  for (let c = 0; c < subHdr.length; c++) {
    const cell = String(subHdr[c] ?? "").toLowerCase();
    if (/item|description|spec/i.test(cell)) nameCol = c;
  }
  const items = [];
  let inPart2 = false;
  for (let r = subHdrRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row.length) continue;
    const c0 = String(row[0] ?? "").trim();
    const c1 = String(row[1] ?? "").trim();
    const c2 = String(row[2] ?? "").trim();
    const full = row.map((c) => String(c ?? "").trim()).join(" ");
    if (/^PART\s+II\b/i.test(c0) || (/\bPART\s+II\b/i.test(full) && !c1 && !c2)) { inPart2 = true; continue; }
    // NOTE: keep the `full`-row fallback in sync with scripts/migrate-app-cse-full.mjs so
    // the two scripts can never disagree about PART I marker rows.
    if (/^PART\s+I(?!I)\b/i.test(c0) || (/\bPART\s+I(?!I)\b/i.test(full) && !c1 && !c2)) { if (inPart2) break; inPart2 = false; continue; }
    if (c1 && (CODE_RE.test(c1) || UUID_RE.test(c1))) {
      const name = String(row[nameCol] ?? "").trim();
      if (!name || name.length < 2) continue;
      items.push({ name, code: c1, part: inPart2 ? 2 : 1 });
    }
  }
  return items;
}

const allItems = [];
for (const sheetName of wb.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "" });
  allItems.push(...parseWorkbook(rows));
}
console.log(`Parsed ${allItems.length} items in file order (Part I: ${allItems.filter((i) => i.part === 1).length}, Part II: ${allItems.filter((i) => i.part === 2).length})`);

const sql = postgres(dbUrl, { max: 5, connect_timeout: 15 });
try {
  await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_items_sort_order ON items(sort_order)`;

  let updated = 0;
  let alreadySet = 0;
  let missing = 0;
  for (let idx = 0; idx < allItems.length; idx++) {
    const item = allItems[idx];
    const sortOrder = idx + 1; // 1-based file order (deterministic → re-runs are idempotent)
    let res;
    if (item.part === 1) {
      res = await sql`UPDATE items SET sort_order = ${sortOrder} WHERE barcode_value = ${item.code} AND (sort_order IS NULL OR sort_order <> ${sortOrder})`;
    } else {
      res = await sql`UPDATE items SET sort_order = ${sortOrder} WHERE description = ${`[${item.code}] ${item.name}`} AND (sort_order IS NULL OR sort_order <> ${sortOrder})`;
    }
    if (res.count > 0) updated += 1;
    else {
      // Already set correctly, or fall back to name match for Part II in case description differs
      const [existing] = item.part === 1
        ? await sql`SELECT sort_order FROM items WHERE barcode_value = ${item.code}`
        : await sql`SELECT sort_order FROM items WHERE description = ${`[${item.code}] ${item.name}`}`;
      if (existing?.sort_order === sortOrder) { alreadySet += 1; continue; }
      if (item.part === 2) {
        const res2 = await sql`UPDATE items SET sort_order = ${sortOrder} WHERE name = ${item.name} AND barcode_value IS NULL AND (sort_order IS NULL OR sort_order <> ${sortOrder})`;
        if (res2.count > 0) { updated += 1; continue; }
        // Also treat a name-matched, already-correct row as alreadySet (description may differ)
        const [existing2] = await sql`SELECT sort_order FROM items WHERE name = ${item.name} AND barcode_value IS NULL`;
        if (existing2?.sort_order === sortOrder) { alreadySet += 1; continue; }
        missing += 1; console.log(`  no match: ${item.name} (${item.code})`);
      } else { missing += 1; console.log(`  no match: ${item.name} (${item.code})`); }
    }
  }

  const [total] = await sql`SELECT COUNT(*)::int AS c FROM items`;
  const [withOrder] = await sql`SELECT COUNT(*)::int AS c FROM items WHERE sort_order IS NOT NULL`;
  const [withoutOrder] = await sql`SELECT COUNT(*)::int AS c FROM items WHERE sort_order IS NULL`;
  console.log(`\n=== BACKFILL RESULT ===`);
  console.log(`Updated: ${updated}, already correct: ${alreadySet}, no match: ${missing}`);
  console.log(`Total items: ${total.c} | with sort_order: ${withOrder.c} | without: ${withoutOrder.c}`);
  const [dup] = await sql`SELECT COUNT(*)::int AS c FROM (SELECT sort_order FROM items WHERE sort_order IS NOT NULL GROUP BY sort_order HAVING COUNT(*) > 1) d`;
  console.log(`Duplicate sort_order values: ${dup.c}`);

  if (total.c === withOrder.c && missing === 0 && dup.c === 0) {
    console.log(`\n✓ ALL ${total.c} items now have unique sort_order matching the XLSX file order.`);
  } else {
    console.log(`\n! Review needed (items without sort_order: ${withoutOrder.c}).`);
  }
} catch (e) {
  console.error("ERROR:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
