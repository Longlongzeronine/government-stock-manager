/**
 * Repair the live DB to exactly match the APP-CSE 2026 file:
 *   - DELETE junk items that the app's importXlsx parser minted (FILMS category header,
 *     "45891" date-prepared footer) — they are NOT file items.
 *   - INSERT the two file Part II items the parser dropped (MOBILE PHONE, OFFICE CHAIR)
 *     because SKIP_NAMES matched "office"/"mobile" as form labels.
 * The DB trigger no longer auto-assigns barcodes (fixed earlier), so new Part II items
 * keep barcode_value = NULL.
 */
import postgres from "postgres";
import { readFileSync } from "fs";

let dbUrl = "postgres://postgres:postgres@localhost:5433/government_stock_manager";
try {
  const env = readFileSync(".env", "utf8");
  const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
  const port = env.match(/^DB_PORT=(.+)$/m)?.[1]?.trim();
  if (url) dbUrl = port ? url.replace(/:\d+\//, `:${port}/`) : url;
} catch {}
console.log(`DB: ${dbUrl.replace(/:[^:@]+@/, ":***@")}`);

const sql = postgres(dbUrl, { max: 3, connect_timeout: 15 });

try {
  // ── 1. Delete junk items (must be barcode-less and match junk signature) ──
  const [deletedFilms] = await sql`
    DELETE FROM items
    WHERE name = 'FILMS' AND barcode_value IS NULL AND (description IS NULL OR description = '')
    RETURNING id
  `;
  const [deleted45891] = await sql`
    DELETE FROM items
    WHERE name = '45891' AND barcode_value IS NULL AND description ILIKE '%Date Prepared%'
    RETURNING id
  `;
  console.log(`Deleted junk: FILMS=${deletedFilms?.id ? 1 : 0}, 45891=${deleted45891?.id ? 1 : 0}`);

  // ── 2. Insert missing Part II items (skip if they already exist by name, barcode NULL) ──
  const inserts = [
    { code: "80141505-TS-034", name: "MOBILE PHONE", unit: "unit" },
    { code: "80141505-TS-030", name: "OFFICE CHAIR", unit: "piece" },
  ];
  let inserted = 0;
  for (const it of inserts) {
    const [existing] = await sql`SELECT id FROM items WHERE name = ${it.name} AND barcode_value IS NULL`;
    if (existing) { console.log(`  already present: ${it.name}`); continue; }
    const [cat] = await sql`SELECT id FROM categories WHERE name = 'PART II - OTHER ITEMS'`;
    const desc = `[${it.code}] ${it.name}`;
    const nextSort = Number((await sql`SELECT COALESCE(MAX(sort_order), 0) AS m FROM items`)[0].m) + 1;
    const [insertedRow] = await sql`
      INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level,
        acquisition_cost, barcode_value, inventory_classification, semi_expendable_tier,
        jan_quantity, feb_quantity, mar_quantity, apr_quantity, may_quantity, jun_quantity,
        jul_quantity, aug_quantity, sep_quantity, oct_quantity, nov_quantity, dec_quantity, sort_order)
      VALUES (${it.name}, ${desc}, ${cat?.id || null}, 'supply', 0, ${it.unit}, 10, 0, NULL,
        'semi_expendable_property', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ${nextSort})
      RETURNING id
    `;
    await sql`UPDATE items SET qr_code_value = 'ITEM:' || id::text WHERE id = ${insertedRow.id}`;
    inserted += 1;
    console.log(`  inserted: ${it.name} (${it.code})`);
  }

  // ── 3. Verify ──
  const [p1] = await sql`SELECT COUNT(*)::int c FROM items WHERE barcode_value IS NOT NULL`;
  const [p2] = await sql`SELECT COUNT(*)::int c FROM items WHERE barcode_value IS NULL`;
  const [total] = await sql`SELECT COUNT(*)::int c FROM items`;
  const mp = await sql`SELECT name, barcode_value, sort_order FROM items WHERE name IN ('MOBILE PHONE','OFFICE CHAIR') ORDER BY name`;
  const junk = await sql`SELECT name FROM items WHERE name IN ('FILMS','45891')`;
  console.log(`\n=== RESULT ===`);
  console.log(`Part I: ${p1.c} | Part II: ${p2.c} | total: ${total.c}`);
  console.log("MP/OC:", JSON.stringify(mp));
  console.log("remaining junk:", JSON.stringify(junk));
  console.log(`Inserted this run: ${inserted}`);
} catch (e) {
  console.error("ERROR:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
