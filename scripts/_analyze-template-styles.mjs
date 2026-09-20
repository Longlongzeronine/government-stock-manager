// Deep-dive the official template's style objects (fonts, fills, borders, alignment)
// so we can replicate them exactly in the styled export.
import XLSX from "xlsx";

const wb = XLSX.readFile("C:/Users/Francis/Downloads/APP_CSE_Template_2026.xlsx", { cellStyles: true, cellNF: true });
const ws = wb.Sheets[wb.SheetNames[0]];

const show = (r, c, label) => {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = ws[addr];
  console.log(`\n--- ${label} (${addr}) v=${String(cell?.v ?? "").slice(0, 60)}`);
  if (cell?.s) console.log(JSON.stringify(cell.s, null, 1));
  else console.log("(no style)");
};

// Title / section labels
show(0, 0, "Title APP-CSE 2026 FORM");
show(1, 0, "Subtitle ANNUAL PROCUREMENT PLAN");
show(3, 0, "Introduction:");
show(4, 0, "Intro body");
show(8, 0, "Reminders:");
show(21, 0, "Note:");
show(22, 2, "Agency label Dept");
show(22, 3, "Agency value TESDA");
show(22, 8, "Agency label Agency Code");

// Table header rows
show(29, 0, "HDR Item & Specifications");
show(29, 3, "HDR Unit of Measure");
show(29, 4, "HDR Monthly Quantity Requirement");
show(29, 24, "HDR Total Quantity");
show(29, 25, "HDR Unit Price");
show(29, 26, "HDR Total Amount");
show(30, 4, "SUB Jan");
show(30, 8, "SUB Q1 AMOUNT");

// Part + category + item rows
show(31, 0, "PART I header");
show(32, 0, "Category row");
show(33, 0, "Item # cell");
show(33, 1, "Item code cell");
show(33, 2, "Item name cell");
show(33, 3, "Item unit cell");
show(33, 4, "Item month cell");
show(33, 8, "Item Q1 AMOUNT cell");
show(33, 25, "Item unit price cell");
show(33, 26, "Item total amount cell");

// Summary rows
show(378, 0, "A. TOTAL row");
show(378, 24, "A. TOTAL value");
show(380, 0, "B. INFLATION row");
show(382, 0, "D. GRAND TOTAL row");
show(383, 0, "E. APPROVED BUDGET row");

// Certification
show(395, 1, "Cert Prepared by");
show(396, 1, "Cert name");
show(399, 1, "Cert title");
show(401, 1, "Date Prepared label");
show(401, 2, "Date Prepared value");

// Row heights summary (distinct values with counts)
console.log("\n=== ROW HEIGHT DISTRIBUTION ===");
const heights = {};
(ws["!rows"] || []).forEach((r, i) => {
  if (r && r.hpt) {
    const k = r.hpt;
    heights[k] = heights[k] || [];
    if (heights[k].length < 3) heights[k].push(i);
  }
});
Object.entries(heights).forEach(([h, rows]) => console.log(`${h}pt: first rows ${rows.join(",")}`));
