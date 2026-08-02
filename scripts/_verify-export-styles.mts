// Verify the styled APP-CSE export matches the official template's look:
// fills, fonts, borders, row heights, and column widths.
import XLSX from "xlsx-js-style";
import { exportAppCseXlsx } from "../src/lib/export";

// ── Sample data shaped like the app's items ──
const items = [
  {
    id: "i1",
    name: "ALCOHOL, Ethyl, 500 mL",
    unit: "bottle",
    barcode_value: "12191601-AL-E04",
    qr_code_value: null,
    acquisition_cost: 55.62,
    quantity: 44,
    category: { name: "ALCOHOL OR ACETONE BASED ANTISEPTICS" },
    jan_quantity: 4, feb_quantity: 4, mar_quantity: 4, apr_quantity: 4,
    may_quantity: 4, jun_quantity: 4, jul_quantity: 1, aug_quantity: 4,
    sep_quantity: 4, oct_quantity: 4, nov_quantity: 4, dec_quantity: 4,
  },
  {
    id: "i2",
    name: "SIGN PEN, Extra Fine Tip, Black",
    unit: "piece",
    barcode_value: "60121524-SP-G01",
    qr_code_value: null,
    acquisition_cost: 27.11,
    quantity: 20,
    category: { name: "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES" },
    jan_quantity: 5, feb_quantity: 0, mar_quantity: 0, apr_quantity: 5,
    may_quantity: 0, jun_quantity: 0, jul_quantity: 5, aug_quantity: 0,
    sep_quantity: 0, oct_quantity: 5, nov_quantity: 0, dec_quantity: 0,
  },
  {
    id: "i3",
    name: "CUSTOM ITEM WITHOUT BARCODE",
    unit: "pcs",
    barcode_value: null,
    qr_code_value: null,
    acquisition_cost: 10,
    quantity: 5,
    category: { name: "OTHER ITEMS" },
    jan_quantity: 1, feb_quantity: 1, mar_quantity: 1, apr_quantity: 1,
    may_quantity: 1, jun_quantity: 0, jul_quantity: 0, aug_quantity: 0,
    sep_quantity: 0, oct_quantity: 0, nov_quantity: 0, dec_quantity: 0,
  },
];
const fields = {
  department: "TESDA PROVINCIAL TRAINING CENTER-DAVAO DEL NORTE",
  region: "XI",
  organizationType: "NATIONAL GOVERNMENT AGENCY",
  address: "ENERGY PARK, BRGY. APOKON, TAGUM CITY DAVAO DEL NORTE",
  contact: "ENGR. JENY E. BUSCANO",
  position: "TESD SPECIALIST II",
  email: "jebuscano@tesda.gov.ph",
  telephone: "09633771612",
  preparedBy: "ENGR. JENY E. BUSCANO",
  certifiedBy: "GINA MAY O. CALIMBAS",
  approvedBy: "ENGR. ALBERT N. MANINGO",
  preparedDate: "8-2-2026",
};

// Generate to a temp file (the function calls XLSX.writeFile)
const OUT = "C:/Users/Francis/AppData/Local/Temp/app-cse-verify.xlsx";
// @ts-expect-error node run
const fs = await import("node:fs");
try { fs.unlinkSync(OUT); } catch {}
exportAppCseXlsx(items as any, {} as any, fields as any, OUT.replace(/\.xlsx$/, ""));

const ours = XLSX.readFile(OUT, { cellStyles: true, cellNF: true });
const tpl = XLSX.readFile("C:/Users/Francis/Downloads/APP_CSE_Template_2026.xlsx", { cellStyles: true, cellNF: true });
const wsO = ours.Sheets[ours.SheetNames[0]];
const wsT = tpl.Sheets[tpl.SheetNames[0]];

const fillRgb = (cell: any) => cell?.s?.fill?.fgColor?.rgb ?? null;
const fontInfo = (cell: any) => cell?.s?.font ? `${cell.s.font.name} ${cell.s.font.sz}${cell.s.font.bold ? " B" : ""}` : null;
const hasBorder = (cell: any) => !!(cell?.s?.border && (cell.s.border.top?.style || cell.s.border.bottom?.style));

console.log("=== COMPARISON (row:col) ours vs template ===");
const checks: [number, number, string][] = [
  [0, 0, "title fill"], [29, 0, "hdr fill"], [30, 4, "sub month fill"], [30, 8, "sub amount fill"],
  [31, 0, "part fill"], [32, 0, "category fill"], [33, 0, "item fill"], [33, 26, "item amount"],
  [23, 3, "agency value fill"], [25, 18, "agency value fill"],
];
for (const [r, c, label] of checks) {
  const a = XLSX.utils.encode_cell({ r, c });
  const oursF = fillRgb(wsO[a]); const tplF = fillRgb(wsT[a]);
  console.log(`${label} (${r}:${c}): ours=${oursF} tpl=${tplF} ${oursF === tplF ? "OK" : "MISMATCH"}`);
}

// Font check on key cells
for (const [r, c, label] of [[29, 0, "hdr font"], [33, 2, "item font"], [0, 0, "title font"]] as [number, number, string][]) {
  const a = XLSX.utils.encode_cell({ r, c });
  console.log(`${label} (${r}:${c}): ours=${fontInfo(wsO[a])} tpl=${fontInfo(wsT[a])}`);
}

// Border check on header + item rows
for (const [r, c, label] of [[29, 0, "hdr border"], [33, 5, "item border"]] as [number, number, string][]) {
  const a = XLSX.utils.encode_cell({ r, c });
  console.log(`${label} (${r}:${c}): ours=${hasBorder(wsO[a])} tpl=${hasBorder(wsT[a])}`);
}

// Row heights
const rO = wsO["!rows"] || []; const rT = wsT["!rows"] || [];
console.log("\n=== ROW HEIGHTS ===");
[0, 1, 4, 29, 30, 31, 32, 33].forEach((r) => {
  const o = rO[r]?.hpt ?? null; const t = rT[r]?.hpt ?? null;
  console.log(`row ${r}: ours=${o} tpl=${t} ${o === t ? "OK" : o != null ? "DIFF" : "n/a"}`);
});

// Column widths
const cO = wsO["!cols"] || []; const cT = wsT["!cols"] || [];
console.log("\n=== COL WIDTHS ===");
[0, 1, 2, 3, 4, 8, 24, 25, 26].forEach((c) => {
  const o = cO[c]?.wch ?? null; const t = cT[c]?.wch ?? null;
  console.log(`col ${c}: ours=${o} tpl=${t} ${o === t ? "OK" : "DIFF"}`);
});
