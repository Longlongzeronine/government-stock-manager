/**
 * Diagnostic: Why are some XLSX items missing after import?
 * - Parses the APP-CSE 2026 workbook with the SAME logic as the app's Import XLSX (importXlsx)
 *   AND the robust migration parser.
 * - Compares against the live DB to find missing items.
 * - Computes expected totals vs actual DB totals.
 */
import postgres from "postgres";
import { readFileSync } from "fs";
import XLSX from "xlsx";

const FILE_PATH = "C:/Users/Francis/Downloads/APP_CSE_Template_2026.xlsx";

// Resolve DB URL
let dbUrl = "postgres://postgres:postgres@localhost:5432/government_stock_manager";
try {
  const env = readFileSync(".env", "utf8");
  const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
  const port = env.match(/^DB_PORT=(.+)$/m)?.[1]?.trim();
  if (url) dbUrl = port ? url.replace(/:\d+\//, `:${port}/`) : url;
} catch {}
console.log(`DB: ${dbUrl.replace(/:[^:@]+@/, ":***@")}`);

const wb = XLSX.readFile(FILE_PATH);
console.log(`Workbook sheets: ${wb.SheetNames.join(", ")}`);

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_COLS = MONTHS.map((m) => `${m}_quantity`);

const toStr = (v) => String(v ?? "").trim();
const toNum = (v) => {
  if (typeof v === "number") return v || 0;
  const s = String(v ?? "").replace(/[^\d.,-]/g, "").replace(/,/g, "");
  return Number(s) || 0;
};

const SKIP_NAMES = /^(date\s+prepared|department|bureau|office|region|organization|contact|position|address|e-?mail|telephone|mobile|agency|fund|prepared\s+by|approved|supply\s+officer|accountant|property|total\s+amount|grand\s+total|a\.\s+total|b\.\s+additional|c\.\s+additional|d\.\s+grand|e\.\s+approved|we\s+hereby|part\s+[ivx]|monthly\s+quantity|unit\s+of\s+measure|unit\s+price|for\s+the\s+year|as\s+of|item\s*&|introduction|reminder|note:|annual\s+procurement|common-use|ps-dbm|head\s+of|prepared,|certified,|consistent\s+with|please\s+refer|please\s+indicate|note\s*\:|in\s+figures)/i;

// ── Parser #1: the migration's robust parser ──
function parseMigration(rows) {
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
  let codeCol = 1, nameCol = 2, unitCol = 3, priceCol = -1;
  for (let c = 0; c < subHdr.length; c++) {
    const cell = toStr(subHdr[c]).toLowerCase();
    if (/code|barcode/i.test(cell)) codeCol = c;
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
  const items = [];
  for (let r = subHdrRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row.length) continue;
    const c0 = toStr(row[0]);
    const c1 = toStr(row[1]);
    const c2 = toStr(row[2]);
    const full = row.map(toStr).join(" ");
    if (/^PART\s+II\b/i.test(c0) || (/\bPART\s+II\b/i.test(full) && !c1 && !c2)) { inPart2 = true; continue; }
    if (/^PART\s+I(?!I)\b/i.test(c0) || (/\bPART\s+I(?!I)\b/i.test(full) && !c1 && !c2)) { if (inPart2) break; inPart2 = false; continue; }
    if (!c1 && !c2 && c0.length > 3 && !/^PART\s/i.test(c0) && !/^(A\.|B\.|C\.|D\.|E\.)/i.test(c0)) continue;
    const code = c1;
    let name = c2;
    if (!name && c1 && !/^[0-9-]+$/.test(c1)) name = c1;
    if (!name) continue;
    const unit = toStr(row[unitCol]) || "pcs";
    const monthly = {};
    for (let m = 0; m < 12; m++) monthly[MONTH_COLS[m]] = monthIdx[m] != null ? toNum(row[monthIdx[m]]) : 0;
    const totalQty = Object.values(monthly).reduce((s, v) => s + v, 0);
    const price = priceCol >= 0 ? toNum(row[priceCol]) : 0;
    if (!inPart2) {
      items.push({ name, code, unit, quantity: totalQty, acquisition_cost: price, ...monthly, part: 1, amount: totalQty * price });
    } else {
      items.push({ name, code: code || "", unit, quantity: totalQty, acquisition_cost: price, ...monthly, part: 2, amount: totalQty * price });
    }
  }
  return items;
}

// ── Parser #2: replicate the app's importXlsx logic ──
function parseApp(rows) {
  const MONTH_PATTERNS = [/^jan/i, /^feb/i, /^mar/i, /^apr/i, /^may/i, /^jun/i, /^jul/i, /^aug/i, /^sep/i, /^oct/i, /^nov/i, /^dec/i, /^january/i, /^february/i, /^march/i, /^april/i, /^june/i, /^july/i, /^august/i, /^september/i, /^october/i, /^november/i, /^december/i];
  const monthColNames = MONTH_COLS;
  let subHeaderRow = -1;
  const monthIndices = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const found = [];
    for (let c = 0; c < row.length; c++) {
      const cell = toStr(row[c]);
      if (MONTH_PATTERNS.some((p) => p.test(cell))) found.push(c);
    }
    if (found.length >= 6) {
      subHeaderRow = r;
      const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      for (let c = 0; c < row.length; c++) {
        const cell = toStr(row[c]).toLowerCase().trim();
        const exactIdx = monthNames.findIndex((m) => cell === m);
        if (exactIdx >= 0) { monthIndices[exactIdx] = c; continue; }
        const fullIdx = monthNames.findIndex((m) => cell.startsWith(m));
        if (fullIdx >= 0) monthIndices[fullIdx] = c;
      }
      break;
    }
  }
  if (subHeaderRow < 0) throw new Error("no months row (app)");
  let headerRow = -1;
  for (let r = subHeaderRow - 1; r >= Math.max(0, subHeaderRow - 5); r--) {
    const row = rows[r];
    const text = row.map(toStr).join(" ").toLowerCase();
    if (/item|specification|description/.test(text) && /unit/.test(text)) { headerRow = r; break; }
  }
  const subHdrCells = rows[subHeaderRow].map(toStr);
  let codeCol = 1;
  for (let c = 0; c < subHdrCells.length; c++) if (/code|barcode|sku|ps-dbm|psdbm/i.test(subHdrCells[c])) { codeCol = c; break; }
  let nameCol = 2;
  for (let c = 0; c < subHdrCells.length; c++) if (/item|description|product|name|specification/i.test(subHdrCells[c])) { nameCol = c; break; }
  let unitCol = 3;
  for (let c = 0; c < subHdrCells.length; c++) if (/^unit/i.test(subHdrCells[c])) { unitCol = c; break; }
  let priceCol = -1;
  const mainHdrCells = headerRow >= 0 ? rows[headerRow].map(toStr) : subHdrCells;
  for (let c = 0; c < mainHdrCells.length; c++) if (/unit\s*price|acquisition.*cost|^cost$/i.test(mainHdrCells[c])) { priceCol = c; break; }

  const isCategoryRow = (row) => {
    const uniqueValues = Array.from(new Set(row.map((cell) => toStr(cell)).filter(Boolean)));
    if (uniqueValues.length === 0 || uniqueValues.length > 3) return null;
    const fullText = row.map(toStr).join(" ");
    if (/part\s+[ivx]/i.test(fullText)) return null;
    const text = uniqueValues.find((cell) => {
      const s = toStr(cell);
      if (s.length <= 5) return false;
      if (/^[A-Z0-9]{2,15}[-][A-Z0-9]{2,10}/.test(s)) return false;
      if (/^\d+$/.test(s)) return false;
      if (/^(a\.\s+total|b\.\s+additional|c\.\s+additional|d\.\s+grand|e\.\s+approved|total|grand\s+total|we\s+hereby|consistent\s+with)/i.test(s)) return false;
      if (/^(date\s+prepared|department|bureau|office|region|organization|contact|position|address|e-?mail|telephone|mobile|agency|fund|prepared\s+by|supply\s+officer|accountant|funds\s+available)/i.test(s)) return false;
      if (/^[A-Z][A-Z\s,&\-\(\)\""\.\/]+$/.test(s)) return true;
      if (/^[A-Z][A-Za-z\s,\-]+(\([^)]*\))?\s*(Note:)?/i.test(s) && !/^[a-z]/.test(s)) return true;
      return false;
    });
    if (!text) return null;
    return toStr(text).replace(/\(Note:[^)]*\)/gi, "").trim() || null;
  };

  const isUuid = (c) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c);
  const isDateSerial = (c) => /^\d{4,6}$/.test(c) && Number(c) > 30000 && Number(c) < 60000;

  let currentCategory = "";
  let inPart2 = false;
  const imported = [];
  const startRow = subHeaderRow + 1;
  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    const fullText = row.map(toStr).join(" ");
    if (!fullText.trim()) continue;
    if (/\bPART\s+II\b/i.test(fullText)) { inPart2 = true; currentCategory = "PART II - OTHER ITEMS"; continue; }
    if (/\bPART\s+I(?!I)/i.test(fullText)) { inPart2 = false; currentCategory = ""; continue; }
    const cat = isCategoryRow(row);
    if (cat) { currentCategory = cat; continue; }
    let name = toStr(row[nameCol]);
    if (!name || /^\d+$/.test(name) || name.length < 2) {
      for (let c = 0; c < Math.min(row.length, 10); c++) {
        const cell = toStr(row[c]);
        if (cell.length >= 4 && !/^\d+$/.test(cell) && !/^[A-Z0-9]{2,15}[-][A-Z0-9]{2,10}/.test(cell) && !SKIP_NAMES.test(cell)) {
          if (c !== codeCol) { name = cell; break; }
        }
      }
    }
    const rawCode = toStr(row[codeCol]);
    const unit = toStr(row[unitCol]) || "pcs";
    if (!name || name.length < 2) continue;
    if (SKIP_NAMES.test(name)) continue;
    if (isUuid(rawCode) || isDateSerial(rawCode)) continue;
    if (/^(A\.|B\.|C\.|D\.|E\.)\s+/i.test(name)) continue;
    if (/^(total|grand\s+total|approved\s+budget)/i.test(name)) continue;
    const monthly = {};
    for (let m = 0; m < 12; m++) monthly[monthColNames[m]] = monthIndices[m] != null ? toNum(row[monthIndices[m]]) : 0;
    const price = priceCol >= 0 ? toNum(row[priceCol]) : 0;
    const totalQty = Object.values(monthly).reduce((s, v) => s + v, 0);
    const hasValidCode = rawCode && !isUuid(rawCode) && !isDateSerial(rawCode);
    if (inPart2 && hasValidCode) {
      imported.push({ name, barcode_value: null, description: `[${rawCode}] ${name}`, unit, quantity: totalQty, acquisition_cost: price, category_name: currentCategory || "OTHER ITEMS", ...monthly, part: 2, amount: totalQty * price });
    } else {
      imported.push({ name, barcode_value: hasValidCode ? rawCode : null, unit, quantity: totalQty, acquisition_cost: price, category_name: currentCategory || (inPart2 ? "OTHER ITEMS" : "PS-DBM SUPPLIES"), ...monthly, part: inPart2 ? 2 : 1, amount: totalQty * price });
    }
  }
  return imported;
}

// ── Run ──
for (const sheetName of wb.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "" });
  console.log(`\n=== Sheet "${sheetName}" (${rows.length} rows) ===`);
  const migItems = parseMigration(rows);
  const appItems = parseApp(rows);
  const migTotals = migItems.reduce((s, i) => s + i.amount, 0);
  const appTotals = appItems.reduce((s, i) => s + i.amount, 0);
  console.log(`MIGRATION parser: ${migItems.length} items, Part1=${migItems.filter(i=>i.part===1).length}, Part2=${migItems.filter(i=>i.part===2).length}, TOTAL = ₱${migTotals.toFixed(2)}`);
  console.log(`APP parser:       ${appItems.length} items, Part1=${appItems.filter(i=>i.part===1).length}, Part2=${appItems.filter(i=>i.part===2).length}, TOTAL = ₱${appTotals.toFixed(2)}`);

  // Which items does the migration parser see that the app parser does NOT?
  const migNames = new Set(migItems.map((i) => `${i.part}|${i.code}|${i.name}`.toLowerCase()));
  const appKeys = new Set(appItems.map((i) => `${i.part}|${i.barcode_value || ""}|${i.name}`.toLowerCase()));
  const missing = migItems.filter((i) => !appKeys.has(`${i.part}|${i.code || ""}|${i.name}`.toLowerCase()));
  const missingExtra = migItems.filter((i) => !appItems.some((a) => a.name.toLowerCase() === i.name.toLowerCase() && (a.barcode_value || "") === (i.part === 1 ? i.code || "" : "")));
  console.log(`\nApp parser MISSES ${missingExtra.length} items that migration parser finds:`);
  missingExtra.forEach((i) => console.log(`  [P${i.part}] code="${i.code}" name="${i.name}" qty=${i.quantity} price=${i.acquisition_cost} amount=₱${i.amount.toFixed(2)}`));

  // DB comparison
  const sql = postgres(dbUrl, { max: 1, connect_timeout: 5 });
  const dbItems = await sql`SELECT name, barcode_value, description, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity, acquisition_cost FROM items`;
  const dbTotal = dbItems.reduce((s, i) => {
    const q = MONTH_COLS.reduce((a, m) => a + Number(i[m] || 0), 0);
    return s + q * Number(i.acquisition_cost || 0);
  }, 0);
  const dbP1 = dbItems.filter((i) => i.barcode_value).reduce((s, i) => { const q = MONTH_COLS.reduce((a, m) => a + Number(i[m] || 0), 0); return s + q * Number(i.acquisition_cost || 0); }, 0);
  const dbP2 = dbItems.filter((i) => !i.barcode_value).reduce((s, i) => { const q = MONTH_COLS.reduce((a, m) => a + Number(i[m] || 0), 0); return s + q * Number(i.acquisition_cost || 0); }, 0);
  console.log(`\nDB: ${dbItems.length} items total. Part1(qty*price)=₱${dbP1.toFixed(2)}, Part2=₱${dbP2.toFixed(2)}, TOTAL=₱${dbTotal.toFixed(2)}`);

  // Items in the file (migration parse) not present in DB
  const dbByName = new Map(dbItems.map((i) => [i.name.trim().toLowerCase(), i]));
  const fileNotInDb = migItems.filter((i) => {
    const db = dbByName.get(i.name.trim().toLowerCase());
    if (!db) return true;
    if (i.part === 1) return !db.barcode_value || String(db.barcode_value).trim().toLowerCase() !== String(i.code).toLowerCase();
    return !!db.barcode_value; // file part2 should have null barcode in DB
  });
  console.log(`\nIn FILE (migration parse) but NOT matched in DB: ${fileNotInDb.length} items`);
  fileNotInDb.forEach((i) => console.log(`  [P${i.part}] code="${i.code}" name="${i.name}" amount=₱${i.amount.toFixed(2)}`));
  const fileNotInDbAmount = fileNotInDb.reduce((s, i) => s + i.amount, 0);
  console.log(`  SUM of those amounts = ₱${fileNotInDbAmount.toFixed(2)}`);

  const missingByNameInDb = migItems.filter((i) => !dbByName.has(i.name.trim().toLowerCase()));
  console.log(`\nIn FILE but name ABSENT from DB entirely: ${missingByNameInDb.length}`);
  missingByNameInDb.forEach((i) => console.log(`  [P${i.part}] code="${i.code}" name="${i.name}" amount=₱${i.amount.toFixed(2)}`));
  const missingByNameAmount = missingByNameInDb.reduce((s, i) => s + i.amount, 0);
  console.log(`  SUM = ₱${missingByNameAmount.toFixed(2)}`);

  // Delta vs the Excel's own A. TOTAL (306,710.00) and Grand (337,381.00)
  const excelTotal = 306710.0;
  const excelGrand = 337381.0;
  console.log(`\nExpected A. TOTAL from Excel screenshot: ₱${excelTotal.toFixed(2)} (delta vs DB: ₱${(excelTotal - dbTotal).toFixed(2)})`);
  console.log(`Expected GRAND TOTAL: ₱${excelGrand.toFixed(2)} (delta vs DB+10%: ₱${(excelGrand - (dbTotal + dbTotal * 0.1)).toFixed(2)})`);
  await sql.end();
}
