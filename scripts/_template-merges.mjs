import XLSX from "xlsx";

const file = process.argv[2] || "C:/Users/Francis/Downloads/APP_CSE_Template_2026.xlsx";
const wb = XLSX.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];
console.log("=== MERGES ===");
(ws["!merges"] || []).forEach((m) => console.log(`r${m.s.r}-${m.e.r} c${m.s.c}-${m.e.c}`));
console.log("\n=== COL WIDTHS ===");
(ws["!cols"] || []).forEach((c, i) => console.log(`col${i}: ${JSON.stringify(c)}`));
console.log("\n=== ROW HEIGHTS (first 45) ===");
(ws["!rows"] || []).slice(0, 45).forEach((r, i) => console.log(`row${i}: ${JSON.stringify(r)}`));
