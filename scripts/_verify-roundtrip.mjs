// Round-trip test: exportAppCseXlsx -> detectAppCseLayout -> parseAppCseRows
// Run: node --experimental-strip-types scripts/_verify-roundtrip.mjs
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { exportAppCseXlsx } from "../src/lib/export.ts";
import { detectAppCseLayout, parseAppCseRows, validateAppCseLayout, MONTH_QUANTITY_COLUMNS } from "../src/lib/appcse-sheet.ts";

let failures = 0;
const check = (label, condition, detail = "") => {
  if (condition) console.log(`  PASS  ${label}`);
  else { failures += 1; console.log(`  FAIL  ${label} ${detail}`); }
};

const monthly = (values) => Object.fromEntries(MONTH_QUANTITY_COLUMNS.map((column, i) => [column, values[i] ?? 0]));

// Mix of Part I (barcode) and Part II (no barcode) items, with fractional prices.
const items = [
  {
    id: "a1", name: "ALCOHOL, Ethyl, 500 mL", barcode_value: "12191601-AL-E04", unit: "bottle",
    acquisition_cost: 55.62, category: { name: "ALCOHOL OR ACETONE BASED ANTISEPTICS" },
    ...monthly([4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 4, 4]),
  },
  {
    id: "a2", name: "CLEARBOOK, A4 size", barcode_value: "60121413-CB-P01", unit: "pieces",
    acquisition_cost: 35.52, category: { name: "ARTS AND CRAFTS EQUIPMENT" },
    ...monthly([5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0]),
  },
  {
    id: "b1", name: "[CUSTOM-001] LAMINATING FILM, A4", barcode_value: null, unit: "pack",
    acquisition_cost: 350.5, category: { name: "OTHER OFFICE CONSUMABLES" },
    ...monthly([0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 0, 1]),
  },
  {
    id: "b2", name: "[CUSTOM-002] WHITEBOARD MARKER REFILL", barcode_value: null, unit: "box",
    acquisition_cost: 89.99, category: { name: "OTHER OFFICE CONSUMABLES" },
    ...monthly([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
  },
];

const fields = {
  preparedDate: "8-2-2026", department: "DEPARTMENT OF ENERGY", region: "Region XI",
  organizationType: "NGA", agencyCode: "1234", address: "ENERGY PARK", contactPerson: "ENGR. JENY E. BUSCANO",
  email: "jebuscano@doe.gov.ph", telephone: "0918-000-0000", preparedBy: "ENGR. JENY E. BUSCANO",
  certifiedBy: "GINA MAY O. CALIMBAS", approvedBy: "ENGR. ALBERT N. MANINGO",
};

const outDir = path.join(process.cwd(), ".tmp-roundtrip");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const outBase = path.join(outDir, "APP-CSE-2026-FORM-roundtrip");

exportAppCseXlsx(items, {}, fields, outBase);
const exported = `${outBase}.xlsx`;
console.log(`Exported: ${exported} (${fs.statSync(exported).size} bytes)\n`);

// ── Re-import the exported workbook exactly like the Inventory page does ──
const wb = XLSX.readFile(exported);
let sheetName = wb.SheetNames[0];
for (const name of wb.SheetNames) if (/app\s*-?\s*cse/i.test(name)) { sheetName = name; break; }
const sheet = wb.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: true });
const layout = detectAppCseLayout({ name: sheetName, rows, merges: sheet["!merges"] || [] });
const validation = validateAppCseLayout(layout, { requiredColumns: ["name"] });
const parsed = parseAppCseRows(rows, layout);

console.log(`  sheet: "${sheetName}", headerRow ${layout.headerRow + 1}, monthRow ${layout.monthRow + 1}, firstDataRow ${layout.firstDataRow + 1}`);
console.log(`  monthColumns: [${layout.monthColumns.join(", ")}]`);
console.log(`  columns: ${JSON.stringify(layout.columns)}`);
console.log(`  parsed ${parsed.items.length} items (Part I ${parsed.partOne} / Part II ${parsed.partTwo}), skipped ${parsed.skipped}`);
parsed.items.forEach((i) => console.log(`    [${i.category}] "${i.name}" code="${i.code}" unit=${i.unit} qty=${i.quantity} price=${i.acquisition_cost} months=${JSON.stringify(i.monthly)}`));

check("layout detected a name column", layout.columns.name !== undefined);
check("all 12 month columns detected", layout.monthColumns.every((c) => c >= 0), JSON.stringify(layout.monthColumns));
check("validation passed", validation.ok, validation.errors.join(" | "));
check("no duplicate rows on re-import", parsed.duplicates === 0, `duplicates=${parsed.duplicates}`);
check("item count preserved", parsed.items.length === items.length, `${parsed.items.length} vs ${items.length}`);

const source = new Map(items.map((i) => [i.name, i]));
for (const parsedItem of parsed.items) {
  const orig = source.get(parsedItem.name);
  if (!orig) { check(`round-trip match for "${parsedItem.name}"`, false, "not found in source"); continue; }
  const expectedCode = orig.barcode_value || "";
  check(`round-trip code for "${parsedItem.name}"`, parsedItem.code === expectedCode, `"${parsedItem.code}" vs "${expectedCode}"`);
  check(`round-trip unit for "${parsedItem.name}"`, parsedItem.unit === orig.unit, `"${parsedItem.unit}" vs "${orig.unit}"`);
  check(`round-trip price for "${parsedItem.name}"`, Math.abs(parsedItem.acquisition_cost - orig.acquisition_cost) < 0.005, `${parsedItem.acquisition_cost} vs ${orig.acquisition_cost}`);
  const expectedMonths = MONTH_QUANTITY_COLUMNS.map((c) => Number(orig[c] || 0));
  check(`round-trip monthly values for "${parsedItem.name}"`,
    JSON.stringify(parsedItem.monthly) === JSON.stringify(expectedMonths),
    `${JSON.stringify(parsedItem.monthly)} vs ${JSON.stringify(expectedMonths)}`);
  check(`round-trip category for "${parsedItem.name}"`, parsedItem.category === orig.category.name, `"${parsedItem.category}" vs "${orig.category.name}"`);
  const expectedTotal = expectedMonths.reduce((s, v) => s + v, 0);
  check(`round-trip annual quantity for "${parsedItem.name}"`, parsedItem.quantity === expectedTotal, `${parsedItem.quantity} vs ${expectedTotal}`);
}

// Excel data types: monthly/total/price cells must be numeric, not text.
const itemRow = rows.findIndex((row) => String(row[2] ?? "").includes("ALCOHOL, Ethyl"));
if (itemRow >= 0) {
  const numericCols = [...layout.monthColumns, layout.columns.price, layout.columns.totalQty];
  const bad = numericCols.filter((c) => typeof rows[itemRow][c] !== "number");
  check("numeric columns are stored as real numbers", bad.length === 0, `text cells at ${bad.join(",")}`);
}

// Idempotency: importing the exported file twice must produce identical data.
const second = parseAppCseRows(rows, layout);
check("re-import is deterministic", JSON.stringify(second.items) === JSON.stringify(parsed.items));

console.log(`\n${failures === 0 ? "ALL ROUND-TRIP CHECKS PASSED" : `${failures} ROUND-TRIP CHECK(S) FAILED`}`);
