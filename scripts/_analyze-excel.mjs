// TEMP: analyze Excel structure in detail
import XLSX from "xlsx";

const wb = XLSX.readFile("C:/Users/Francis/Downloads/APP_CSE_Template_2026.xlsx");
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

const SKIP_RE = /^(date\s+prepared|department|bureau|office|region|organization|contact|position|address|e-?mail|telephone|mobile|agency|fund|prepared|supply|accountant|property|total|grand|monthly|unit\s+of|unit\s+price|for\s+the|as\s+of|item\s*&|introduction|reminder|note|annual|common|ps-dbm|head|certified|consistent|please|approved|engr\.|ocs|we\s+hereby)/i;
const SKIP_EXACT = /^(a\.|b\.|c\.|d\.|e\.)\s/i;

let inPart2 = false;
let curCat = "";
let part1Count = 0, part2Count = 0, catCount = 0;
const cats = new Set();
const seenCodes = new Map();
const suspicious = [];

for (let r = 31; r < rows.length; r++) {
  const row = rows[r];
  if (!row || row.length === 0) continue;
  const full = row.map((c) => String(c ?? "").trim()).join(" ");
  if (!full.trim()) continue;

  if (/\bPART\s+II\b/i.test(full)) { inPart2 = true; curCat = "PART II"; continue; }
  if (/\bPART\s+I\b(?!I)/i.test(full)) { inPart2 = false; curCat = ""; continue; }

  const name = String(row[2] ?? "").trim();
  const code = String(row[1] ?? "").trim();

  // Category header row: only 1-2 cells filled, col0 has long text, no code
  const nonEmpty = row.filter((c) => String(c ?? "").trim() !== "").length;
  if (nonEmpty <= 2 && !name && !/^[0-9]{2,}[-][A-Z0-9]/.test(code)) {
    const text = String(row[0] ?? "").trim();
    if (text.length > 3 && !/^(PART|A\.|B\.|C\.|D\.|E\.)/i.test(text) && !SKIP_RE.test(text)) {
      // check it's a category by not having an item name in col2 and col1 being a plausible code
      if (!code && !name) {
        curCat = text.replace(/\s*\(Note:.*$/i, "").trim();
        if (!cats.has(curCat)) { cats.add(curCat); catCount++; }
        continue;
      }
    }
  }

  // Item row: has name in col2
  if (name && name.length >= 2) {
    if (SKIP_RE.test(name) || SKIP_EXACT.test(name)) continue;
    if (/^\d{4,5}$/.test(name)) continue;
    if (inPart2) part2Count++; else part1Count++;
    if (code) {
      if (seenCodes.has(code)) suspicious.push(`Duplicate code ${code} at row ${r}`);
      seenCodes.set(code, r);
    }
    continue;
  }
}

console.log("Part I items:", part1Count);
console.log("Part II items:", part2Count);
console.log("Total items:", part1Count + part2Count);
console.log("Categories detected:", catCount);
console.log("Category names:", [...cats].join("\n  - "));
console.log("Suspicious:", suspicious.length ? suspicious : "none");
