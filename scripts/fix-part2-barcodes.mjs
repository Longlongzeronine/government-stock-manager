/**
 * Fix: Part II items (barcode_value IS NULL) were getting UUID barcodes auto-assigned
 * by the `classify_inventory_item_before_write` trigger, so they displayed under Part I
 * and Part II showed ₱0.00.
 *
 * This script:
 *   1. Recreates public.classify_inventory_item() WITHOUT the `barcode_value := new.id::text`
 *      line (keeps inventory_classification + qr_code_value). Prevents future corruption from
 *      importItems / createItem / updateItem.
 *   2. Clears barcode_value -> NULL for the 88 Part II items (identified by full-UUID barcode).
 *   3. Inserts the 2 Part II items missing from the file (MOBILE PHONE, OFFICE CHAIR).
 *   4. Deletes the junk "Webtest" row.
 *   5. Verifies Part I / Part II totals match the workbook (Part II A. TOTAL = ₱306,710.00).
 *
 * Usage: node scripts/fix-part2-barcodes.mjs
 */
import postgres from "postgres";
import { readFileSync } from "fs";
import XLSX from "xlsx";

const FILE_PATH = "C:/Users/Francis/Downloads/APP_CSE_Template_2026.xlsx";

let dbUrl = "postgres://postgres:postgres@localhost:5432/government_stock_manager";
try {
  const env = readFileSync(".env", "utf8");
  const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
  const port = env.match(/^DB_PORT=(.+)$/m)?.[1]?.trim();
  if (url) dbUrl = port ? url.replace(/:\d+\//, `:${port}/`) : url;
} catch {}
console.log(`DB: ${dbUrl.replace(/:[^:@]+@/, ":***@")}`);

const sql = postgres(dbUrl, { max: 1 });
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_COLS = MONTHS.map((m) => `${m}_quantity`);
const UUID_FULL = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";
const UUID_FULL_RE = new RegExp(UUID_FULL);

const toStr = (v) => String(v ?? "").trim();
const toNum = (v) => {
  if (typeof v === "number") return v || 0;
  const s = String(v ?? "").replace(/[^\d.,-]/g, "").replace(/,/g, "");
  return Number(s) || 0;
};

// ── Parse workbook: collect Part II items (name, code, unit, price, qty) ──
const wb = XLSX.readFile(FILE_PATH);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });

let subHdrRow = -1;
const monthIdx = [];
for (let r = 0; r < rows.length; r++) {
  let found = 0;
  for (const c of rows[r]) if (MONTHS.some((m) => toStr(c).toLowerCase().startsWith(m))) found++;
  if (found >= 6) {
    subHdrRow = r;
    for (let c = 0; c < rows[r].length; c++) {
      const cell = toStr(rows[r][c]).toLowerCase();
      const mi = MONTHS.findIndex((m) => cell === m || cell.startsWith(m));
      if (mi >= 0) monthIdx[mi] = c;
    }
    break;
  }
}
if (subHdrRow < 0) throw new Error("no months row");
const subHdr = rows[subHdrRow];
let nameCol = 2, unitCol = 3, priceCol = -1;
for (let c = 0; c < subHdr.length; c++) {
  const cell = toStr(subHdr[c]).toLowerCase();
  if (/item|description|spec/i.test(cell)) nameCol = c;
  if (/^unit/i.test(cell)) unitCol = c;
}
if (subHdrRow > 0) {
  const mainHdr = rows[subHdrRow - 1];
  for (let c = 0; c < mainHdr.length; c++) {
    if (/unit\s*price|cost/i.test(toStr(mainHdr[c]).toLowerCase())) { priceCol = c; break; }
  }
}

let inPart2 = false;
const part2Items = [];
for (let r = subHdrRow + 1; r < rows.length; r++) {
  const row = rows[r];
  if (!row || !row.length) continue;
  const c0 = toStr(row[0]);
  const c1 = toStr(row[1]);
  const c2 = toStr(row[2]);
  const full = row.map(toStr).join(" ");
  if (/^PART\s+II\b/i.test(c0) || (/\bPART\s+II\b/i.test(full) && !c1 && !c2)) { inPart2 = true; continue; }
  if (/^PART\s+I(?!I)\b/i.test(c0) || (/\bPART\s+I(?!I)\b/i.test(full) && !c1 && !c2)) { if (inPart2) break; inPart2 = false; continue; }
  if (!inPart2) continue;
  if (!c1 && !c2 && c0.length > 3 && !/^(A\.|B\.|C\.|D\.|E\.)/i.test(c0)) continue;
  const code = c1;
  let name = toStr(row[nameCol]);
  if (!name && c1 && !/^[0-9-]+$/.test(c1)) name = c1;
  if (!name || !/^8014/.test(code)) continue;
  const monthly = {};
  for (let m = 0; m < 12; m++) monthly[MONTH_COLS[m]] = monthIdx[m] != null ? toNum(row[monthIdx[m]]) : 0;
  part2Items.push({
    name, code, unit: toStr(row[unitCol]) || "pcs",
    price: priceCol >= 0 ? toNum(row[priceCol]) : 0,
    quantity: Object.values(monthly).reduce((s, v) => s + v, 0),
    ...monthly,
  });
}
console.log(`Parsed Part II items from file: ${part2Items.length}`);

// ── 1. Recreate trigger WITHOUT the barcode auto-assign line ──
console.log("\n[1] Recreating classify_inventory_item() without barcode auto-assign…");
await sql`
  CREATE OR REPLACE FUNCTION public.classify_inventory_item()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  BEGIN
    IF new.acquisition_cost >= 50000 THEN
      new.inventory_classification := 'ppe';
      new.semi_expendable_tier := null;
    ELSIF new.acquisition_cost > 0 THEN
      IF new.acquisition_cost <= 5000 THEN
        new.inventory_classification := 'semi_expendable_property';
        new.semi_expendable_tier := 'low_value';
      ELSE
        new.inventory_classification := 'semi_expendable_property';
        new.semi_expendable_tier := 'high_value';
      END IF;
    ELSE
      new.inventory_classification := 'expendable_supply';
      new.semi_expendable_tier := null;
    END IF;

    -- NOTE: barcode_value is intentionally left untouched. The app treats
    -- barcode_value IS NULL as "Part II (other items)". Auto-assigning a UUID
    -- here pushed Part II items into Part I and broke the APP-CSE totals.
    -- (qr_code_value is still derived for the scanner.)

    IF new.qr_code_value is null or new.qr_code_value = '' THEN
      new.qr_code_value := concat('ITEM:', new.id::text);
    END IF;

    RETURN new;
  END;
  $$;
`;

// ── 2. Clear barcode_value on the 88 Part II items (full-UUID barcodes) ──
console.log("[2] Clearing auto-assigned UUID barcodes on Part II items…");
const cleared = await sql`
  UPDATE items SET barcode_value = NULL
  WHERE barcode_value ~ ${UUID_FULL}
  RETURNING id, name
`;
console.log(`   cleared barcode on ${cleared.length} items`);
for (const row of cleared) console.log(`     - ${row.name}`);

// ── 3. Insert missing Part II items (MOBILE PHONE, OFFICE CHAIR) ──
console.log("[3] Inserting missing Part II items…");
const existingNames = new Set((await sql`SELECT name FROM items`).map((i) => i.name.trim().toLowerCase()));
let [maxSort] = await sql`SELECT COALESCE(MAX(sort_order), 0) AS m FROM items`;
let nextSort = Number(maxSort.m) + 1;
const [catRow] = await sql`SELECT id FROM categories WHERE LOWER(name) = 'part ii - other items' OR LOWER(name) = 'other items' ORDER BY LOWER(name) LIMIT 1`;
let catId = catRow?.id || null;
if (!catId) {
  const [c] = await sql`INSERT INTO categories (name) VALUES ('PART II - OTHER ITEMS') RETURNING id`;
  catId = c.id;
  console.log("   created category 'PART II - OTHER ITEMS'");
}
let insertedCount = 0;
for (const item of part2Items) {
  if (existingNames.has(item.name.toLowerCase())) continue;
  await sql`
    INSERT INTO items ${sql({
      name: item.name,
      description: `[${item.code}] ${item.name}`,
      category_id: catId,
      item_type: "supply",
      quantity: item.quantity,
      unit: item.unit,
      reorder_level: 10,
      acquisition_cost: item.price,
      barcode_value: null,
      sort_order: nextSort,
      jan_quantity: item.jan_quantity,
      feb_quantity: item.feb_quantity,
      mar_quantity: item.mar_quantity,
      apr_quantity: item.apr_quantity,
      may_quantity: item.may_quantity,
      jun_quantity: item.jun_quantity,
      jul_quantity: item.jul_quantity,
      aug_quantity: item.aug_quantity,
      sep_quantity: item.sep_quantity,
      oct_quantity: item.oct_quantity,
      nov_quantity: item.nov_quantity,
      dec_quantity: item.dec_quantity,
    })}
  `;
  insertedCount += 1;
  nextSort += 1;
  existingNames.add(item.name.toLowerCase());
  console.log(`   + inserted: ${item.name} (${item.code})`);
}
console.log(`   inserted ${insertedCount} missing Part II items`);

// ── 4. Delete junk Webtest row ──
console.log("[4] Deleting junk Webtest row…");
const deleted = await sql`DELETE FROM items WHERE barcode_value ILIKE '%webtest%' OR name ILIKE 'PART I. AVAILABLE AT PS-DBM%' RETURNING id, name`;
for (const row of deleted) console.log(`   deleted: ${row.name} (${row.id})`);

// ── 5. Verify totals ──
console.log("\n[5] Verification:");
const [p1] = await sql`SELECT COUNT(*)::int c FROM items WHERE barcode_value IS NOT NULL AND barcode_value !~ ${UUID_FULL}`;
const [p2] = await sql`SELECT COUNT(*)::int c FROM items WHERE barcode_value IS NULL`;
const [uuidLeft] = await sql`SELECT COUNT(*)::int c FROM items WHERE barcode_value ~ ${UUID_FULL}`;
const p1c = p1.c;
const p2c = p2.c;
const uuidLeftC = uuidLeft.c;
const items = await sql`SELECT * FROM items`;
let p1Amt = 0, p2Amt = 0;
for (const i of items) {
  const qty = MONTH_COLS.reduce((s, m) => s + Number(i[m] || 0), 0);
  const amt = qty * Number(i.acquisition_cost || 0);
  if (i.barcode_value && !UUID_FULL_RE.test(i.barcode_value)) p1Amt += amt;
  else p2Amt += amt;
}
console.log(`   Part I  items: ${p1c}   TOTAL = ₱${p1Amt.toFixed(2)}`);
console.log(`   Part II items: ${p2c}   TOTAL = ₱${p2Amt.toFixed(2)}  (Excel A. TOTAL: ₱306,710.00)`);
console.log(`   remaining UUID barcodes: ${uuidLeftC}`);
console.log(`   Part II grand (incl. 10% inflation): ₱${(p2Amt * 1.1).toFixed(2)}  (Excel D. GRAND: ₱337,381.00)`);

await sql.end();
console.log("\nDone.");
