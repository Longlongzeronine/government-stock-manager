#!/usr/bin/env node
/**
 * Apply a .sql migration file to the HOSTED Supabase Postgres.
 *
 * Supabase JS / PostgREST cannot run raw DDL, so connect straight to the
 * hosted database with psql-style statements over the postgres.js driver.
 *
 * Connection: SUPABASE_DB_URL in .env, e.g.
 *   SUPABASE_DB_URL=postgresql://postgres:<DB-PASSWORD>@db.pogmvgqfirovujjwgaqi.supabase.co:5432/postgres
 * (Dashboard -> Project Settings -> Database -> Connection string -> URI.)
 *
 * Usage: node scripts/apply-hosted-sql.mjs <file.sql> [<file2.sql> ...]
 */

import { readFileSync } from "fs";
import postgres from "postgres";

const envFile = readFileSync(new URL("../.env", import.meta.url), "utf8");
const readEnv = (key) =>
  envFile.match(new RegExp(`^${key}=(.+)$`, "m"))?.[1]?.trim();

const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (files.length === 0) {
  console.error("Usage: node scripts/apply-hosted-sql.mjs <file.sql> [...]");
  process.exit(1);
}

const dbUrl = process.env.SUPABASE_DB_URL || readEnv("SUPABASE_DB_URL");
if (!dbUrl) {
  console.error(
    "SUPABASE_DB_URL is missing. Add it to .env:\n" +
      "  SUPABASE_DB_URL=postgresql://postgres:<DB-PASSWORD>@db.pogmvgqfirovujjwgaqi.supabase.co:5432/postgres\n" +
      "(Supabase dashboard -> Project Settings -> Database -> Connection string -> URI)",
  );
  process.exit(1);
}

const sql = postgres(dbUrl, { max: 1, ssl: "require", connect_timeout: 20 });

let failed = 0;
for (const file of files) {
  const content = readFileSync(file, "utf8");
  // Strip line comments, then split on semicolons at line end.
  const cleaned = content
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
  const statements = cleaned
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  console.log(`${file}: ${statements.length} statement(s)`);
  for (const stmt of statements) {
    try {
      await sql.unsafe(stmt);
      console.log(`  ok: ${stmt.slice(0, 80).replace(/\s+/g, " ")}...`);
    } catch (error) {
      failed += 1;
      console.error(`  FAIL: ${stmt.slice(0, 120)}`);
      console.error(`        ${error.message}`);
    }
  }
}

await sql.end();
process.exit(failed > 0 ? 1 : 0);
