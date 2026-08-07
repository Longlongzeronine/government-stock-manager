import { getSql } from "../src/lib/local-db.ts";

const sql = getSql();
try {
  const result = await sql`DELETE FROM items`;
  console.log(`Deleted ${result.count} items`);
} catch (e) {
  console.error("Error:", e);
}
process.exit(0);
