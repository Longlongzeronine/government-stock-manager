import XLSX from "xlsx";

const file = process.argv[2] || "C:/Users/Francis/Downloads/APP_CSE_Template_2026.xlsx";
const wb = XLSX.readFile(file);
console.log("SHEETS:", wb.SheetNames);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
console.log("ROWS:", rows.length);
console.log("RANGE:", ws["!ref"]);
console.log("\n=== ALL CELL CONTENT (row -> [col: value]) ===");
rows.forEach((r, i) => {
  const cells = r
    .map((c, ci) => ({ ci, v: String(c).replace(/\n/g, "\\n").slice(0, 60) }))
    .filter((c) => c.v !== "");
  if (cells.length) console.log(i, JSON.stringify(cells));
});
console.log("\n=== MERGES (first 80) ===");
(ws["!merges"] || []).slice(0, 80).forEach((m) => console.log(`A${m.s.r + 1}:${m.s.c + 1} -> A${m.e.r + 1}:${m.e.c + 1}`));
console.log("\n=== COL WIDTHS ===");
console.log(JSON.stringify(ws["!cols"]));
console.log("\n=== ROW HEIGHTS (first 25) ===");
console.log(JSON.stringify((ws["!rows"] || []).slice(0, 25)));
