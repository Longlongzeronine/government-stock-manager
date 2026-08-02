import XLSX from "xlsx";

const file = process.argv[2] || "C:/Users/Francis/Downloads/APP_CSE_Template_2026.xlsx";
const wb = XLSX.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
const show = (a, b) => {
  for (let i = a; i <= b; i++) {
    const r = rows[i] || [];
    const cells = r.map((c, ci) => (c !== "" && c != null ? `${ci}:${JSON.stringify(String(c))}` : null)).filter(Boolean);
    console.log(`${i} | ${cells.join(" | ")}`);
  }
};
console.log("=== ROWS 0-30 (header/intro/agency) ===");
show(0, 30);
console.log("\n=== ROWS 284-292 (PART II boundary) ===");
show(284, 292);
console.log("\n=== ROWS 376-401 (summary + certification) ===");
show(376, 401);
console.log("\n=== MERGES (count) ===");
console.log((ws["!merges"] || []).length);
