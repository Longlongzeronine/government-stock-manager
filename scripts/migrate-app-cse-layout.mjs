import fs from "node:fs";
import postgres from "postgres";

const databaseUrl = fs.readFileSync(new URL("../.env", import.meta.url), "utf8").match(/^DATABASE_URL=(.+)$/m)?.[1];
if (!databaseUrl) throw new Error("DATABASE_URL missing from .env");

const sql = postgres(databaseUrl);
const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

try {
  for (const month of months) {
    await sql.unsafe(`ALTER TABLE items ADD COLUMN IF NOT EXISTS ${month}_quantity NUMERIC(12,2) NOT NULL DEFAULT 0`);
  }
  const result = await sql`
    UPDATE items
    SET jan_quantity = quantity
    WHERE jan_quantity = 0 AND quantity <> 0
  `;
  console.log(JSON.stringify({ addedMonthlyColumns: months.length, seededJanuaryFromCurrentStock: result.count }));
} finally {
  await sql.end({ timeout: 5 });
}
