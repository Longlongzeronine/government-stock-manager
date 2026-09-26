// Verifies src/lib/appcse-sheet.ts against the real APP-CSE workbooks.
// Run: node --experimental-strip-types scripts/_verify-appcse-sheet.mjs <file...>
import XLSX from "xlsx";
import {
  detectAppCseLayout,
  validateAppCseLayout,
  parseAppCseRows,
  MONTH_LABELS,
} from "../src/lib/appcse-sheet.ts";

const files = process.argv.slice(2);
let failures = 0;

const check = (label, condition, detail = "") => {
  if (condition) console.log(`  PASS  ${label}`);
  else { failures += 1; console.log(`  FAIL  ${label} ${detail}`); }
};

for (const file of files) {
  console.log(`\n${"=".repeat(78)}\nFILE: ${file}`);
  const wb = XLSX.readFile(file);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: true });

  const layout = detectAppCseLayout({ name: wb.SheetNames[0], rows, merges: sheet["!merges"] });
  console.log("  headerRow:", layout.headerRow, "monthRow:", layout.monthRow, "firstDataRow:", layout.firstDataRow);
  console.log("  monthColumns:", JSON.stringify(layout.monthColumns), layout.monthsInferred ? "(inferred)" : "");
  console.log("  columns:", JSON.stringify(layout.columns));
  console.log("  headersUsed:", JSON.stringify(layout.headersUsed.map((h) => h.row)));

  const validation = validateAppCseLayout(layout, { requireMonths: false });
  console.log("  detected:", validation.detected.join(" | "));
  if (validation.errors.length) console.log("  errors:", validation.errors);
  if (validation.warnings.length) console.log("  warnings:", validation.warnings);

  const parsed = parseAppCseRows(rows, layout);
  console.log(`  parsed: ${parsed.items.length} items (Part I ${parsed.partOne} / Part II ${parsed.partTwo}), skipped ${parsed.skipped}, duplicates ${parsed.duplicates}`);
  parsed.items.slice(0, 3).forEach((item) => {
    console.log(`    r${item.sourceRow} [${item.category}] "${item.name}" code="${item.code}" unit=${item.unit} qty=${item.quantity} price=${item.acquisition_cost} months=${JSON.stringify(item.monthly)}`);
  });

  // Generic invariants that must hold for every supported workbook.
  check("a name column was detected", layout.columns.name !== undefined, JSON.stringify(layout.columns));
  check("at least one item was parsed", parsed.items.length > 0);
  check("every item has a month array of 12", parsed.items.every((i) => i.monthly.length === 12));
  check("no summary/footer text leaked into names", parsed.items.every((i) => !/^(a\.|d\.|e\.)\s|total|we hereby|prepared by/i.test(i.name)));
  check("no month label leaked into names", parsed.items.every((i) => !MONTH_LABELS.includes(i.name)));
  const monthSumPositive = parsed.items.filter((i) => i.monthly.some((v) => v > 0)).length;
  console.log(`  items carrying monthly quantities: ${monthSumPositive}/${parsed.items.length}`);
}
console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
