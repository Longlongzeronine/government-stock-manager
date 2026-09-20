// TEMP inspection script: DB state + Excel structure
import fs from "node:fs";
import postgres from "postgres";
import XLSX from "xlsx";

const databaseUrl = fs
  .readFileSync(new URL("../.env", import.meta.url), "utf8")
  .match(/^DATABASE_URL=(.+)$/m)?.[1]
  ?.trim();

if (!databaseUrl) {
  console.log("NO DATABASE_URL in .env, using fallback");
}

const sql = postgres(databaseUrl || "postgres://postgres:postgres@localhost:5432/government_stock_manager", {
  max: 3,
  connect_timeout: 5,
});

try {
  // ── DB state ──
  const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
  console.log("TABLES:", tables.map((t) => t.tablename).join(", "));

  for (const t of ["categories", "suppliers", "items", "transactions", "audit_logs", "iar_forms", "ris_forms", "ics_forms", "par_forms"]) {
    try {
      const [r] = await sql`SELECT count(*)::int as c FROM ${sql(t)}`;
      console.log(`count ${t}:`, r.c);
    } catch (e) {
      console.log(`count ${t}: ERROR`, e.message);
    }
  }

  const sample = await sql`SELECT name, barcode_value, category_id, quantity, unit, acquisition_cost FROM items LIMIT 5`;
  console.log("sample items:", JSON.stringify(sample, null, 1));

  const cats = await sql`SELECT name FROM categories ORDER BY name`;
  console.log("categories:", cats.map((c) => c.name).join(" | "));
} catch (e) {
  console.log("DB ERROR:", e.message);
} finally {
  await sql.end({ timeout: 2 }).catch(() => {});
}

// ── Excel structure ──
const wb = XLSX.readFile("C:/Users/Francis/Downloads/APP_CSE_Template_2026.xlsx");
console.log("\nSHEETS:", wb.SheetNames);
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  console.log(`\n=== SHEET "${name}" range: ${ws["!ref"]}`);
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  console.log("total rows:", rows.length);

  // Dump the header rows in full
  for (const r of [29, 30]) {
    const row = rows[r] || [];
    console.log(`\nHEADER R${r}:`);
    row.forEach((c, i) => {
      if (String(c).trim() !== "") console.log(`  col${i}: ${JSON.stringify(c)}`);
    });
  }

  // Dump a representative Part I item row and a Part II item row in full
  for (const r of [33, 199, 289, 379, 382, 383, 387, 390]) {
    const row = rows[r] || [];
    const cells = row.map((c, i) => (String(c).trim() !== "" ? `${i}:${JSON.stringify(c)}` : "")).filter(Boolean);
    if (cells.length) console.log(`\nROW R${r} (${cells.length} cells): ${cells.join("  |  ")}`);
  }
}
