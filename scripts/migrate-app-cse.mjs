/**
 * APP-CSE 2026 Excel → PostgreSQL Migration
 * Consolidated script: reads Excel → cleans data → imports in a single transaction
 */
import postgres from 'postgres';
import { readFileSync } from 'fs';

const DB_URL = 'postgres://postgres:FJ%40zeronine11%2B@localhost:5432/government_stock_manager';
const FILE_PATH = process.argv[2] || 'C:\\Users\\Francis\\Downloads\\APP_CSE_Template_2026.xlsx';

// ── 1. Read Excel ──
console.log(`Reading: ${FILE_PATH}`);
const XLSX = await import('xlsx');
const workbook = XLSX.readFile(FILE_PATH);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

// ── 2. Parse rows ──
const MONTH_RE = /^jan|^feb|^mar|^apr|^may|^jun|^jul|^aug|^sep|^oct|^nov|^dec/i;
const MONTH_NAMES = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const MONTH_COLS = ['jan_quantity','feb_quantity','mar_quantity','apr_quantity','may_quantity','jun_quantity','jul_quantity','aug_quantity','sep_quantity','oct_quantity','nov_quantity','dec_quantity'];

// Find month column indices
let subHdrRow = -1, monthIdx = [];
for (let r = 0; r < rows.length; r++) {
  let found = 0;
  for (const c of rows[r]) { if (MONTH_RE.test(String(c ?? '').trim())) found++; }
  if (found >= 6) {
    subHdrRow = r;
    for (let c = 0; c < rows[r].length; c++) {
      const cell = String(rows[r][c] ?? '').toLowerCase().trim();
      const mi = MONTH_NAMES.findIndex(m => cell === m || cell.startsWith(m));
      if (mi >= 0) monthIdx[mi] = c;
    }
    break;
  }
}
if (subHdrRow < 0) { console.error('ERROR: Could not find month columns'); process.exit(1); }

// Find code/name/unit/price columns
const subHdr = rows[subHdrRow];
let codeCol = 1, nameCol = 2, unitCol = 3, priceCol = -1;
for (let c = 0; c < subHdr.length; c++) {
  const cell = String(subHdr[c] ?? '').toLowerCase();
  if (/code|barcode/i.test(cell)) codeCol = c;
  if (/item|description|spec/i.test(cell)) nameCol = c;
  if (/^unit/i.test(cell)) unitCol = c;
}
if (subHdrRow > 0) {
  const mainHdr = rows[subHdrRow - 1];
  for (let c = 0; c < mainHdr.length; c++) {
    if (/unit\s*price|cost/i.test(String(mainHdr[c] ?? '').toLowerCase())) { priceCol = c; break; }
  }
}

// ── 3. Category detection ──
// Exact category list from the official APP-CSE 2026 form (Part I)
const OFFICIAL_CATEGORIES = [
  'ALCOHOL OR ACETONE BASED ANTISEPTICS',
  'ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES',
  'AUDIO AND VISUAL EQUIPMENT AND SUPPLIES',
  'BATTERIES AND CELLS AND ACCESSORIES',
  'CLEANING EQUIPMENT AND SUPPLIES',
  'COLOR COMPOUNDS AND DISPERSIONS',
  'CONSUMER ELECTRONICS',
  'FILMS',
  'FIRE FIGHTING EQUIPMENT',
  'FLAG OR ACCESSORIES',
  'FURNITURE AND FURNISHINGS',
  'HEATING AND VENTILATION AND AIR CIRCULATION',
  'INFORMATION AND COMMUNICATION TECHNOLOGY (ICT) EQUIPMENT AND DEVICES AND ACCESSORIES',
  'LIGHTING AND FIXTURES AND ACCESSORIES',
  'MANUFACTURING COMPONENTS AND SUPPLIES',
  'MEASURING AND OBSERVING AND TESTING EQUIPMENT',
  'OFFICE EQUIPMENT AND ACCESSORIES AND SUPPLIES',
  'PAPER MATERIALS AND PRODUCTS',
  'PERFUMES OR COLOGNES OR FRAGRANCES',
  'PESTICIDES OR PEST REPELLENTS',
  'PRINTED PUBLICATIONS',
  'PRINTER OR FACSIMILE OR PHOTOCOPIER SUPPLIES (CONSUMABLES)',
  'SOFTWARE',
  'AIRLINE TICKETS',
  'MOTOR VEHICLE',
  'CLOUD COMPUTING SERVICES',
];

// Map row text → official category name
const CATEGORY_MAP = {};
for (const official of OFFICIAL_CATEGORIES) {
  // "FILMS" matches rows that say "FILMS"
  // "MOTOR VEHICLE" matches rows that start with "MOTOR VEHICLE"
  CATEGORY_MAP[official.toLowerCase()] = official;
}

// Non-product patterns to skip
const SKIP_RE = /^(date\s+prepared|department|bureau|office|region|organization|contact|position|address|e-?mail|telephone|mobile|agency|fund|prepared|supply|accountant|property|total|grand|monthly|unit\s+of|unit\s+price|for\s+the|as\s+of|item\s*&|introduction|reminder|note|annual|common|ps-dbm|head|certified|consistent|please|approved|engr\.|ocs|we\s+hereby)/i;
const SKIP_EXACT = /^(a\.|b\.|c\.|d\.|e\.)\s/i;
const isUuid = s => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s);

// ── 4. Parse items ──
let curCat = '';
let inPart2 = false;
const categories = new Set();
const items = [];

for (let r = subHdrRow + 1; r < rows.length; r++) {
  const row = rows[r];
  const full = row.map(c => String(c ?? '').trim()).join(' ');
  if (!full.trim()) continue;

  // PART markers
  if (/\bPART\s+II\b/i.test(full)) { inPart2 = true; curCat = 'PART II - OTHER ITEMS'; continue; }
  if (/\bPART\s+I(?!I)/i.test(full)) { inPart2 = false; curCat = ''; continue; }

  // Category detection — match against official list
  const uniq = [...new Set(row.map(c => String(c ?? '').trim()).filter(Boolean))];
  if (uniq.length >= 1 && uniq.length <= 3) {
    const text = uniq.find(s => {
      if (s.length <= 5 || /^\d+$/.test(s)) return false;
      if (/^[A-Z0-9]{2,15}[-][A-Z0-9]{2,10}/.test(s)) return false;
      if (SKIP_RE.test(s) || SKIP_EXACT.test(s)) return false;
      return true;
    });
    if (text) {
      // Try to match against official categories
      const clean = text.replace(/\(Note:[^)]*\)/gi, '').trim();
      const lower = clean.toLowerCase();
      // Check if it matches or starts with an official category
      const match = OFFICIAL_CATEGORIES.find(c => lower === c.toLowerCase() || lower.startsWith(c.toLowerCase().substring(0, 10)));
      if (match) {
        curCat = match;
        categories.add(match);
      } else if (/^[A-Z][A-Z\s,&\-()\/\.]+$/.test(clean) || /^[A-Z][A-Za-z]/.test(clean)) {
        // Fuzzy: try first word match
        const firstWord = lower.split(/\s/)[0];
        const fuzzy = OFFICIAL_CATEGORIES.find(c => c.toLowerCase().startsWith(firstWord));
        if (fuzzy) {
          curCat = fuzzy;
          categories.add(fuzzy);
        } else {
          curCat = clean;
          categories.add(clean);
        }
      }
      continue;
    }
  }

  // Read item fields
  const name = String(row[nameCol] ?? '').trim();
  if (!name || name.length < 2) continue;
  if (SKIP_RE.test(name) || SKIP_EXACT.test(name)) continue;
  if (/^\d{4,5}$/.test(name)) continue; // date serial
  if (isUuid(String(row[codeCol] ?? ''))) continue;

  const code = String(row[codeCol] ?? '').trim();
  const unit = String(row[unitCol] ?? '').trim() || 'pcs';

  // Monthly quantities
  const monthly = {};
  for (let m = 0; m < 12; m++) {
    const ci = monthIdx[m];
    let v = 0;
    if (ci != null) {
      const raw = row[ci];
      v = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(/[^0-9.,-]/g, '').replace(/,/g, '')) || 0;
    }
    monthly[MONTH_COLS[m]] = v;
  }

  let price = 0;
  if (priceCol >= 0) {
    const raw = row[priceCol];
    price = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(/[^0-9.,-]/g, '').replace(/,/g, '')) || 0;
  }

  const totalQty = Object.values(monthly).reduce((s, v) => s + v, 0);

  items.push({
    name,
    code: code || null,
    unit,
    category: curCat || (inPart2 ? 'PART II - OTHER ITEMS' : 'PS-DBM SUPPLIES'),
    part: inPart2 ? 2 : 1,
    quantity: totalQty,
    acquisition_cost: price,
    ...monthly,
  });
}

console.log(`Parsed ${items.length} items, ${categories.size} categories`);

// ── 5. Import into PostgreSQL ──
const sql = postgres(DB_URL, { max: 5, connect_timeout: 15 });

try {
  await sql.unsafe('BEGIN');

  // Create categories
  let catCreated = 0;
  for (const catName of categories) {
    const r = await sql.unsafe(
      `INSERT INTO categories (name) SELECT $1 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = $1) RETURNING id`,
      [catName]
    );
    if (r.length) catCreated++;
  }
  console.log(`Categories: ${catCreated} created, ${categories.size - catCreated} existed`);

  // Create items in batch
  let itemCreated = 0, itemSkipped = 0, itemErrors = 0;

  for (const item of items) {
    try {
      const isPart1 = item.part === 1;
      const barcode = isPart1 ? item.code : null;
      const desc = isPart1 ? null : (item.code ? `[${item.code}] ${item.name}` : null);

      // Duplicate check
      let exists;
      if (barcode) {
        exists = await sql.unsafe('SELECT 1 FROM items WHERE barcode_value = $1', [barcode]);
      } else {
        exists = await sql.unsafe('SELECT 1 FROM items WHERE name = $1 AND barcode_value IS NULL', [item.name]);
      }
      if (exists.length) { itemSkipped++; continue; }

      // Get category_id
      let catId = null;
      const catRow = await sql.unsafe('SELECT id FROM categories WHERE name = $1', [item.category]);
      if (catRow.length) catId = catRow[0].id;

      await sql.unsafe(
        `INSERT INTO items (name, description, category_id, item_type, quantity, unit, acquisition_cost, barcode_value,
         jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity,
         jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity)
         VALUES ($1,$2,$3,'supply',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        [item.name, desc, catId, item.quantity, item.unit, item.acquisition_cost, barcode,
         item.jan_quantity, item.feb_quantity, item.mar_quantity, item.apr_quantity,
         item.may_quantity, item.jun_quantity, item.jul_quantity, item.aug_quantity,
         item.sep_quantity, item.oct_quantity, item.nov_quantity, item.dec_quantity]
      );
      itemCreated++;
    } catch (e) {
      itemErrors++;
      console.error(`  [ERROR] ${item.name}: ${e.message}`);
    }
  }

  await sql.unsafe('COMMIT');

  // ── 6. Verification ──
  console.log('\n=== Migration Complete ===');
  console.log(`Created: ${itemCreated}, Skipped: ${itemSkipped}, Errors: ${itemErrors}`);

  const [cats] = await sql`SELECT COUNT(*) as c FROM categories`;
  const [total] = await sql`SELECT COUNT(*) as c FROM items`;
  const [p1] = await sql`SELECT COUNT(*) as c FROM items WHERE barcode_value IS NOT NULL`;
  const [p2] = await sql`SELECT COUNT(*) as c FROM items WHERE barcode_value IS NULL`;

  console.log('\n=== Verification ===');
  console.log(`Categories in DB: ${cats.c}`);
  console.log(`Total items in DB: ${total.c}`);
  console.log(`Part I (with barcode): ${p1.c}`);
  console.log(`Part II (without barcode): ${p2.c}`);

} catch (e) {
  await sql.unsafe('ROLLBACK');
  console.error('MIGRATION FAILED:', e.message);
} finally {
  await sql.end();
}
