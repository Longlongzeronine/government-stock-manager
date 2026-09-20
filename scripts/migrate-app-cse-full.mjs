/**
 * APP-CSE 2026 → PostgreSQL FULL MIGRATION
 * ========================================
 * - Reads the APP-CSE 2026 workbook (all sheets; currently 1: "APP-CSE 2026 FORM")
 * - Parses EVERY item row by its PS-DBM code column (no fragile name filtering)
 * - Maps to the existing `categories` + `items` tables (minimal schema change)
 * - Imports in a single transaction with duplicate protection
 *
 * IMPORTANT (user-approved): the live DB has a `classify_inventory_item()` trigger
 * that auto-assigns a UUID to barcode_value when it is NULL. The app shows Part II
 * items ONLY when barcode_value IS NULL. This script therefore:
 *   - DISABLES that trigger inside the transaction while importing,
 *   - replicates its inventory_classification + qr_code_value logic itself,
 *   - re-ENABLES the trigger right after the transaction.
 *
 * Usage:
 *   node scripts/migrate-app-cse-full.mjs [path-to-xlsx]            # import (skip existing)
 *   node scripts/migrate-app-cse-full.mjs --reset                   # delete this workbook's items first, then import
 *
 * Deliverables: portable SQL file written to scripts/migrate-app-cse-full.sql
 */
import postgres from "postgres";
import { readFileSync, writeFileSync } from "fs";
import XLSX from "xlsx";

const FILE_PATH = process.argv.find((a) => a.endsWith(".xlsx") || a.endsWith(".xls")) || "C:/Users/Francis/Downloads/APP_CSE_Template_2026.xlsx";
const RESET = process.argv.includes("--reset");

// ── 0. Resolve DB URL from .env, honoring DB_PORT (live DB is on 5433) ──
let dbUrl = "postgres://postgres:postgres@localhost:5432/government_stock_manager";
try {
  const env = readFileSync(".env", "utf8");
  const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
  const port = env.match(/^DB_PORT=(.+)$/m)?.[1]?.trim();
  if (url) dbUrl = port ? url.replace(/:\d+\//, `:${port}/`) : url;
} catch { /* no .env – use fallback */ }
console.log(`DB: ${dbUrl.replace(/:[^:@]+@/, ":***@")}`);
console.log(`Mode: ${RESET ? "--reset (clear this workbook's items first)" : "import only (skip existing)"}`);

const wb = XLSX.readFile(FILE_PATH);
console.log(`Workbook sheets: ${wb.SheetNames.join(", ")}`);

// ── 1. Shared parser ──
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_COLS = MONTHS.map((m) => `${m}_quantity`);
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
  let codeCol = 1, nameCol = 2, unitCol = 3, priceCol = -1;
  for (let c = 0; c < subHdr.length; c++) {
    const cell = String(subHdr[c] ?? "").toLowerCase();
    if (/code|barcode/i.test(cell)) codeCol = c;
    if (/item|description|spec/i.test(cell)) nameCol = c;
    if (/^unit/i.test(cell)) unitCol = c;
  }
  if (subHdrRow > 0) {
    const mainHdr = rows[subHdrRow - 1];
    for (let c = 0; c < mainHdr.length; c++) {
      if (/unit\s*price|cost/i.test(String(mainHdr[c] ?? "").toLowerCase())) { priceCol = c; break; }
    }
  }

  const toNum = (v) => (typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^0-9.,-]/g, "").replace(/,/g, "")) || 0);

  let inPart2 = false;
  let curCat = "PART I";
  const items = [];
  const categories = new Map();
  const skipped = [];

  for (let r = subHdrRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row.length) continue;
    const c0 = String(row[0] ?? "").trim();
    const c1 = String(row[1] ?? "").trim();
    const c2 = String(row[2] ?? "").trim();
    const full = row.map((c) => String(c ?? "").trim()).join(" ");

    if (/^PART\s+II\b/i.test(c0) || (/\bPART\s+II\b/i.test(full) && !c1 && !c2)) {
      inPart2 = true; curCat = "PART II - OTHER ITEMS";
      // Part II has no sub-category headers, so give all Part II items one explicit category
      if (!categories.has("PART II - OTHER ITEMS")) categories.set("PART II - OTHER ITEMS", 2);
      continue;
    }
    if (/^PART\s+I(?!I)\b/i.test(c0) || (/\bPART\s+I(?!I)\b/i.test(full) && !c1 && !c2)) {
      if (inPart2) break;
      inPart2 = false; curCat = "PART I"; continue;
    }

    if (!c1 && !c2 && c0.length > 3 && !/^PART\s/i.test(c0) && !/^(A\.|B\.|C\.|D\.|E\.)/i.test(c0)) {
      // Split on newline FIRST so `.*$` in the Note-strip below never needs to cross \r\n,
      // then drop any "(Note: ..." suffix (e.g. "MOTOR VEHICLE (Note: ...)" → "MOTOR VEHICLE").
      const clean = c0.split(/\r?\n/)[0].replace(/\s*\(Note:.*$/i, "").trim();
      if (clean && !/^(we\s+hereby|prepared\s+by|approved\s+by|head\s+of|property\/supply|certified|consistent|date\s+prepared)/i.test(clean)) {
        curCat = clean;
        if (!categories.has(clean)) categories.set(clean, inPart2 ? 2 : 1);
      }
      continue;
    }

    if (c1 && (CODE_RE.test(c1) || UUID_RE.test(c1))) {
      const name = String(row[nameCol] ?? "").trim();
      if (!name || name.length < 2) { skipped.push({ r, reason: "no name", c1 }); continue; }
      const unit = String(row[unitCol] ?? "").trim() || "pcs";
      const price = priceCol >= 0 ? toNum(row[priceCol]) : 0;
      const monthly = {};
      for (let m = 0; m < 12; m++) {
        const ci = monthIdx[m];
        monthly[MONTH_COLS[m]] = ci != null ? toNum(row[ci]) : 0;
      }
      const computedQty = Object.values(monthly).reduce((s, v) => s + v, 0);
      const xlQty = row[24] != null ? toNum(row[24]) : computedQty;
      if (xlQty !== computedQty) skipped.push({ r, reason: `qty mismatch (xl=${xlQty}, computed=${computedQty})`, c1 });

      items.push({
        row: r, name, code: c1, unit, price,
        part: inPart2 ? 2 : 1,
        quantity: computedQty,
        category: curCat || (inPart2 ? "PART II - OTHER ITEMS" : "PS-DBM SUPPLIES"),
        ...monthly,
      });
      continue;
    }

    if (c0 || c1 || c2) skipped.push({ r, reason: "not an item row", c0: c0.slice(0, 40), c1: c1.slice(0, 40), c2: c2.slice(0, 40) });
  }
  return { items, categories, skipped };
}

// ── 2. Parse every worksheet ──
const allItems = [];
const allCategories = new Map();
const allSkipped = [];
for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const { items, categories, skipped } = parseWorkbook(rows);
  console.log(`Sheet "${sheetName}": ${items.length} items, ${categories.size} categories`);
  allItems.push(...items);
  for (const [k, v] of categories) if (!allCategories.has(k)) allCategories.set(k, v);
  allSkipped.push(...skipped.map((s) => ({ ...s, sheet: sheetName })));
}

const part1Items = allItems.filter((i) => i.part === 1);
const part2Items = allItems.filter((i) => i.part === 2);
console.log(`\nTotal items parsed: ${allItems.length} (Part I: ${part1Items.length}, Part II: ${part2Items.length})`);
console.log(`Categories: ${[...allCategories.keys()].join(" | ")}`);

const seenCodes = new Set();
const dupCodes = [];
for (const i of allItems) {
  if (seenCodes.has(i.code)) dupCodes.push(i.code);
  seenCodes.add(i.code);
}
if (dupCodes.length) console.log(`WARNING duplicate codes: ${dupCodes.join(", ")}`);

// ── 2b. Independent cross-check (raw scan of code-bearing rows, per part) ──
function rawCodeCount(rows) {
  let inPart2 = false, p1 = 0, p2 = 0, rawCodes = 0;
  for (let r = 31; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const c0 = String(row[0] ?? "").trim();
    const c1 = String(row[1] ?? "").trim();
    if (/^PART\s+II\b/i.test(c0)) { inPart2 = true; continue; }
    if (/^PART\s+I(?!I)\b/i.test(c0)) { if (inPart2) break; inPart2 = false; continue; }
    if (c1 && (CODE_RE.test(c1) || UUID_RE.test(c1))) { rawCodes++; inPart2 ? p2++ : p1++; }
  }
  return { rawCodes, p1, p2 };
}
const rawTotal = { rawCodes: 0, p1: 0, p2: 0 };
for (const sheetName of wb.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "" });
  const rc = rawCodeCount(rows);
  rawTotal.rawCodes += rc.rawCodes; rawTotal.p1 += rc.p1; rawTotal.p2 += rc.p2;
}
console.log(`\nRaw code-bearing rows: ${rawTotal.rawCodes} (Part I: ${rawTotal.p1}, Part II: ${rawTotal.p2})`);
if (rawTotal.rawCodes !== allItems.length || rawTotal.p1 !== part1Items.length || rawTotal.p2 !== part2Items.length) {
  console.log(`!!! MISMATCH between parsed items (${allItems.length}) and raw scan (${rawTotal.rawCodes}) — investigate!`);
}

// ── 3. Replicate the LIVE DB trigger's classification logic (trigger is disabled during import) ──
// Mirrors the ACTUAL function in the local DB (verified via pg_get_functiondef), which is
// item_type-first (NOT the cost-based variant in the supabase migration file):
//   if item_type = 'supply'          -> expendable_supply
//   elsif acquisition_cost >= 50000  -> ppe
//   else                             -> semi_expendable_property
function classify(itemType, cost) {
  if (itemType === "supply") return { inventory_classification: "expendable_supply", semi_expendable_tier: null };
  if (cost >= 50000) return { inventory_classification: "ppe", semi_expendable_tier: null };
  return { inventory_classification: "semi_expendable_property", semi_expendable_tier: null };
}

// ── 4. Generate portable SQL (with trigger disabled around inserts, matching live import) ──
const esc = (s) => String(s ?? "").replace(/'/g, "''");
let sql = `-- APP-CSE 2026 Migration\n-- Generated: ${new Date().toISOString()}\n-- Items: ${allItems.length} (Part I: ${part1Items.length}, Part II: ${part2Items.length})\n-- Derived/computed columns from the workbook (Q1-Q4 totals, quarterly amounts, Total Amount\n-- col26) are intentionally NOT stored — they are recalculable from unit price x monthly quantities\n-- and the schema has no column for them. Excel's Total Quantity (col24) was cross-checked against\n-- the monthly sum (mismatches logged).\n\n`;
sql += `CREATE EXTENSION IF NOT EXISTS pgcrypto;\n\nBEGIN;\n\n`;
sql += `-- The classify_inventory_item trigger auto-assigns barcode_value when NULL, which would\n`;
sql += `-- break the app's Part II (barcode_value IS NULL) display. Disable it during import.\n`;
sql += `ALTER TABLE items DISABLE TRIGGER classify_inventory_item_before_write;\n\n`;

for (const catName of allCategories.keys()) {
  sql += `INSERT INTO categories (name) SELECT '${esc(catName)}' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '${esc(catName)}');\n`;
}
sql += "\n";
for (let idx = 0; idx < allItems.length; idx++) {
  const i = allItems[idx];
  const sortOrder = idx + 1; // 1-based file order, mirrors scripts/backfill-sort-order.mjs
  const isPart1 = i.part === 1;
  const barcode = isPart1 ? i.code : null;
  const desc = isPart1 ? null : `[${i.code}] ${i.name}`;
  const months = MONTH_COLS.map((m) => i[m]);
  const cl = classify("supply", Number(i.price) || 0);
  const whereClause = barcode
    ? `name = '${esc(i.name)}' AND barcode_value = '${esc(barcode)}'`
    : `name = '${esc(i.name)}' AND barcode_value IS NULL`;
  sql += `WITH ins AS (\n  INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity, sort_order)\n`;
  sql += `    SELECT '${esc(i.name)}', ${desc ? `'${esc(desc)}'` : "NULL"}, (SELECT id FROM categories WHERE name = '${esc(i.category)}'), 'supply', ${Number(i.quantity) || 0}, '${esc(i.unit)}', 10, ${Number(i.price) || 0}, ${barcode ? `'${esc(barcode)}'` : "NULL"}, '${cl.inventory_classification}', ${cl.semi_expendable_tier ? `'${cl.semi_expendable_tier}'` : "NULL"}, ${months.join(", ")}, ${sortOrder}\n`;
  sql += `    WHERE NOT EXISTS (SELECT 1 FROM items WHERE ${whereClause})\n`;
  sql += `    RETURNING id\n)\nUPDATE items SET qr_code_value = 'ITEM:' || items.id::text FROM ins WHERE items.id = ins.id;\n\n`;
}
sql += `ALTER TABLE items ENABLE TRIGGER classify_inventory_item_before_write;\n`;
sql += `COMMIT;\n`;
writeFileSync("scripts/migrate-app-cse-full.sql", sql);
console.log("\nSQL migration written to scripts/migrate-app-cse-full.sql");

// ── 5. Import into PostgreSQL (auto-commit/rollback transaction) ──
const sqlClient = postgres(dbUrl, { max: 5, connect_timeout: 15 });
let imported = 0, skippedDb = 0;
try {
  await sqlClient.begin(async (tx) => {
    // Clean up this workbook's previously imported rows when --reset
    // Part I: delete by unique barcode. Part II: delete by exact unique description `[code] name`
    // (NOT by name alone, which could remove unrelated user-created items with the same name).
    if (RESET) {
      const codes = part1Items.map((i) => i.code);
      const p2Descs = part2Items.map((i) => `[${i.code}] ${i.name}`);
      if (codes.length) await tx.unsafe(`DELETE FROM items WHERE barcode_value = ANY($1::text[])`, [codes]);
      if (p2Descs.length) await tx.unsafe(`DELETE FROM items WHERE description = ANY($1::text[])`, [p2Descs]);
      console.log(`--reset: removed previously imported items (${codes.length} coded + ${part2Items.length} Part II by description)`);
    }

    // Disable the auto-barcode trigger for the whole import (guard: may not exist in some DBs)
    const [hasTrigger] = await tx.unsafe(`SELECT 1 FROM pg_trigger WHERE tgname = 'classify_inventory_item_before_write'`);
    if (hasTrigger) await tx.unsafe(`ALTER TABLE items DISABLE TRIGGER classify_inventory_item_before_write`);

    // Categories (create missing only)
    for (const catName of allCategories.keys()) {
      await tx.unsafe(`INSERT INTO categories (name) SELECT $1 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = $1)`, [catName]);
    }

    for (let idx = 0; idx < allItems.length; idx++) {
      const item = allItems[idx];
      const sortOrder = idx + 1; // 1-based file order
      const isPart1 = item.part === 1;
      const barcode = isPart1 ? item.code : null;
      const desc = isPart1 ? null : `[${item.code}] ${item.name}`;
      // Duplicate guard
      const exists = barcode
        ? await tx.unsafe("SELECT 1 FROM items WHERE barcode_value = $1", [barcode])
        : await tx.unsafe("SELECT 1 FROM items WHERE name = $1 AND barcode_value IS NULL", [item.name]);
      if (exists.length) { skippedDb++; continue; }
      const [cat] = await tx.unsafe("SELECT id FROM categories WHERE name = $1", [item.category]);
      const cl = classify("supply", Number(item.price) || 0);
      const [inserted] = await tx.unsafe(
        `INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier,
          jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity,
          jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity, sort_order)
         VALUES ($1,$2,$3,'supply',$4,$5,10,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
         RETURNING id`,
        [item.name, desc, cat?.id || null, item.quantity, item.unit, item.price, barcode,
          cl.inventory_classification, cl.semi_expendable_tier,
          item.jan_quantity, item.feb_quantity, item.mar_quantity, item.apr_quantity,
          item.may_quantity, item.jun_quantity, item.jul_quantity, item.aug_quantity,
          item.sep_quantity, item.oct_quantity, item.nov_quantity, item.dec_quantity, sortOrder]
      );
      // Replicate the trigger's qr_code_value assignment
      await tx.unsafe(`UPDATE items SET qr_code_value = 'ITEM:' || id::text WHERE id = $1`, [inserted.id]);
      imported++;
    }

    // Re-enable the trigger (runs even on early abort via outer catch? No — only on success)
    if (hasTrigger) await tx.unsafe(`ALTER TABLE items ENABLE TRIGGER classify_inventory_item_before_write`);
  });
} catch (e) {
  console.error("MIGRATION FAILED (transaction rolled back — trigger stays enabled):", e.message);
  process.exit(1);
}

// ── 6. Verification ──
console.log("\n=== IMPORT SUMMARY ===");
console.log(`Imported: ${imported}, Skipped (already existed): ${skippedDb}`);
console.log(`Skipped non-item rows (report only): ${allSkipped.length}`);
console.log(allSkipped.slice(0, 20).map((s) => `  R${s.r}: ${s.reason} — ${s.c1 || s.c0 || s.c2 || ""}`).join("\n"));

const [cats] = await sqlClient`SELECT COUNT(*)::int AS c FROM categories`;
const [total] = await sqlClient`SELECT COUNT(*)::int AS c FROM items`;
const [p1] = await sqlClient`SELECT COUNT(*)::int AS c FROM items WHERE barcode_value IS NOT NULL AND barcode_value NOT LIKE '%-%-%-%'`;
const [p1All] = await sqlClient`SELECT COUNT(*)::int AS c FROM items WHERE barcode_value IS NOT NULL`;
const [p2] = await sqlClient`SELECT COUNT(*)::int AS c FROM items WHERE barcode_value IS NULL`;
console.log("\n=== VERIFICATION (DB) ===");
console.log(`Categories in DB: ${cats.c}`);
console.log(`Total items in DB: ${total.c} (parsed: ${allItems.length})`);
console.log(`Part I (non-UUID barcode): ${p1.c} (parsed: ${part1Items.length}) | with any barcode: ${p1All.c}`);
console.log(`Part II (no barcode): ${p2.c} (parsed: ${part2Items.length})`);

const expectedTotal = rawTotal.rawCodes;
const expectedP1 = rawTotal.p1;
const expectedP2 = rawTotal.p2;
const dbOk = p1.c === expectedP1 && p2.c === expectedP2 && total.c === expectedTotal;
console.log(`\n=== RESULT: ${dbOk ? "ALL DATA IMPORTED AND VERIFIED ✓" : "MISMATCH — CHECK REPORT ABOVE"} ===`);
console.log(`Expected: ${expectedTotal} items (Part I: ${expectedP1}, Part II: ${expectedP2})`);

// Spot checks
const missingNames = [];
for (const name of ["NOTEPAD, stick-on, 50mm x 76mm", "MOBILE PHONE", "OFFICE CHAIR"]) {
  const [found] = await sqlClient`SELECT id FROM items WHERE name = ${name} LIMIT 1`;
  if (!found) missingNames.push(name);
}
const [officeCat] = await sqlClient`SELECT id FROM categories WHERE name = 'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES'`;
const [officeItems] = officeCat
  ? await sqlClient`SELECT COUNT(*)::int AS c FROM items WHERE category_id = ${officeCat.id}`
  : [{ c: 0 }];
console.log("\nSpot checks:");
console.log(`  NOTEPAD / MOBILE PHONE / OFFICE CHAIR present: ${missingNames.length === 0 ? "YES ✓" : "MISSING " + missingNames.join(",")}`);
console.log(`  Office Equipment category exists: ${officeCat ? "YES" : "NO"} (items in it: ${officeItems.c})`);
const [laptop] = await sqlClient`SELECT COUNT(*)::int AS c FROM items WHERE name LIKE 'LAPTOP COMPUTER%'`;
const [desktop] = await sqlClient`SELECT COUNT(*)::int AS c FROM items WHERE name LIKE 'DESKTOP%'`;
console.log(`  LAPTOP COMPUTER items: ${laptop.c}, DESKTOP items: ${desktop.c}`);

const [sumRow] = await sqlClient`SELECT COALESCE(SUM(quantity),0) AS s FROM items`;
console.log(`  Sum of item quantities in DB: ${Number(sumRow.s).toFixed(0)}`);

await sqlClient.end();
console.log("\nMigration complete.");
