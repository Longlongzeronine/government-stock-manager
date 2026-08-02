import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('scripts/app-cse-data.json', 'utf-8'));

const FALSE_CATS = ['Approved by:', 'ENGR. JENY E. BUSCANO', 'Head of Office/Agency'];
const cleanCat = (c) => {
  if (FALSE_CATS.includes(c)) return 'OTHER ITEMS';
  if (c.startsWith('MOTOR VEHICLE')) return 'MOTOR VEHICLE';
  return c;
};

const validCats = [...new Set(data.categories.filter(c => !FALSE_CATS.includes(c) && !c.startsWith('MOTOR VEHICLE')))];
validCats.push('MOTOR VEHICLE');

const isReal = (i) => !/^(Approved by|ENGR\.|Head of Office|Date Prepared)/i.test(i.name) && !/^\d{4,5}$/.test(i.name);
const items = data.items.filter(isReal);

const esc = (s) => String(s || '').replace(/'/g, "''");

let sql = `-- APP-CSE 2026 Migration Script\n-- Generated: ${new Date().toISOString()}\n\n`;
sql += `CREATE EXTENSION IF NOT EXISTS pgcrypto;\n\n`;

// Categories
sql += `-- Categories (${validCats.length})\n`;
for (const c of validCats) {
  sql += `INSERT INTO categories (name) SELECT '${esc(c)}' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '${esc(c)}');\n`;
}

// Items
sql += `\n-- Items (${items.length})\n`;
for (const i of items) {
  const cat = cleanCat(i.category);
  const isP1 = i.part === 1;
  const bc = isP1 ? i.code : null;
  const desc = isP1 ? null : (i.code ? `[${i.code}] ${i.name}` : null);
  const months = [i.jan_quantity,i.feb_quantity,i.mar_quantity,i.apr_quantity,i.may_quantity,i.jun_quantity,i.jul_quantity,i.aug_quantity,i.sep_quantity,i.oct_quantity,i.nov_quantity,i.dec_quantity];
  
  const whereClause = bc 
    ? `name = '${esc(i.name)}' AND barcode_value = '${esc(bc)}'` 
    : `name = '${esc(i.name)}' AND barcode_value IS NULL`;
  
  sql += `INSERT INTO items (name, description, category_id, item_type, quantity, unit, acquisition_cost, barcode_value, jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity, jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity) SELECT '${esc(i.name)}', ${desc ? `'${esc(desc)}'` : 'NULL'}, (SELECT id FROM categories WHERE name = '${esc(cat)}'), 'supply', ${i.quantity}, '${esc(i.unit)}', ${i.acquisition_cost}, ${bc ? `'${esc(bc)}'` : 'NULL'}, ${months.join(', ')} WHERE NOT EXISTS (SELECT 1 FROM items WHERE ${whereClause});\n`;
}

writeFileSync('scripts/migrate-app-cse.sql', sql);
console.log(`SQL file created: scripts/migrate-app-cse.sql`);
console.log(`Categories: ${validCats.length}`);
console.log(`Items: ${items.length}`);
