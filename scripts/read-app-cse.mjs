import { readFileSync } from 'fs';
import XLSX from 'xlsx';

const filePath = process.argv[2] || 'C:\\Users\\Francis\\Downloads\\APP_CSE_Template_2026.xlsx';
console.log(`Reading: ${filePath}`);

const workbook = XLSX.readFile(filePath);
console.log(`\nSheet names: ${workbook.SheetNames.join(', ')}`);

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`\n=== Sheet: "${sheetName}" ===`);
  console.log(`Rows: ${rows.length}`);
  
  // Find month columns
  const MONTH_PATTERNS = [/^jan/i, /^feb/i, /^mar/i, /^apr/i, /^may/i, /^jun/i, /^jul/i, /^aug/i, /^sep/i, /^oct/i, /^nov/i, /^dec/i];
  let subHeaderRow = -1;
  const monthIndices = [];
  
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    let found = 0;
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? '').trim();
      if (MONTH_PATTERNS.some(p => p.test(cell))) found++;
    }
    if (found >= 6) {
      subHeaderRow = r;
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] ?? '').toLowerCase().trim();
        const idx = monthNames.findIndex(m => cell === m || cell.startsWith(m));
        if (idx >= 0) monthIndices[idx] = c;
      }
      break;
    }
  }
  
  if (subHeaderRow >= 0) {
    console.log(`\nSub-header row (months): ${subHeaderRow}`);
    console.log(`Month column indices: ${JSON.stringify(monthIndices)}`);
    console.log(`Sub-header cells: ${JSON.stringify(rows[subHeaderRow])}`);
  }
  
  // Find code, name, unit columns from sub-header
  if (subHeaderRow >= 0) {
    const subHdr = rows[subHeaderRow];
    let codeCol = 1, nameCol = 2, unitCol = 3;
    for (let c = 0; c < subHdr.length; c++) {
      const cell = String(subHdr[c] ?? '').toLowerCase();
      if (/code|barcode/i.test(cell)) codeCol = c;
      if (/item|description|specification/i.test(cell)) nameCol = c;
      if (/^unit/i.test(cell)) unitCol = c;
    }
    console.log(`Code col: ${codeCol}, Name col: ${nameCol}, Unit col: ${unitCol}`);
    
    // Also find price column in the main header
    let priceCol = -1;
    if (subHeaderRow > 0) {
      const mainHdr = rows[subHeaderRow - 1];
      for (let c = 0; c < mainHdr.length; c++) {
        const cell = String(mainHdr[c] ?? '').toLowerCase();
        if (/unit\s*price|cost/i.test(cell)) { priceCol = c; break; }
      }
    }
    console.log(`Price col: ${priceCol}`);
    
    // Detect categories and items
    const monthColNames = ['jan_quantity', 'feb_quantity', 'mar_quantity', 'apr_quantity', 'may_quantity', 'jun_quantity', 'jul_quantity', 'aug_quantity', 'sep_quantity', 'oct_quantity', 'nov_quantity', 'dec_quantity'];
    
    let inPart2 = false;
    let currentCategory = '';
    const items = [];
    const categories = new Set();
    
    for (let r = subHeaderRow + 1; r < rows.length; r++) {
      const row = rows[r];
      const fullText = row.map(c => String(c ?? '').trim()).join(' ');
      if (!fullText.trim()) continue;
      
      // PART markers
      if (/\bPART\s+II\b/i.test(fullText)) { inPart2 = true; currentCategory = 'PART II - OTHER ITEMS'; continue; }
      if (/\bPART\s+I(?!I)/i.test(fullText)) { inPart2 = false; currentCategory = ''; continue; }
      
      // Category detection
      const uniqueVals = [...new Set(row.map(c => String(c ?? '').trim()).filter(Boolean))];
      if (uniqueVals.length >= 1 && uniqueVals.length <= 3) {
        const text = uniqueVals.find(s => {
          if (s.length <= 5 || /^\d+$/.test(s)) return false;
          if (/^[A-Z0-9]{2,15}[-][A-Z0-9]{2,10}/.test(s)) return false;
          if (/^(a\.|b\.|c\.|d\.|e\.|total|grand|we\s+hereby|consistent)/i.test(s)) return false;
          if (/^(date|department|region|organization|contact|position|address|e-?mail|telephone|agency|fund|prepared|supply|accountant|property|certified)/i.test(s)) return false;
          if (/^[A-Z][A-Z\s,&\-()\"\.\/]+$/.test(s)) return true;
          if (/^[A-Z][A-Za-z\s,\-]+(\([^)]*\))?\s*(Note:)?/i.test(s) && !/^[a-z]/.test(s)) return true;
          return false;
        });
        if (text) {
          currentCategory = text.replace(/\(Note:[^)]*\)/gi, '').trim();
          categories.add(currentCategory);
          continue;
        }
      }
      
      // Skip non-product rows
      const name = String(row[nameCol] ?? '').trim();
      if (!name || name.length < 2) continue;
      if (/^(date|department|region|organization|contact|position|address|e-?mail|telephone|agency|fund|prepared|supply|accountant|property|total|grand|monthly|unit\s+of|unit\s+price|for\s+the|as\s+of|item\s*&|introduction|reminder|note|annual|common|ps-dbm|head|certified|consistent|please)/i.test(name)) continue;
      if (/^(A\.|B\.|C\.|D\.|E\.)\s+/i.test(name)) continue;
      if (/^(total|grand\s+total|approved\s+budget)/i.test(name)) continue;
      
      const code = String(row[codeCol] ?? '').trim();
      const unit = String(row[unitCol] ?? '').trim() || 'pcs';
      
      // Read monthly quantities
      const monthly = {};
      for (let m = 0; m < 12; m++) {
        const colIdx = monthIndices[m];
        let val = 0;
        if (colIdx != null) {
          const v = row[colIdx];
          val = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^0-9.,-]/g, '').replace(/,/g, '')) || 0;
        }
        monthly[monthColNames[m]] = val;
      }
      
      // Read price
      let price = 0;
      if (priceCol >= 0) {
        const v = row[priceCol];
        price = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^0-9.,-]/g, '').replace(/,/g, '')) || 0;
      }
      
      const totalQty = Object.values(monthly).reduce((s, v) => s + v, 0);
      
      const hasBarcode = code && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code);
      
      items.push({
        name,
        code: hasBarcode ? code : null,
        unit,
        category: currentCategory || (inPart2 ? 'PART II - OTHER ITEMS' : 'PS-DBM SUPPLIES'),
        part: inPart2 ? 2 : 1,
        quantity: totalQty,
        acquisition_cost: price,
        ...monthly
      });
    }
    
    console.log(`\nTotal items found: ${items.length}`);
    console.log(`Categories found: ${[...categories].join(', ')}`);
    console.log(`\nFirst 5 items:`);
    items.slice(0, 5).forEach(item => console.log(JSON.stringify(item)));
    console.log(`\nLast 5 items:`);
    items.slice(-5).forEach(item => console.log(JSON.stringify(item)));
    
    // Write full data to JSON
    const output = { categories: [...categories], items };
    const fs = await import('fs');
    fs.writeFileSync('scripts/app-cse-data.json', JSON.stringify(output, null, 2));
    console.log(`\nFull data written to scripts/app-cse-data.json`);
  } else {
    console.log('No month columns found in this sheet');
    // Print first 20 rows for inspection
    rows.slice(0, 20).forEach((row, i) => console.log(`Row ${i}: ${JSON.stringify(row)}`));
  }
}
