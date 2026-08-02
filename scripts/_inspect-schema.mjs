// TEMP: inspect actual schema of existing tables + categories
import postgres from "postgres";
const url = "postgres://postgres:FJ%40zeronine11%2B@localhost:5433/government_stock_manager";
const sql = postgres(url, { max: 3, connect_timeout: 5 });
try {
  for (const t of ["categories", "suppliers", "items", "reports", "user_roles"]) {
    const cols = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=${t}
      ORDER BY ordinal_position
    `;
    console.log(`\n=== ${t} ===`);
    console.log(cols.map((c) => `  ${c.column_name} ${c.data_type}${c.is_nullable === "NO" ? " NOT NULL" : ""}${c.column_default ? " DEFAULT " + c.column_default : ""}`).join("\n"));
  }
  const cats = await sql`SELECT name, description FROM categories ORDER BY name`;
  console.log("\nCATEGORIES (" + cats.length + "):");
  console.log(cats.map((c) => `  - ${c.name}${c.description ? ` [${c.description}]` : ""}`).join("\n"));
  const suppliers = await sql`SELECT name FROM suppliers`;
  console.log("\nSUPPLIERS:", suppliers.map((s) => s.name).join(" | "));
} catch (e) {
  console.log("ERR:", e.message);
} finally {
  await sql.end({ timeout: 1 }).catch(() => {});
}
