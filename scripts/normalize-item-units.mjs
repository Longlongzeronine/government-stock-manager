import fs from "node:fs";
import postgres from "postgres";

const databaseUrl = fs.readFileSync(new URL("../.env", import.meta.url), "utf8").match(/^DATABASE_URL=(.+)$/m)?.[1];
if (!databaseUrl) throw new Error("DATABASE_URL missing from .env");

const sql = postgres(databaseUrl);
const aliases = {
  pc: "pieces", pcs: "pieces", piece: "pieces", pieces: "pieces", each: "pieces", ea: "pieces",
  gal: "gallon", gallon: "gallon", gallons: "gallon",
  btl: "bottle", bottle: "bottle", bottles: "bottle",
  pkt: "pack", packs: "pack", box: "box", boxes: "box", set: "set", sets: "set",
  roll: "roll", rolls: "roll", ream: "ream", reams: "ream", unit: "unit", units: "unit",
  ticket: "ticket", tickets: "ticket",
};

function unitFor(value, name) {
  const unit = String(value ?? "").trim().toLowerCase();
  const product = String(name ?? "").toLowerCase();
  if (!unit || /^\d+(\.\d+)?$/.test(unit)) {
    if (/air conditioning|air cooler/.test(product)) return "unit";
    if (/ticket/.test(product)) return "ticket";
    return "pieces";
  }
  return aliases[unit] || unit;
}

try {
  const rows = await sql`SELECT id, name, unit FROM items`;
  let updated = 0;
  for (const item of rows) {
    const unit = unitFor(item.unit, item.name);
    if (unit !== item.unit) {
      await sql`UPDATE items SET unit = ${unit} WHERE id = ${item.id}`;
      updated += 1;
    }
  }
  console.log(JSON.stringify({ checked: rows.length, updated }));
} finally {
  await sql.end({ timeout: 5 });
}
