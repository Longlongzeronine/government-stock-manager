import fs from "node:fs";
import postgres from "postgres";

const databaseUrl = fs
  .readFileSync(new URL("../.env", import.meta.url), "utf8")
  .match(/^DATABASE_URL=(.+)$/m)?.[1];

if (!databaseUrl) throw new Error("DATABASE_URL missing from .env");

const products = [
  ["12191601-AL-E04", "ALCOHOL, Ethyl, 500 mL", "bottle", 44, 55.62, "ALCOHOL OR ACETONE BASED ANTISEPTICS"],
  ["12191601-AL-E03", "ALCOHOL, Ethyl, 1 Gallon", "gallon", 0, 362.45, "ALCOHOL OR ACETONE BASED ANTISEPTICS"],
  ["60121413-CB-P01", "CLEARBOOK, A4 size", "piece", 20, 35.52, "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121413-CB-P02", "CLEARBOOK, Legal size", "piece", 8, 38.23, "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121534-ER-P01", "ERASER, plastic/rubber", "piece", 0, 9.34, "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121524-SP-G01", "SIGN PEN, Extra Fine Tip, Black", "piece", 20, 27.11, "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121524-SP-G02", "SIGN PEN, Extra Fine Tip, Blue", "piece", 15, 27.11, "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121524-SP-G03", "SIGN PEN, Extra Fine Tip, Red", "piece", 0, 27.11, "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121524-SP-G04", "SIGN PEN, Fine Tip, Black", "piece", 20, 30.91, "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121524-SP-G05", "SIGN PEN, Fine Tip, Blue", "piece", 20, 30.91, "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121524-SP-G06", "SIGN PEN, Fine Tip, Red", "piece", 0, 30.91, "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121524-SP-G07", "SIGN PEN, Medium Tip, Black", "piece", 48, 63.62, "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121524-SP-G08", "SIGN PEN, Medium Tip, Blue", "piece", 48, 63.62, "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121524-SP-G09", "SIGN PEN, Medium Tip, Red", "piece", 8, 63.62, "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121124-WR-P01", "WRAPPING PAPER", "pack", 3, 163.62, "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
];

const sql = postgres(databaseUrl);

try {
  let inserted = 0;
  let existing = 0;
  await sql.begin(async (tx) => {
    for (const [code, name, unit, quantity, cost, categoryName] of products) {
      const [category] = await tx`
        SELECT id FROM categories WHERE name = ${categoryName} ORDER BY created_at LIMIT 1
      `;
      const categoryId = category?.id ?? (await tx`
        INSERT INTO categories (name, description)
        VALUES (${categoryName}, 'PS-DBM APP-CSE 2026')
        RETURNING id
      `)[0].id;
      const description = `APP-CSE 2026 | PS-DBM code: ${code}`;
      const [match] = await tx`
        SELECT id FROM items WHERE name = ${name} AND description = ${description} LIMIT 1
      `;
      if (match) {
        existing += 1;
        continue;
      }
      await tx`
        INSERT INTO items (name, description, category_id, item_type, quantity, unit, reorder_level, acquisition_cost)
        VALUES (${name}, ${description}, ${categoryId}, 'supply', ${quantity}, ${unit}, 0, ${cost})
      `;
      inserted += 1;
    }
  });
  console.log(JSON.stringify({ inserted, existing, total: products.length }));
} finally {
  await sql.end({ timeout: 5 });
}
