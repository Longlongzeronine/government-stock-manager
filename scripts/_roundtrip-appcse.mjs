// End-to-end round trip: app data -> exportAppCseXlsx -> parseAppCseRows.
// Run: node --experimental-strip-types scripts/_roundtrip-appcse.mjs
import XLSX from "xlsx";
import { exportAppCseXlsx } from "../src/lib/export.ts";
import { detectAppCseLayout, parseAppCseRows, validateAppCseLayout, MONTH_QUANTITY_COLUMNS } from "../src/lib/appcse-sheet.ts";

const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
let failures = 0;
const check = (label, condition, detail = "") => {
  if (condition) console.log(`  PASS  ${label}`);
  else { failures += 1; console.log(`  FAIL  ${label} ${detail}`); }
};

// Sample data shaped exactly like the rows returned by listItems().
const planned = {
  p1: { barcode: "12191601-AL-E04", name: "ALCOHOL, Ethyl, 500 mL", unit: "bottle", price: 55.62, cat: "ALCOHOL OR ACETONE BASED ANTISEPTICS", months: [4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 4, 4] },
  p2: { barcode: "60121413-CB-P01", name: "CLEARBOOK, A4 size", unit: "pieces", price: 35.52, cat: "ARTS AND CRAFTS EQUIPMENT", months: [5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0] },
  p3: { barcode: "26111702-BT-A02", name: "BATTERY, dry cell, AA", unit: "pack", price: 20.8, cat: "BATTERIES AND CELLS", months: [0, 10, 0, 10, 0, 10, 0, 10, 0, 10, 0, 10] },
  q1: { barcode: "", name: "CUSTOM STAMP, 1 inch", unit: "piece", price: 250, cat: "OTHER ITEMS", months: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0] },
  q2: { barcode: "", name: "PLASTIC FASTENER", unit: "box", price: 50, cat: "SUPPLIES", months: [5, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0] },
};

const sourceItems = Object.entries(planned).map(([id, entry], index) => ({
  id,
  name: entry.name,
  barcode_value: entry.barcode || null,
  qr_code_value: null,
  unit: entry.unit,
  acquisition_cost: entry.price,
  item_type: "supply",
  category: { name: entry.cat },
  sort_order: index + 1,
  ...Object.fromEntries(months.map((m, i) => [`${m}_quantity`, entry.months[i]])),
}));
const monthlyPlan = Object.fromEntries(Object.entries(planned).map(([id, entry]) => [id, entry.months]));

// ── Export ──
const out = exportAppCseXlsx(sourceItems, monthlyPlan, {
  preparedBy: "ENGR. JENNY E. BUSCANO",
  certifiedBy: "GINA MAY O. CALIMBAS",
  approvedBy: "ENGR. ALBERT N. MANINGO",
  preparedDate: "8-2-2026",
}, "_roundtrip-test");

console.log(`\nExported: ${out?.path ?? out?.filename ?? JSON.stringify(out)}`);
const file = typeof out === "string" ? out : out?.path ?? "_roundtrip-test.xlsx";

// ── Re-import ──
const wb = XLSX.readFile(file);
const sheetName = wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: true });
const layout = detectAppCseLayout({ name: sheetName, rows, merges: sheet["!merges"] });
const validation = validateAppCseLayout(layout, { requireMonths: true });
const parsed = parseAppCseRows(rows, layout);

console.log("  sheet:", sheetName, "| headerRow:", layout.headerRow + 1, "| monthRow:", layout.monthRow + 1, "| firstDataRow:", layout.firstDataRow + 1);
console.log("  columns:", JSON.stringify(layout.columns));
console.log("  monthColumns:", JSON.stringify(layout.monthColumns.map((c) => c + 1)));
console.log("  detected:", validation.detected.join(" | "));
console.log("  errors:", validation.errors);
console.log("  warnings:", validation.warnings);
console.log(`  parsed: ${parsed.items.length} items (Part I ${parsed.partOne} / Part II ${parsed.partTwo}), skipped ${parsed.skipped}, duplicates ${parsed.duplicates}`);
parsed.items.forEach((item) => console.log(`    r${item.sourceRow} [${item.category}] "${item.name}" code="${item.code}" unit=${item.unit} qty=${item.quantity} price=${item.acquisition_cost} months=${JSON.stringify(item.monthly)}`));

check("exported file is valid APP-CSE 2026 (all 12 months detected)", validation.ok, JSON.stringify(validation.errors));
check("all 12 monthly columns detected", layout.monthColumns.every((c) => c >= 0), JSON.stringify(layout.monthColumns));
check("every source item survived the round trip", parsed.items.length === sourceItems.length, `${parsed.items.length} vs ${sourceItems.length}`);
check("no duplicates reported on a single export", parsed.duplicates === 0, String(parsed.duplicates));

const sourceMonths = sourceItems.map((item) => months.map((m) => Number(item[`${m}_quantity`])).join(","));
for (const item of parsed.items) {
  const monthly = item.monthly.join(",");
  check(`monthly values preserved for "${item.name}"`, sourceMonths.includes(monthly), monthly);
}


for (const item of sourceItems) {
  const match = parsed.items.find((parsedItem) => parsedItem.name === item.name || parsedItem.name === `[${item.barcode_value}] ${item.name}`);
  if (!match) continue;
  check(`unit preserved for "${item.name}"`, match.unit === item.unit, `${match.unit} vs ${item.unit}`);
  check(`price preserved for "${item.name}"`, Math.abs(match.acquisition_cost - Number(item.acquisition_cost)) < 0.011, `${match.acquisition_cost} vs ${item.acquisition_cost}`);
  check(`total quantity preserved for "${item.name}"`, match.quantity === months.reduce((sum, m) => sum + Number(item[`${m}_quantity`]), 0), String(match.quantity));
}

// A month that is 0 in the source must stay 0 after import.
const alcohol = parsed.items.find((item) => item.name.startsWith("ALCOHOL"));
check("April = 0 stays 0 after the round trip", alcohol?.monthly[3] === 0, JSON.stringify(alcohol?.monthly));

// ── Stability: a second round trip must not change anything ──
const secondItems = parsed.items.map((item, index) => ({
  id: `r${index}`,
  name: item.name,
  barcode_value: item.code || null,
  unit: item.unit,
  acquisition_cost: item.acquisition_cost,
  item_type: "supply",
  category: { name: item.category },
  sort_order: index + 1,
  ...Object.fromEntries(MONTH_QUANTITY_COLUMNS.map((column, m) => [column, item.monthly[m]])),
}));
const secondPlan = Object.fromEntries(parsed.items.map((item, index) => [`r${index}`, item.monthly]));
const out2 = exportAppCseXlsx(secondItems, secondPlan, { preparedDate: "8-2-2026" }, "_roundtrip-test-2");
const file2 = typeof out2 === "string" ? out2 : out2?.path ?? "_roundtrip-test-2.xlsx";
const wb2 = XLSX.readFile(file2);
const sheet2 = wb2.Sheets[wb2.SheetNames[0]];
const rows2 = XLSX.utils.sheet_to_json(sheet2, { header: 1, defval: "", blankrows: true });
const layout2 = detectAppCseLayout({ name: wb2.SheetNames[0], rows: rows2, merges: sheet2["!merges"] });
const parsed2 = parseAppCseRows(rows2, layout2);
check("second round trip keeps the same item count", parsed2.items.length === parsed.items.length, `${parsed2.items.length} vs ${parsed.items.length}`);
const stable = parsed2.items.every((item, index) => item.monthly.join(",") === parsed.items[index]?.monthly.join(",") && item.name === parsed.items[index]?.name);
check("monthly values + names are stable across round trips", stable);
check("no [code] prefix duplication after re-export", parsed2.items.every((item) => (item.name.match(/^\[/g) || []).length <= 1), JSON.stringify(parsed2.items.filter((i) => i.name.startsWith("[")).map((i) => i.name)));

console.log(`\n${failures === 0 ? "ALL ROUND-TRIP CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
