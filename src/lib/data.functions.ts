import { createServerFn } from "@tanstack/react-start";

import {
  getRestConfig,
  getRestWriteConfig,
  isWorkersRuntime,
  sbDelete,
  sbInsert,
  sbRpc,
  sbSelect,
  sbUpdate,
} from "@/lib/supabase-rest";
import { classifyInventoryItem } from "@/lib/item-classification";

let localSchemaReady: Promise<void> | null = null;

// Helper to get local DB on the server
async function getDb() {
  const { ensureSchema, getSql } = await import("@/lib/local-db");
  localSchemaReady ??= ensureSchema().then(() => undefined);
  await localSchemaReady;
  return getSql();
}

/**
 * Run `local` (direct Postgres) first; on the deployed Worker that connection
 * fails, so fall back to hosted Supabase over HTTPS (`remote`).
 * Read handlers pass a remote fallback; write handlers too, so the online
 * site keeps working while local dev keeps using Postgres directly.
 *
 * NOTE: on Workers, skip the local attempt entirely — ensureSchema() would
 * retry a dead localhost connection for ~30s per request before the fallback
 * ever runs (that's the "still empty / timeout" behaviour).
 */
async function withDbFallback<T>(
  local: (sql: any) => Promise<T>,
  remote: () => Promise<T>,
): Promise<T> {
  if (isWorkersRuntime()) {
    return remote();
  }
  try {
    const sql = await getDb();
    return await local(sql);
  } catch (error) {
    // Do not replay writes against hosted Supabase for validation, unique, or
    // business-rule failures from a reachable local DB. Fallback only when the
    // local PostgreSQL connection itself is unavailable.
    if (!getRestConfig() || !isLocalDatabaseUnavailable(error)) throw error;
    try {
      return await remote();
    } catch (remoteError) {
      console.error(
        "local db failed, supabase fallback also failed:",
        remoteError,
      );
      throw error;
    }
  }
}

function isLocalDatabaseUnavailable(error: unknown) {
  const value = error as { code?: string; message?: string };
  return Boolean(
    value?.code && (/^08/.test(value.code) || ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EHOSTUNREACH"].includes(value.code))
    || /connect(?:ion)? (?:refused|timeout|terminated)|connection closed unexpectedly|econnrefused|etimedout|ehostunreach|proxy request failed,?\s*cannot connect to the specified address/i.test(value?.message || ""),
  );
}

function cleanBarcode(row: any) {
  return row?.barcode_value && String(row.barcode_value) === String(row.id)
    ? null
    : (row?.barcode_value ?? null);
}

function withCategorySupplier(row: any) {
  return {
    ...row,
    barcode_value: cleanBarcode(row),
    category: row.category?.id
      ? { id: row.category.id, name: row.category.name }
      : null,
    supplier: row.supplier?.id
      ? { id: row.supplier.id, name: row.supplier.name }
      : null,
  };
}

async function fetchCategoriesById(ids: string[]) {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return new Map<string, any>();
  const rows = await sbSelect(
    "categories",
    `select=id,name&id=in.(${uniq.join(",")})`,
  );
  return new Map(rows.map((c: any) => [String(c.id), c]));
}

async function fetchSuppliersById(ids: string[]) {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return new Map<string, any>();
  const rows = await sbSelect(
    "suppliers",
    `select=id,name&id=in.(${uniq.join(",")})`,
  );
  return new Map(rows.map((s: any) => [String(s.id), s]));
}

async function resolveHostedCategoryId(categoryId: unknown, categoryName: unknown) {
  const id = String(categoryId || "").trim();
  const name = String(categoryName || "").trim();
  if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    const matches = await sbSelect("categories", `select=id&id=eq.${encodeURIComponent(id)}&limit=1`);
    if (matches.length) return String(matches[0].id);
  }
  if (!name) return null;
  const matches = await sbSelect("categories", `select=id,name&name=ilike.${encodeURIComponent(name)}&limit=2000`);
  const existing = matches.find((category: any) => String(category.name || "").trim().toLocaleLowerCase() === name.toLocaleLowerCase());
  if (existing) return String(existing.id);
  try {
    const created = await sbInsert("categories", { name }, getRestWriteConfig());
    return String((created as any).id);
  } catch (error) {
    // A concurrent category creation may win between lookup and insert.
    const refreshed = await sbSelect("categories", `select=id,name&name=ilike.${encodeURIComponent(name)}&limit=2000`);
    const raced = refreshed.find((category: any) => String(category.name || "").trim().toLocaleLowerCase() === name.toLocaleLowerCase());
    if (raced) return String(raced.id);
    throw error;
  }
}

async function attachCategorySupplier(rows: any[]) {
  const cats = await fetchCategoriesById(
    rows.map((r: any) => String(r.category_id || "")),
  );
  const sups = await fetchSuppliersById(
    rows.map((r: any) => String(r.supplier_id || "")),
  );
  return rows.map((r: any) =>
    withCategorySupplier({
      ...r,
      category: r.category_id
        ? (cats.get(String(r.category_id)) ?? null)
        : null,
      supplier: r.supplier_id
        ? (sups.get(String(r.supplier_id)) ?? null)
        : null,
    }),
  );
}

async function ensureItemCodes(sql: any) {
  await sql`
    UPDATE items
    SET qr_code_value = 'ITEM:' || id::text
    WHERE qr_code_value IS NULL OR btrim(qr_code_value) = ''
  `;
}

async function nextStockNumber(sql: any) {
  const [row] = await sql`
    SELECT COALESCE(MAX(NULLIF(stock_number, '')::INTEGER), 0) + 1 AS next_number
    FROM items
    WHERE stock_number ~ '^[0-9]+$'
  `;
  return String(Number(row?.next_number || 1)).padStart(3, "0");
}

async function ensureLocalStockNumbers(sql: any) {
  await sql.begin(async (tx: any) => {
    await tx`SELECT pg_advisory_xact_lock(hashtextextended('inventory-stock-number-sequence', 0))`;
    const missing = await tx`
      SELECT id FROM items
      WHERE stock_number IS NULL OR btrim(stock_number) = ''
      ORDER BY sort_order ASC NULLS LAST, created_at ASC, id
      FOR UPDATE
    `;
    for (const item of missing) {
      const stockNumber = await nextStockNumber(tx);
      await tx`UPDATE items SET stock_number = ${stockNumber} WHERE id = ${item.id}`;
    }
  });
}

function assignMissingStockNumbers(rows: any[]) {
  const numbered = rows.map((row) => ({ ...row }));
  const highest = numbered.reduce((max, row) => {
    const value = String(row.stock_number || "").trim();
    return /^\d+$/.test(value) ? Math.max(max, Number(value)) : max;
  }, 0);
  let next = highest + 1;
  const missing = numbered
    .filter((row) => !String(row.stock_number || "").trim())
    .sort((a, b) =>
      (Number(a.sort_order ?? Number.MAX_SAFE_INTEGER) - Number(b.sort_order ?? Number.MAX_SAFE_INTEGER)) ||
      String(a.created_at || "").localeCompare(String(b.created_at || "")) ||
      String(a.id).localeCompare(String(b.id)),
    );
  for (const row of missing) {
    row.stock_number = String(next++).padStart(3, "0");
  }
  return { numbered, missing };
}

// ============================================
// ITEMS
// ============================================

function normalizeUnit(value: unknown, itemName = "") {
  const unit = String(value ?? "").trim().toLowerCase();
  const name = itemName.toLowerCase();
  if (!unit || /^\d+(\.\d+)?$/.test(unit)) {
    if (/air conditioning|air cooler/.test(name)) return "unit";
    if (/ticket/.test(name)) return "ticket";
    return "pieces";
  }
  const aliases: Record<string, string> = {
    pc: "pieces", pcs: "pieces", piece: "pieces", pieces: "pieces", each: "pieces", ea: "pieces",
    gal: "gallon", gallon: "gallon", gallons: "gallon",
    btl: "bottle", bottle: "bottle", bottles: "bottle",
    pkt: "pack", packs: "pack", box: "box", boxes: "box", set: "set", sets: "set",
    roll: "roll", rolls: "roll", ream: "ream", reams: "ream", unit: "unit", units: "unit",
    ticket: "ticket", tickets: "ticket",
  };
  return aliases[unit] || unit;
}

export const listItems = createServerFn({ method: "GET" }).handler(async () => {
  return withDbFallback(
    async (sql) => {
      await ensureItemCodes(sql);
      await ensureLocalStockNumbers(sql);
      const rows = await sql`
        SELECT
          i.*,
          row_to_json(c.*) AS category,
          row_to_json(s.*) AS supplier
        FROM items i
        LEFT JOIN categories c ON c.id = i.category_id
        LEFT JOIN suppliers s ON s.id = i.supplier_id
        ORDER BY i.sort_order ASC NULLS LAST, i.name ASC
      `;
      return rows.map((r: any) => ({
        ...r,
        barcode_value: r.barcode_value && String(r.barcode_value) === String(r.id) ? null : r.barcode_value,
        category: r.category?.id
          ? { id: r.category.id, name: r.category.name }
          : null,
        supplier: r.supplier?.id
          ? { id: r.supplier.id, name: r.supplier.name }
          : null,
      }));
    },
    async () => {
      const rows = await sbSelect(
        "items",
        "select=*,category:categories(id,name),supplier:suppliers(id,name)&order=name.asc&limit=2000",
      );
      const { numbered, missing } = assignMissingStockNumbers(rows);
      if (missing.length > 0) {
        try {
          await sbRpc("ensure_stock_numbers", {
            p_item_ids: missing.map((item) => item.id),
          });
          const refreshedRows = await sbSelect(
            "items",
            "select=*,category:categories(id,name),supplier:suppliers(id,name)&order=name.asc&limit=2000",
          );
          return refreshedRows.map((r: any) => withCategorySupplier(r));
        } catch (error) {
          // Older hosted projects may not have the repair RPC yet. Fall back
          // to writing the stable generated numbers directly below.
          console.warn("Stock number RPC unavailable; repairing item rows via REST:", error);
        }
      }
      for (const item of missing) {
        try {
          await sbUpdate(
            "items",
            `id=eq.${encodeURIComponent(item.id)}`,
            { stock_number: item.stock_number },
            getRestWriteConfig(),
          );
        } catch (error) {
          // Keep generated number visible in this response even if a hosted
          // deployment has not granted the REST key permission to repair rows.
          console.error(`Unable to save stock number for item ${item.id}:`, error);
        }
      }
      return numbered.map((r: any) => withCategorySupplier(r));
    },
  ).catch((e: any) => {
    console.error("listItems error:", e);
    return [];
  });
});

export const getItem = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    return withDbFallback(
      async (sql) => {
        const value = data.id.trim();
        const withoutPrefix = value.replace(/^ITEM:/i, "");
        const [row] = await sql`
          SELECT i.*,
            row_to_json(c.*) AS category,
            row_to_json(s.*) AS supplier
          FROM items i
          LEFT JOIN categories c ON c.id = i.category_id
          LEFT JOIN suppliers s ON s.id = i.supplier_id
          WHERE i.id::text = ${withoutPrefix}
             OR i.barcode_value = ${withoutPrefix}
             OR i.qr_code_value = ${value}
          LIMIT 1
        `;
        if (!row) return null;
        return {
          ...row,
          barcode_value: row.barcode_value && String(row.barcode_value) === String(row.id) ? null : row.barcode_value,
          category: row.category?.id
            ? { id: row.category.id, name: row.category.name }
            : null,
          supplier: row.supplier?.id
            ? { id: row.supplier.id, name: row.supplier.name }
            : null,
        };
      },
      async () => {
        const value = data.id.trim();
        const withoutPrefix = value.replace(/^ITEM:/i, "").replace(/'/g, "");
        const rows = await sbSelect(
          "items",
          `select=*,category:categories(id,name),supplier:suppliers(id,name)&or=(id.eq.${encodeURIComponent(withoutPrefix)},barcode_value.eq.${encodeURIComponent(withoutPrefix)},qr_code_value.eq.${encodeURIComponent(value)})&limit=1`,
        );
        if (!rows.length) return null;
        return withCategorySupplier(rows[0]);
      },
    );
  });

function itemWritePayload(data: any, extra: Record<string, unknown> = {}) {
  // Inventory is the base record: derive the classification from type + cost so
  // the Forms Flow tabs (Supplies / Semi-Expendable / PPE) stay in sync, even on
  // hosted Supabase where the auto-classify trigger may be absent.
  const classification = classifyInventoryItem(
    data.item_type,
    data.acquisition_cost,
  );
  return {
    name: data.name,
    description: data.description ?? null,
    category_id: data.category_id || null,
    supplier_id: data.supplier_id || null,
    item_type: data.item_type || "supply",
    inventory_classification:
      data.inventory_classification ?? classification.inventory_classification,
    semi_expendable_tier:
      data.semi_expendable_tier ?? classification.semi_expendable_tier,
    quantity: Number(data.quantity) || 0,
    unit: normalizeUnit(data.unit, data.name),
    reorder_level: Number(data.reorder_level) || 10,
    acquisition_cost: Number(data.acquisition_cost) || 0,
    barcode_value: data.barcode_value || null,
    qr_code_value: data.qr_code_value || null,
    stock_number: data.stock_number || null,
    jan_quantity: Number(data.jan_quantity) || 0,
    feb_quantity: Number(data.feb_quantity) || 0,
    mar_quantity: Number(data.mar_quantity) || 0,
    apr_quantity: Number(data.apr_quantity) || 0,
    may_quantity: Number(data.may_quantity) || 0,
    jun_quantity: Number(data.jun_quantity) || 0,
    jul_quantity: Number(data.jul_quantity) || 0,
    aug_quantity: Number(data.aug_quantity) || 0,
    sep_quantity: Number(data.sep_quantity) || 0,
    oct_quantity: Number(data.oct_quantity) || 0,
    nov_quantity: Number(data.nov_quantity) || 0,
    dec_quantity: Number(data.dec_quantity) || 0,
    ...extra,
  };
}

const itemMonthlyQuantityFields = [
  "jan_quantity", "feb_quantity", "mar_quantity", "apr_quantity",
  "may_quantity", "jun_quantity", "jul_quantity", "aug_quantity",
  "sep_quantity", "oct_quantity", "nov_quantity", "dec_quantity",
];

function omitItemMonthlyQuantities(payload: Record<string, unknown>) {
  const result = { ...payload };
  for (const field of itemMonthlyQuantityFields) delete result[field];
  return result;
}

function missingItemColumn(error: unknown) {
  const match = String((error as Error)?.message || error).match(
    /Could not find the '([^']+)' column/i,
  );
  return match?.[1] || null;
}

async function sbInsertWithOptionalColumns<T = any>(
  table: string,
  row: Record<string, unknown>,
  optionalColumns: readonly string[],
  writeCfg: { url: string; key: string } | null = null,
): Promise<T> {
  let payload = { ...row };
  const optional = new Set(optionalColumns);
  for (;;) {
    try {
      return await sbInsert<T>(table, payload, writeCfg);
    } catch (error) {
      const column = missingItemColumn(error);
      if (!column || !optional.delete(column)) throw error;
      delete payload[column];
    }
  }
}

function omitUnsupportedItemColumn(
  payload: Record<string, unknown>,
  column: string,
) {
  if (itemMonthlyQuantityFields.includes(column))
    return omitItemMonthlyQuantities(payload);
  const result = { ...payload };
  delete result[column];
  return result;
}

export const createItem = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const name = String(data.name || "").trim();
    if (!name) throw new Error("Item name is required.");
    const itemData = {
      ...data,
      name,
      description: String(data.description || "").trim() || null,
    };
    return withDbFallback(
      async (sql) => {
        return sql.begin(async (tx: any) => {
          await tx`SELECT pg_advisory_xact_lock(hashtextextended(
            lower(btrim(${itemData.name})) || '|' || lower(btrim(coalesce(${itemData.description}, ''))), 0
          ))`;
          const [duplicate] = await tx`
            SELECT id FROM items
            WHERE lower(btrim(name)) = lower(btrim(${itemData.name}))
              AND lower(btrim(coalesce(description, ''))) = lower(btrim(coalesce(${itemData.description}, '')))
            LIMIT 1
          `;
          if (duplicate) throw new Error("Matching inventory item already exists. Select or edit the existing item to avoid a duplicate master record.");
          const [maxRow] = await tx`SELECT COALESCE(MAX(sort_order), 0) AS m FROM items`;
          const nextSort = Number(maxRow.m) + 1;
          await tx`SELECT pg_advisory_xact_lock(hashtextextended('inventory-stock-number-sequence', 0))`;
          const [row] = await tx`
            INSERT INTO items ${tx(itemWritePayload(itemData, { stock_number: itemData.stock_number || await nextStockNumber(tx), sort_order: nextSort }))}
            RETURNING *
          `;
          const [codedRow] = await tx`
            UPDATE items
            SET qr_code_value = COALESCE(NULLIF(btrim(qr_code_value), ''), 'ITEM:' || id::text)
            WHERE id = ${row.id}
            RETURNING *
          `;
          return codedRow;
        });
      },
      async () => {
        const writeCfg = getRestWriteConfig();
        const matches = await sbSelect("items", `select=id,name,description&name=ilike.${encodeURIComponent(itemData.name)}&limit=2000`);
        if (matches.some((item: any) => String(item.name || "").trim().toLocaleLowerCase() === itemData.name.toLocaleLowerCase() && String(item.description || "").trim().toLocaleLowerCase() === String(itemData.description || "").trim().toLocaleLowerCase())) {
          throw new Error("Matching inventory item already exists. Select or edit the existing item to avoid a duplicate master record.");
        }
        const hostedCategoryId = await resolveHostedCategoryId(itemData.category_id, itemData.category_name);
        let payload: Record<string, unknown> = itemWritePayload({ ...itemData, category_id: hostedCategoryId });
        let monthlyQuantitiesSaved = true;
        let legacySchemaUsed = false;
        let created: any;
        const optionalHostedColumns = new Set([
          ...itemMonthlyQuantityFields,
          "stock_number",
          "qr_code_value",
          "inventory_classification",
          "semi_expendable_tier",
        ]);
        // Keep Add new item usable while a hosted project catches up with app
        // migrations. Each retry removes only a known optional app field.
        for (;;) {
          try {
            created = await sbInsert("items", payload, writeCfg);
            break;
          } catch (error) {
            const column = missingItemColumn(error);
            if (!column || !optionalHostedColumns.has(column)) throw error;
            if (itemMonthlyQuantityFields.includes(column))
              monthlyQuantitiesSaved = false;
            legacySchemaUsed = true;
            payload = omitUnsupportedItemColumn(payload, column);
          }
        }
        let updated: any[] = [];
        if (!("qr_code_value" in payload)) {
          const qr = (created as any).qr_code_value?.trim()
            ? (created as any).qr_code_value
            : `ITEM:${(created as any).id}`;
          updated = await sbUpdate("items", `id=eq.${(created as any).id}`, {
            qr_code_value: qr,
          }, writeCfg);
        }
        return {
          ...(updated[0] ?? created),
          monthlyQuantitiesSaved,
          legacySchemaUsed,
        };
      },
    );
  });

export const importItems = createServerFn({ method: "POST" })
  .inputValidator((d: { items: any[] }) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const existing = await sql`SELECT id, name, barcode_value FROM items ORDER BY (barcode_value IS NOT NULL) DESC, name ASC`;
    const names = new Map<string, { id: string | null; barcode: string | null; description: string | null }>();
    const codes = new Map<string, { id: string | null; name: string; description: string | null }>();
    for (const item of existing as any[]) {
      const nameKey = String(item.name).trim().toLowerCase();
      const barcode = String(item.barcode_value || "").trim();
      if (!names.has(nameKey)) names.set(nameKey, { id: item.id, barcode: barcode || null, description: item.description || null });
      if (barcode && !codes.has(barcode.toLowerCase())) codes.set(barcode.toLowerCase(), { id: item.id, name: String(item.name).trim(), description: item.description || null });
    }
    let added = 0;
    let skipped = 0;
    let updated = 0;
    let nextSort = Number((await sql`SELECT COALESCE(MAX(sort_order), 0) AS m FROM items`)[0].m) + 1;

    const payload = (item: any, name: string, barcode: string | null, categoryId: string | null, existingDescription: string | null) => ({
      name,
      description: item.description ? String(item.description).trim() : existingDescription,
      category_id: categoryId,
      item_type: item.item_type || "supply",
      quantity: Number(item.quantity) || 0,
      unit: normalizeUnit(item.unit, name),
      reorder_level: Number(item.reorder_level) || 10,
      acquisition_cost: Number(item.acquisition_cost) || 0,
      barcode_value: barcode,
      jan_quantity: Number(item.jan_quantity) || 0,
      feb_quantity: Number(item.feb_quantity) || 0,
      mar_quantity: Number(item.mar_quantity) || 0,
      apr_quantity: Number(item.apr_quantity) || 0,
      may_quantity: Number(item.may_quantity) || 0,
      jun_quantity: Number(item.jun_quantity) || 0,
      jul_quantity: Number(item.jul_quantity) || 0,
      aug_quantity: Number(item.aug_quantity) || 0,
      sep_quantity: Number(item.sep_quantity) || 0,
      oct_quantity: Number(item.oct_quantity) || 0,
      nov_quantity: Number(item.nov_quantity) || 0,
      dec_quantity: Number(item.dec_quantity) || 0,
    });
    const isUuidCode = (c: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c);

    for (const item of data.items || []) {
      const name = String(item.name || "").trim();
      const barcode = String(item.barcode_value || "").trim();
      const nameKey = name.toLowerCase();
      const codeKey = barcode.toLowerCase();
      if (!name) {
        skipped += 1;
        continue;
      }

      let categoryId: string | null = null;
      if (item.category_name) {
        const catName = String(item.category_name).trim();
        if (catName) {
          let [cat] = await sql`SELECT id FROM categories WHERE LOWER(name) = ${catName.toLowerCase()}`;
          if (!cat) {
            [cat] = await sql`INSERT INTO categories (name) VALUES (${catName}) RETURNING id`;
          }
          categoryId = cat?.id || null;
        }
      }

      if (codeKey) {
        const existingByCode = codes.get(codeKey);
        if (existingByCode?.id) {
          await sql`UPDATE items SET ${sql(payload(item, name, barcode, categoryId, existingByCode.description))} WHERE id = ${existingByCode.id}`;
          updated += 1;
          continue;
        }
        if (existingByCode) {
          skipped += 1;
          continue;
        }
      } else {
        const existingMatch = names.get(nameKey);
        if (existingMatch) {
          if (existingMatch.id && (!existingMatch.barcode || isUuidCode(existingMatch.barcode))) {
            await sql`UPDATE items SET ${sql(payload(item, name, null, categoryId, existingMatch.description))} WHERE id = ${existingMatch.id}`;
            updated += 1;
          } else {
            skipped += 1;
          }
          continue;
        }
      }

      await sql`
        INSERT INTO items ${sql({
          ...payload(item, name, barcode || null, categoryId, null),
          stock_number: await nextStockNumber(sql),
          sort_order: nextSort,
        })}
      `;
      nextSort += 1;
      if (!names.has(nameKey)) names.set(nameKey, { id: null, barcode: barcode || null, description: item.description || null });
      if (codeKey) codes.set(codeKey, { id: null, name, description: item.description || null });
      added += 1;
    }

    await sql`
      UPDATE items SET barcode_value = NULL
      WHERE barcode_value = id::text
        AND barcode_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    `;
    return { added, skipped, updated };
  });

export const updateItem = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    return withDbFallback(
      async (sql) => {
        const classification = classifyInventoryItem(
          data.item_type,
          data.acquisition_cost,
        );
        const [row] = await sql`
          UPDATE items SET ${sql({
            name: data.name,
            description: data.description ?? null,
            category_id: data.category_id || null,
            supplier_id: data.supplier_id || null,
            item_type: data.item_type || "supply",
            inventory_classification:
              data.inventory_classification ?? classification.inventory_classification,
            semi_expendable_tier:
              data.semi_expendable_tier ?? classification.semi_expendable_tier,
            quantity: Number(data.quantity) || 0,
            unit: data.unit || "pcs",
            reorder_level: Number(data.reorder_level) || 10,
            acquisition_cost: Number(data.acquisition_cost) || 0,
            barcode_value: data.barcode_value || null,
            qr_code_value: data.qr_code_value || null,
            jan_quantity: Number(data.jan_quantity) || 0,
            feb_quantity: Number(data.feb_quantity) || 0,
            mar_quantity: Number(data.mar_quantity) || 0,
            apr_quantity: Number(data.apr_quantity) || 0,
            may_quantity: Number(data.may_quantity) || 0,
            jun_quantity: Number(data.jun_quantity) || 0,
            jul_quantity: Number(data.jul_quantity) || 0,
            aug_quantity: Number(data.aug_quantity) || 0,
            sep_quantity: Number(data.sep_quantity) || 0,
            oct_quantity: Number(data.oct_quantity) || 0,
            nov_quantity: Number(data.nov_quantity) || 0,
            dec_quantity: Number(data.dec_quantity) || 0,
          })}
          WHERE id = ${data.id}
          RETURNING *
        `;
        return row;
      },
      async () => {
        const writeCfg = getRestWriteConfig();
        const classification = classifyInventoryItem(
          data.item_type,
          data.acquisition_cost,
        );
        const hostedCategoryId = await resolveHostedCategoryId(data.category_id, data.category_name);
        const payload: Record<string, unknown> = {
          name: data.name,
          description: data.description ?? null,
          category_id: hostedCategoryId,
          supplier_id: data.supplier_id || null,
          item_type: data.item_type || "supply",
          inventory_classification:
            data.inventory_classification ?? classification.inventory_classification,
          semi_expendable_tier:
            data.semi_expendable_tier ?? classification.semi_expendable_tier,
          quantity: Number(data.quantity) || 0,
          unit: data.unit || "pcs",
          reorder_level: Number(data.reorder_level) || 10,
          acquisition_cost: Number(data.acquisition_cost) || 0,
          barcode_value: data.barcode_value || null,
          qr_code_value: data.qr_code_value || null,
        };
        const optionalHostedColumns = new Set([
          "inventory_classification",
          "semi_expendable_tier",
        ]);
        for (;;) {
          try {
            const [row] = await sbUpdate(
              "items",
              `id=eq.${data.id}`,
              payload,
              writeCfg,
            );
            return row;
          } catch (error) {
            const column = missingItemColumn(error);
            if (!column || !optionalHostedColumns.has(column)) throw error;
            optionalHostedColumns.delete(column);
            delete payload[column];
          }
        }
      },
    );
  });

const monthColumns = ["jan_quantity", "feb_quantity", "mar_quantity", "apr_quantity", "may_quantity", "jun_quantity", "jul_quantity", "aug_quantity", "sep_quantity", "oct_quantity", "nov_quantity", "dec_quantity"] as const;

export const updateItemMonthlyQuantity = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; month: number; quantity: number }) => d)
  .handler(async ({ data }) => {
    const column = monthColumns[data.month];
    if (!column) throw new Error("Invalid month");
    const sql = await getDb();
    const [row] = await sql`
      UPDATE items SET ${sql({ [column]: Math.max(0, Number(data.quantity) || 0) })}
      WHERE id = ${data.id}
      RETURNING *
    `;
    return row;
  });

export const deleteItem = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    return withDbFallback(
      async (sql) => {
        return sql.begin(async (tx: any) => {
          await tx`SELECT id FROM items WHERE id = ${data.id} FOR UPDATE`;
          const [refs] = await tx`
            SELECT
              EXISTS(SELECT 1 FROM transactions WHERE item_id = ${data.id})
              OR EXISTS(SELECT 1 FROM iar_items WHERE item_id = ${data.id})
              OR EXISTS(SELECT 1 FROM ris_items WHERE item_id = ${data.id})
              OR EXISTS(SELECT 1 FROM ics_items WHERE item_id = ${data.id})
              OR EXISTS(SELECT 1 FROM par_items WHERE item_id = ${data.id})
              OR EXISTS(SELECT 1 FROM accountability_events WHERE item_id = ${data.id})
              OR EXISTS(SELECT 1 FROM splc_entries WHERE item_id = ${data.id}) AS referenced
          `;
          if (refs?.referenced) throw new Error("Item has transaction history and cannot be deleted. Historical records are preserved.");
          await tx`DELETE FROM items WHERE id = ${data.id}`;
          return { ok: true };
        });
      },
      async () => {
        try {
          return await sbRpc("delete_unused_inventory_item", { target_item_id: data.id });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          // Older hosted projects may not have applied the RPC migration yet.
          // Fall back to FK-protected REST delete; never bypass history constraints.
          if (!/delete_unused_inventory_item.*(schema cache|could not find the function)/i.test(message)) {
            throw error;
          }
          await sbDelete("items", `id=eq.${encodeURIComponent(data.id)}`, getRestWriteConfig());
          return { ok: true };
        }
      },
    );
  });

// Post header, receipt lines, stock transactions and balances atomically.
export const postIar = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => withDbFallback(
    async (sql) => sql.begin(async (tx: any) => {
      const [form] = await tx`
        INSERT INTO iar_forms ${tx({
          iar_no: data.iar_no, supplier: data.supplier || null,
          invoice_no: data.invoice_no || null, accepted_by: data.accepted_by || null,
          form_data: data.form_data || {},
          created_by: data.created_by || null, created_by_name: data.created_by_name || null,
        })} RETURNING *
      `;
      for (const line of data.lines ?? []) {
        const quantity = Number(line.quantity);
        const unitCost = Number(line.unit_cost || 0);
        if (!line.item_id || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitCost) || unitCost < 0) throw new Error("Each IAR item needs an item, positive quantity, and nonnegative unit cost.");
        const [item] = await tx`SELECT id, stock_number FROM items WHERE id = ${line.item_id} FOR UPDATE`;
        if (!item) throw new Error("Selected inventory item was not found.");
        if (!String(item.stock_number || "").trim()) {
          // Serialize number allocation across concurrent IAR posts. Existing
          // numbers (including suffixes such as 001A) remain attached to item.
          await tx`SELECT pg_advisory_xact_lock(hashtextextended('inventory-stock-number-sequence', 0))`;
          const stockNumber = await nextStockNumber(tx);
          await tx`UPDATE items SET stock_number = ${stockNumber} WHERE id = ${item.id}`;
        }
        const remarks = [`IAR ${data.iar_no}`, line.product_description ? `Description: ${line.product_description}` : "", data.supplier ? `Supplier: ${data.supplier}` : "", data.invoice_no ? `Invoice: ${data.invoice_no}` : "", unitCost ? `Unit Cost: PHP ${unitCost.toFixed(2)}` : "", line.remarks || ""].filter(Boolean).join(" | ");
        const [transaction] = await tx`INSERT INTO transactions ${tx({
          item_id: line.item_id, type: "IN", quantity, staff_id: data.created_by || null,
          staff_name: data.created_by_name || null, source_form_type: "IAR", source_form_id: form.id,
          remarks, product_description: line.product_description || null,
        })} RETURNING *`;
        // The transactions AFTER INSERT trigger is the single balance writer.
        await tx`INSERT INTO iar_items ${tx({
          iar_id: form.id, item_id: line.item_id, quantity,
          product_description: line.product_description || null,
          unit_cost: unitCost, amount: quantity * unitCost,
          remarks: line.remarks || null, transaction_id: transaction.id,
        })}`;
      }
      return form;
    }),
    async () => {
      try {
        const result = await sbRpc("post_iar", { payload: data });
        const itemIds = [...new Set((data.lines ?? []).map((line: any) => String(line.item_id || "")).filter(Boolean))];
        try {
          await sbRpc("ensure_stock_numbers", { p_item_ids: itemIds });
        } catch (error) {
          // Older hosted projects may not have the repair RPC until the stock
          // number migration is applied. Do not report a posted IAR as failed.
          console.error("IAR posted, but stock number repair failed:", error);
        }
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/post_iar.*schema cache|schema cache.*post_iar/i.test(message)) {
          throw new Error(
            "IAR posting is unavailable: hosted Supabase is missing post_iar(payload). Apply supabase/migrations/20261011000000_atomic_iar_posting.sql in the Supabase SQL Editor, then reload the schema cache.",
          );
        }
        throw error;
      }
    },
  ));

// ============================================
// CATEGORIES
// ============================================

export const listCategories = createServerFn({ method: "GET" }).handler(
  async () => {
    return withDbFallback(
      async (sql) => await sql`SELECT * FROM categories ORDER BY name ASC`,
      async () =>
        sbSelect("categories", "select=*&order=name.asc&limit=2000"),
    ).catch(() => []);
  },
);

export const createCategory = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    return withDbFallback(
      async (sql) => {
        const [row] = await sql`
          INSERT INTO categories ${sql({ name: data.name, description: data.description || null })}
          RETURNING *
        `;
        return row;
      },
      async () => sbInsert("categories", { name: data.name, description: data.description || null }, getRestWriteConfig()),
    );
  });

export const updateCategory = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const [row] = await sql`
      UPDATE categories SET ${sql({ name: data.name, description: data.description ?? null })}
      WHERE id = ${data.id}
      RETURNING *
    `;
    return row;
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    await sql`DELETE FROM categories WHERE id = ${data.id}`;
    return { ok: true };
  });

// ============================================
// SUPPLIERS
// ============================================

export const listSuppliers = createServerFn({ method: "GET" }).handler(
  async () => {
    return withDbFallback(
      async (sql) => await sql`SELECT * FROM suppliers ORDER BY name ASC`,
      async () =>
        sbSelect("suppliers", "select=*&order=name.asc&limit=2000"),
    ).catch(() => []);
  },
);

export const createSupplier = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const [row] = await sql`
      INSERT INTO suppliers ${sql({
        name: data.name,
        contact: data.contact || null,
        address: data.address || null,
        notes: data.notes || null,
      })}
      RETURNING *
    `;
    return row;
  });

export const updateSupplier = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const [row] = await sql`
      UPDATE suppliers SET ${sql({
        name: data.name,
        contact: data.contact ?? null,
        address: data.address ?? null,
        notes: data.notes ?? null,
      })}
      WHERE id = ${data.id}
      RETURNING *
    `;
    return row;
  });

export const deleteSupplier = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    await sql`DELETE FROM suppliers WHERE id = ${data.id}`;
    return { ok: true };
  });

export const listTransactions = createServerFn({ method: "GET" })
  .inputValidator((d: { limit?: number } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    return withDbFallback(
      async (sql) => {
        const limit = data?.limit ?? 200;
        const rows = await sql`
          SELECT
            t.*,
            row_to_json(i.*) AS item
          FROM transactions t
          LEFT JOIN items i ON i.id = t.item_id
          ORDER BY t.created_at DESC
          LIMIT ${limit}
        `;
        return rows.map((r: any) => ({
          ...r,
          item: r.item?.id
            ? { id: r.item.id, name: r.item.name, unit: r.item.unit }
            : null,
        }));
      },
      async () => {
        const limit = data?.limit ?? 200;
        const rows = await sbSelect(
          "transactions",
          `select=*,item:items(id,name,unit)&order=created_at.desc&limit=${limit}`,
        );
        return rows.map((r: any) => ({
          ...r,
          item: r.item?.id
            ? { id: r.item.id, name: r.item.name, unit: r.item.unit }
            : null,
        }));
      },
    ).catch(() => []);
  });

export const listTransactionsAsc = createServerFn({ method: "GET" })
  .inputValidator((d: { limit?: number } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    return withDbFallback(
      async (sql) => {
        const limit = data?.limit ?? 5000;
        const rows = await sql`
          SELECT
            t.*,
            row_to_json(i.*) AS item
          FROM transactions t
          LEFT JOIN items i ON i.id = t.item_id
          ORDER BY t.created_at ASC
          LIMIT ${limit}
        `;
        return rows.map((r: any) => ({
          ...r,
          item: r.item?.id
            ? {
                id: r.item.id,
                name: r.item.name,
                description: r.item.description,
                unit: r.item.unit,
                quantity: r.item.quantity,
                acquisition_cost: r.item.acquisition_cost,
                inventory_classification: r.item.inventory_classification,
                semi_expendable_tier: r.item.semi_expendable_tier,
              }
            : null,
        }));
      },
      async () => {
        const limit = data?.limit ?? 5000;
        const rows = await sbSelect(
          "transactions",
          `select=*,item:items(id,name,description,unit,quantity,acquisition_cost,inventory_classification,semi_expendable_tier)&order=created_at.asc&limit=${limit}`,
        );
        return rows.map((r: any) => ({
          ...r,
          item: r.item?.id
            ? {
                id: r.item.id,
                name: r.item.name,
                description: r.item.description,
                unit: r.item.unit,
                quantity: r.item.quantity,
                acquisition_cost: r.item.acquisition_cost,
                inventory_classification: r.item.inventory_classification,
                semi_expendable_tier: r.item.semi_expendable_tier,
              }
            : null,
        }));
      },
    ).catch(() => []);
  });

export const createTransaction = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const quantity = Number(data.quantity);
    const availableFromStockCard = (itemQuantity: number, movements: any[]) => {
      const netMovement = movements
        .filter((movement) => {
          const source = String(movement.source_form_type || "").toUpperCase();
          const reference = String(movement.remarks || "").split("|")[0].trim().toUpperCase();
          return source === "IAR" || source === "RIS" || reference.startsWith("IAR ") || reference.startsWith("RIS ");
        })
        .reduce((sum, movement) => sum + (movement.type === "IN" ? Number(movement.quantity) : -Number(movement.quantity)), 0);
      return Math.max(0, itemQuantity - netMovement) + netMovement;
    };
    return withDbFallback(
      async (sql) => sql.begin(async (tx: any) => {
        const [item] = await tx`
          SELECT quantity FROM items WHERE id = ${data.item_id} FOR UPDATE
        `;
        if (!item) throw new Error("Inventory item was not found.");
        const stockCardTransactions = data.type === "OUT" && data.source_form_type === "RIS"
          ? await tx`SELECT type, quantity, source_form_type, remarks FROM transactions WHERE item_id = ${data.item_id}`
          : [];
        const available = data.source_form_type === "RIS"
          ? availableFromStockCard(Number(item.quantity), stockCardTransactions)
          : Number(item.quantity);
        if (data.type === "OUT" && available < quantity) {
          throw new Error(`Only ${available} units are available.`);
        }
        const [row] = await tx`
          INSERT INTO transactions ${tx({
            item_id: data.item_id,
            type: data.type,
            quantity,
            staff_id: data.staff_id || null,
            staff_name: data.staff_name || null,
            remarks: data.remarks || null,
            source_form_type: data.source_form_type || null,
            source_form_id: data.source_form_id || null,
          })}
          RETURNING *
        `;
        // The transactions AFTER INSERT trigger is the sole balance writer.
        return row;
      }),
      async () => {
        const [item] = await sbSelect(
          "items",
          `select=id,quantity&id=eq.${encodeURIComponent(data.item_id)}&limit=1`,
        );
        if (!item) throw new Error("Inventory item was not found.");
        const stockCardTransactions = data.type === "OUT" && data.source_form_type === "RIS"
          ? await sbSelect<any>(
              "transactions",
              `select=type,quantity,source_form_type,remarks&item_id=eq.${encodeURIComponent(data.item_id)}&limit=5000`,
            )
          : [];
        const available = data.source_form_type === "RIS"
          ? availableFromStockCard(Number(item.quantity), stockCardTransactions)
          : Number(item.quantity);
        if (data.type === "OUT" && available < quantity) {
          throw new Error(`Only ${available} units are available.`);
        }
        return sbInsert("transactions", {
          item_id: data.item_id,
          type: data.type,
          quantity,
          staff_id: data.staff_id || null,
          staff_name: data.staff_name || null,
          remarks: data.remarks || null,
          source_form_type: data.source_form_type || null,
          source_form_id: data.source_form_id || null,
        }, getRestWriteConfig());
      },
    );
  });

// ============================================
// AUDIT LOGS
// ============================================

export const listAuditLogs = createServerFn({ method: "GET" }).handler(
  async () => withDbFallback(
    async (sql) => sql`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500`,
    async () => sbSelect(
      "audit_logs",
      "select=*&order=created_at.desc&limit=500",
    ),
  ),
);

// ============================================
// FORMS (IAR, RIS, ICS, PAR)
// ============================================

export const listIarForms = createServerFn({ method: "GET" }).handler(
  async () => {
    return withDbFallback(
      async (sql) => await sql`
        SELECT id, iar_no, form_data FROM iar_forms ORDER BY created_at DESC
      `,
      async () => await sbSelect(
        "iar_forms",
        "select=id,iar_no,form_data&order=created_at.desc&limit=5000",
      ),
    ).catch(() => []);
  },
);

export const getIarFormDetails = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => withDbFallback(
    async (sql) => {
      const [form] = await sql`
        SELECT
          f.*,
          COALESCE(
            json_agg(json_build_object(
              'id', ii.id,
              'item_id', ii.item_id,
              'quantity', ii.quantity,
              'unit_cost', ii.unit_cost,
              'product_description', ii.product_description,
              'remarks', ii.remarks,
              'item', json_build_object(
                'id', i.id,
                'name', i.name,
                'description', i.description,
                'unit', i.unit,
                'acquisition_cost', i.acquisition_cost
              )
            )) FILTER (WHERE ii.id IS NOT NULL),
            '[]'::json
          ) AS lines
        FROM iar_forms f
        LEFT JOIN iar_items ii ON ii.iar_id = f.id
        LEFT JOIN items i ON i.id = ii.item_id
        WHERE f.id = ${data.id}
        GROUP BY f.id
      `;
      return form || null;
    },
    async () => {
      const [form] = await sbSelect<any>(
        "iar_forms",
        `select=id,iar_no,supplier,invoice_no,accepted_by,form_data&id=eq.${encodeURIComponent(data.id)}&limit=1`,
      );
      if (!form) return null;
      const lines = await sbSelect<any>(
        "iar_items",
        `select=id,item_id,quantity,unit_cost,product_description,remarks,item:items(id,name,description,unit,acquisition_cost)&iar_id=eq.${encodeURIComponent(data.id)}&order=created_at.asc&limit=1000`,
      );
      return { ...form, lines };
    },
  ));

export const getRisFormDetails = createServerFn({ method: "GET" })
  .inputValidator((data: { id?: string; ris_no?: string }) => data)
  .handler(async ({ data }) => {
    if (!data.id && !data.ris_no) throw new Error("RIS ID or number is required.");
    return withDbFallback(
      async (sql) => {
        const [form] = data.id
          ? await sql`
              SELECT
                r.id, r.ris_no, r.office, r.purpose,
                r.requested_by, r.approved_by, r.issued_by, r.received_by,
                to_char(r.approved_date, 'YYYY-MM-DD') AS approved_date,
                to_char(r.issued_date, 'YYYY-MM-DD') AS issued_date,
                r.verification_token, r.verification_code,
                r.verification_status, r.verification_published_at,
                r.status, r.created_at::text AS created_at,
                COALESCE(
                  json_agg(json_build_object(
                    'id', ri.id,
                    'item_id', ri.item_id,
                    'quantity', ri.quantity,
                    'remarks', ri.remarks,
                    'item', json_build_object(
                      'id', i.id,
                      'name', i.name,
                      'description', i.description,
                      'unit', i.unit,
                      'stock_number', i.stock_number
                    )
                  ) ORDER BY ri.created_at) FILTER (WHERE ri.id IS NOT NULL),
                  '[]'::json
                ) AS lines
              FROM ris_forms r
              LEFT JOIN ris_items ri ON ri.ris_id = r.id
              LEFT JOIN items i ON i.id = ri.item_id
              WHERE r.id = ${data.id}
              GROUP BY r.id
            `
          : await sql`
              SELECT
                r.id, r.ris_no, r.office, r.purpose,
                r.requested_by, r.approved_by, r.issued_by, r.received_by,
                to_char(r.approved_date, 'YYYY-MM-DD') AS approved_date,
                to_char(r.issued_date, 'YYYY-MM-DD') AS issued_date,
                r.verification_token, r.verification_code,
                r.verification_status, r.verification_published_at,
                r.status, r.created_at::text AS created_at,
                COALESCE(
                  json_agg(json_build_object(
                    'id', ri.id,
                    'item_id', ri.item_id,
                    'quantity', ri.quantity,
                    'remarks', ri.remarks,
                    'item', json_build_object(
                      'id', i.id,
                      'name', i.name,
                      'description', i.description,
                      'unit', i.unit,
                      'stock_number', i.stock_number
                    )
                  ) ORDER BY ri.created_at) FILTER (WHERE ri.id IS NOT NULL),
                  '[]'::json
                ) AS lines
              FROM ris_forms r
              LEFT JOIN ris_items ri ON ri.ris_id = r.id
              LEFT JOIN items i ON i.id = ri.item_id
              WHERE r.ris_no = ${data.ris_no}
              GROUP BY r.id
            `;
        return form || null;
      },
      async () => {
        const [form] = await sbSelect<any>(
          "ris_forms",
          data.id
            ? `select=*&id=eq.${encodeURIComponent(data.id)}&limit=1`
            : `select=*&ris_no=eq.${encodeURIComponent(data.ris_no || "")}&limit=1`,
        );
        if (!form) return null;
        const lines = await sbSelect<any>(
          "ris_items",
          `select=id,item_id,quantity,remarks,item:items(id,name,description,unit,stock_number)&ris_id=eq.${encodeURIComponent(form.id)}&order=created_at.asc&limit=1000`,
        );
        return {
          id: form.id,
          ris_no: form.ris_no,
          office: form.office,
          purpose: form.purpose,
          requested_by: form.requested_by,
          approved_by: form.approved_by,
          issued_by: form.issued_by,
          received_by: form.received_by,
          approved_date: form.approved_date ?? null,
          issued_date: form.issued_date ?? null,
          verification_token: form.verification_token ?? null,
          verification_code: form.verification_code ?? null,
          verification_status: form.verification_status ?? null,
          verification_published_at: form.verification_published_at ?? null,
          status: form.status,
          created_at: form.created_at,
          fund_cluster: form.fund_cluster ?? null,
          lines,
        };
      },
    );
  });

// Downloadable, read-only snapshot of data used by Forms Flow. Keep table names
// static: local SQL uses these directly and hosted Supabase reads same allowlist.
export const createFormsFlowBackup = createServerFn({ method: "GET" }).handler(
  async () => {
    const tables = [
      "categories",
      "suppliers",
      "items",
      "transactions",
      "iar_forms",
      "iar_items",
      "ris_forms",
      "ris_items",
      "form_personnel_memory",
      "form_number_counters",
    ] as const;

    return withDbFallback(
      async (sql) => Object.fromEntries(await Promise.all(
        tables.map(async (table) => [
          table,
          await sql.unsafe(`SELECT * FROM public."${table}"`),
        ] as const),
      )),
      async () => Object.fromEntries(await Promise.all(
        tables.map(async (table) => [
          table,
          await sbSelect(table, "select=*&limit=10000"),
        ] as const),
      )),
    );
  },
);

export const createIarForm = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const [row] = await sql`
      INSERT INTO iar_forms ${sql({
        iar_no: data.iar_no,
        supplier: data.supplier || null,
        invoice_no: data.invoice_no || null,
        accepted_by: data.accepted_by || null,
        created_by: data.created_by || null,
        created_by_name: data.created_by_name || null,
      })}
      RETURNING *
    `;
    return row;
  });

export const createIarItem = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const [row] = await sql`
      INSERT INTO iar_items ${sql({
        iar_id: data.iar_id,
        item_id: data.item_id,
        quantity: Number(data.quantity),
        unit_cost: Number(data.unit_cost || 0),
        amount:
          Number(data.amount) ||
          Number(data.quantity) * Number(data.unit_cost || 0),
        remarks: data.remarks || null,
        transaction_id: data.transaction_id || null,
      })}
      RETURNING *
    `;
    return row;
  });

export const createRisForm = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const payload = {
        ris_no: data.ris_no,
        office: data.office || null,
        purpose: data.purpose || null,
        requested_by: data.requested_by || null,
        approved_by: data.approved_by || null,
        issued_by: data.issued_by || null,
        received_by: data.received_by || null,
        approved_date: data.approved_date || null,
        issued_date: data.issued_date || null,
        verification_token: data.verification_token || null,
        verification_code: data.verification_code || null,
        document_version: Number(data.document_version || 1),
        verification_status: data.verification_status || "draft",
        verification_published_at: data.verification_published_at || null,
        created_by: data.created_by || null,
        created_by_name: data.created_by_name || null,
        status: data.status || "pending",
        priority: data.priority || "normal",
    };
    return withDbFallback(
      async (sql) => {
        const [row] = await sql`INSERT INTO ris_forms ${sql(payload)} RETURNING *`;
        return row;
      },
      async () => sbInsertWithOptionalColumns(
        "ris_forms",
        payload,
        [
          "priority",
          "approved_date",
          "issued_date",
          "verification_token",
          "verification_code",
          "document_version",
          "verification_status",
          "verification_published_at",
        ],
        getRestWriteConfig(),
      ),
    );
  });

export const listRisForms = createServerFn({ method: "GET" })
  .inputValidator((d: { created_by?: string } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    return withDbFallback(
      async (sql) => {
      const createdBy = data.created_by?.trim() || null;
      return await sql`
        SELECT
          r.id,
          r.ris_no,
          r.office,
          r.purpose,
          r.requested_by,
          r.status,
          r.priority,
          r.review_notes,
          r.created_at::text AS created_at,
          coalesce(string_agg(DISTINCT i.name, ', ' ORDER BY i.name), 'No item listed') AS item_name,
          coalesce(string_agg(DISTINCT c.name, ', ' ORDER BY c.name), 'Uncategorized') AS category_name,
          coalesce(sum(ri.quantity), 0) AS quantity,
          coalesce(string_agg(DISTINCT i.unit, ', ' ORDER BY i.unit), 'pcs') AS unit,
          coalesce(max(i.acquisition_cost), 0) AS acquisition_cost,
          coalesce(sum(ri.quantity * i.acquisition_cost), 0) AS total_amount,
          coalesce(string_agg(DISTINCT nullif(ri.remarks, ''), ' | '), r.purpose, '') AS remarks,
          coalesce(string_agg(DISTINCT s.name, ', ' ORDER BY s.name), '') AS supplier_name
        FROM ris_forms r
        LEFT JOIN ris_items ri ON ri.ris_id = r.id
        LEFT JOIN items i ON i.id = ri.item_id
        LEFT JOIN categories c ON c.id = i.category_id
        LEFT JOIN suppliers s ON s.id = i.supplier_id
        WHERE (${createdBy}::text IS NULL OR r.created_by = ${createdBy}::text)
        GROUP BY r.id
        ORDER BY
          CASE WHEN r.status IN ('pending', 'draft') THEN 0 ELSE 1 END,
          r.created_at DESC
      `;
      },
      async () => {
        const ownerFilter = data.created_by?.trim()
          ? `&created_by=eq.${encodeURIComponent(data.created_by.trim())}`
          : "";
        const forms = await sbSelect<any>(
          "ris_forms",
          `select=id,ris_no,office,purpose,requested_by,status,created_at${ownerFilter}&order=created_at.desc&limit=1000`,
        );
        if (forms.length === 0) return [];

        const formIds = forms.map((form) => String(form.id));
        const risItems = await sbSelect<any>(
          "ris_items",
          `select=ris_id,item_id,quantity,remarks&ris_id=in.(${formIds.map(encodeURIComponent).join(",")})&limit=10000`,
        );
        const itemIds = [...new Set(risItems.map((line) => String(line.item_id)))];
        const items = itemIds.length
          ? await sbSelect<any>(
              "items",
              `select=id,name,unit,acquisition_cost,category_id,supplier_id&id=in.(${itemIds.map(encodeURIComponent).join(",")})&limit=10000`,
            )
          : [];
        const categoryIds = [...new Set(items.map((item) => String(item.category_id || "")).filter(Boolean))];
        const supplierIds = [...new Set(items.map((item) => String(item.supplier_id || "")).filter(Boolean))];
        const [categories, suppliers] = await Promise.all([
          categoryIds.length
            ? sbSelect<any>("categories", `select=id,name&id=in.(${categoryIds.map(encodeURIComponent).join(",")})&limit=10000`)
            : Promise.resolve([]),
          supplierIds.length
            ? sbSelect<any>("suppliers", `select=id,name&id=in.(${supplierIds.map(encodeURIComponent).join(",")})&limit=10000`)
            : Promise.resolve([]),
        ]);
        const itemById = new Map(items.map((item) => [String(item.id), item]));
        const categoryById = new Map(categories.map((category: any) => [String(category.id), category.name]));
        const supplierById = new Map(suppliers.map((supplier: any) => [String(supplier.id), supplier.name]));
        const linesByForm = new Map<string, any[]>();
        for (const line of risItems) {
          const lines = linesByForm.get(String(line.ris_id)) || [];
          lines.push(line);
          linesByForm.set(String(line.ris_id), lines);
        }

        return forms.map((form) => {
          const lines = linesByForm.get(String(form.id)) || [];
          const lineItems = lines.map((line) => ({
            line,
            item: itemById.get(String(line.item_id)),
          }));
          const distinct = (values: unknown[]) => [...new Set(values
            .filter((value) => value !== null && value !== undefined && String(value).trim() !== "")
            .map(String))].sort();
          const itemNames = distinct(lineItems.map(({ item }) => item?.name));
          const categoriesForForm = distinct(lineItems.map(({ item }) => item ? categoryById.get(String(item.category_id || "")) : ""));
          const units = distinct(lineItems.map(({ item }) => item?.unit));
          const vendors = distinct(lineItems.map(({ item }) => item ? supplierById.get(String(item.supplier_id || "")) : ""));
          const quantity = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
          const totalAmount = lineItems.reduce((sum, { line, item }) => sum + Number(line.quantity || 0) * Number(item?.acquisition_cost || 0), 0);
          const remarks = distinct(lines.map((line) => line.remarks));
          return {
            ...form,
            priority: "normal",
            review_notes: null,
            item_name: itemNames.join(", ") || "No item listed",
            category_name: categoriesForForm.join(", ") || "Uncategorized",
            quantity,
            unit: units.join(", ") || "pcs",
            acquisition_cost: quantity > 0 ? totalAmount / quantity : 0,
            total_amount: totalAmount,
            remarks: remarks.join(" | ") || form.purpose || "",
            supplier_name: vendors.join(", "),
          };
        });
      },
    );
  });

export const getRisFormStatus = createServerFn({ method: "GET" })
  .inputValidator((d: { ris_no: string }) => d)
  .handler(async ({ data }) => {
    return withDbFallback(
      async (sql) => {
        const [row] = await sql`
          SELECT status FROM ris_forms
          WHERE ris_no = ${data.ris_no}
          ORDER BY created_at DESC LIMIT 1
        `;
        return (row?.status as string | null | undefined) ?? null;
      },
      async () => {
        const [row] = await sbSelect<any>(
          "ris_forms",
          `select=status&ris_no=eq.${encodeURIComponent(data.ris_no)}&order=created_at.desc&limit=1`,
        );
        return (row?.status as string | null | undefined) ?? null;
      },
    );
  });

export const updateRisFormStatus = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      id: string;
      status: "pending" | "approved" | "rejected" | "issued" | "cancelled";
      review_note?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const status = data.status;
    return withDbFallback(
      async (sql) => {
        const [row] = await sql`
          UPDATE ris_forms
          SET
            status = ${status},
            review_notes = coalesce(nullif(btrim(${data.review_note || ""}), ''), review_notes),
            approved_date = CASE
              WHEN ${status} IN ('approved', 'issued') THEN coalesce(approved_date, current_date)
              ELSE approved_date
            END
          WHERE id = ${data.id}
            AND status IN ('pending', 'draft', 'approved', 'issued', 'rejected', 'cancelled')
          RETURNING *
        `;
        if (!row) throw new Error("RIS request was not found or could not be updated.");
        return row;
      },
      async () => {
        let payload: Record<string, unknown> = { status, review_notes: data.review_note || null };
        const optional = new Set(["review_notes", "approved_date"]);
        for (;;) {
          try {
            const rows = await sbUpdate(
              "ris_forms",
              `id=eq.${encodeURIComponent(data.id)}`,
              payload,
              getRestWriteConfig(),
            );
            if (!rows[0]) throw new Error("RIS request was not found or could not be updated.");
            return rows[0];
          } catch (error) {
            const column = missingItemColumn(error);
            if (!column || !optional.delete(column)) throw error;
            delete payload[column];
          }
        }
      },
    );
  });

export const createRisItem = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const payload = {
        ris_id: data.ris_id,
        item_id: data.item_id,
        quantity: Number(data.quantity),
        remarks: data.remarks || null,
        transaction_id: data.transaction_id || null,
    };
    return withDbFallback(
      async (sql) => {
        const [row] = await sql`INSERT INTO ris_items ${sql(payload)} RETURNING *`;
        return row;
      },
      async () => sbInsert("ris_items", payload, getRestWriteConfig()),
    );
  });

export const getRisVerification = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const [form] = await sql`
      SELECT
        r.verification_code,
        r.ris_no,
        r.verification_status AS status,
        r.office,
        r.purpose,
        r.approved_by,
        r.issued_by,
        to_char(r.approved_date, 'YYYY-MM-DD') AS approved_date,
        to_char(r.issued_date, 'YYYY-MM-DD') AS issued_date,
        r.document_version,
        r.verification_published_at::text AS published_at,
        r.created_at::text AS updated_at,
        count(ri.id)::integer AS item_count,
        coalesce(
          json_agg(
            json_build_object(
              'description', coalesce(nullif(i.description, ''), i.name),
              'quantity', ri.quantity,
              'unit', i.unit
            )
            ORDER BY ri.created_at
          ) FILTER (WHERE ri.id IS NOT NULL),
          '[]'::json
        ) AS items
      FROM ris_forms r
      LEFT JOIN ris_items ri ON ri.ris_id = r.id
      LEFT JOIN items i ON i.id = ri.item_id
      WHERE r.verification_token = ${data.token}
      GROUP BY r.id
      LIMIT 1
    `;
    return form || null;
  });

export const listFormPersonnelMemory = createServerFn({ method: "GET" }).handler(
  async () => {
    const sql = await getDb();
    return await sql`
      SELECT role, person_name, last_used_at
      FROM form_personnel_memory
      ORDER BY last_used_at DESC
    `;
  },
);

export const rememberFormPersonnel = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { role: string; person_name: string; created_by?: string }) => d,
  )
  .handler(async ({ data }) => {
    const sql = await getDb();
    const [row] = await sql`
      INSERT INTO form_personnel_memory (
        role, person_name, created_by, last_used_at
      )
      VALUES (
        ${data.role}, ${data.person_name.trim()}, ${data.created_by || null}, now()
      )
      ON CONFLICT (role, person_name)
      DO UPDATE SET last_used_at = now(), created_by = EXCLUDED.created_by
      RETURNING *
    `;
    return row;
  });

export const reserveNextFormNumber = createServerFn({ method: "POST" })
  .inputValidator((d: { prefix: string; date: string }) => d)
  .handler(async ({ data }) => {
    const date = data.date;
    const year = Number(date.slice(0, 4));
    const prefix = data.prefix.toUpperCase();
    return withDbFallback(
      async (sql) => sql.begin(async (tx: any) => {
        let historyNext = 1;
        if (prefix === "RIS") {
          const [latest] = await tx`
            SELECT COALESCE(
              MAX(NULLIF(substring(ris_no from '-([0-9]+)$'), '')::bigint),
              0
            ) AS last_number
            FROM ris_forms
            WHERE ris_no LIKE ${`${date}-%`}
          `;
          historyNext = Number(latest.last_number || 0) + 1;
        }
        const [counter] = await tx`
          INSERT INTO form_number_counters (form_prefix, series_year, last_number)
          VALUES (${prefix}, ${year}, ${historyNext})
          ON CONFLICT (form_prefix, series_year)
          DO UPDATE SET last_number = GREATEST(
            form_number_counters.last_number + 1,
            EXCLUDED.last_number
          )
          RETURNING last_number
        `;
        const series = String(counter.last_number).padStart(7, "0");
        return prefix === "RIS"
          ? `${date}-${series}`
          : `${prefix}-${date}-${series}`;
      }),
      // Hosted Worker cannot open a TCP connection to local PostgreSQL.
      // Supabase RPC performs the same atomic upsert in the hosted database.
      async () => {
        let reservedSeries = 0;
        try {
          const reserved = await sbRpc<string>("next_form_number", {
            p_form_prefix: prefix,
            p_form_date: date,
          });
          reservedSeries = Number(reserved.match(/-(\d+)$/)?.[1] || 0);
        } catch (rpcError) {
          if (prefix !== "RIS") throw rpcError;
        }
        if (prefix !== "RIS") return `${prefix}-${date}-${String(reservedSeries).padStart(7, "0")}`;
        const history = await sbSelect<{ ris_no: string }>(
          "ris_forms",
          `select=ris_no&ris_no=like.${encodeURIComponent(date)}-*&order=ris_no.desc&limit=10000`,
        );
        const historySeries = history.reduce((max, form) => {
          const match = form.ris_no.match(new RegExp(`^${date}-(\\d+)$`));
          return Math.max(max, Number(match?.[1] || 0));
        }, 0);
        return `${date}-${String(Math.max(reservedSeries, historySeries + 1, 1)).padStart(7, "0")}`;
      },
    );
  });

export const getNextRisNumberFromHistory = createServerFn({ method: "GET" })
  .inputValidator((d: { date: string }) => d)
  .handler(async ({ data }) => {
    const date = data.date;
    const year = Number(date.slice(0, 4));
    return withDbFallback(
      async (sql) => {
        const [row] = await sql`
          SELECT GREATEST(
            COALESCE((
              SELECT last_number FROM form_number_counters
              WHERE form_prefix = 'RIS' AND series_year = ${year}
            ), 0),
            COALESCE((
              SELECT MAX(NULLIF(substring(ris_no from '-([0-9]+)$'), '')::bigint)
              FROM ris_forms WHERE ris_no LIKE ${`${date}-%`}
            ), 0)
          ) + 1 AS next_number
        `;
        return `${date}-${String(Number(row.next_number)).padStart(7, "0")}`;
      },
      async () => {
        const [latest] = await sbSelect<{ ris_no: string }>(
          "ris_forms",
          `select=ris_no&ris_no=like.${encodeURIComponent(date)}-*&order=ris_no.desc&limit=1`,
        );
        const historySeries = Number(latest?.ris_no?.match(/-(\d+)$/)?.[1] || 0);
        let counterSeries = 0;
        try {
          const [counter] = await sbSelect<{ last_number: number }>(
            "form_number_counters",
            `select=last_number&form_prefix=eq.RIS&series_year=eq.${year}&limit=1`,
          );
          counterSeries = Number(counter?.last_number || 0);
        } catch {
          // Older hosted projects may not have the optional counter table.
        }
        return `${date}-${String(Math.max(historySeries, counterSeries) + 1).padStart(7, "0")}`;
      },
    );
  });

export const createIcsForm = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const [row] = await sql`
      INSERT INTO ics_forms ${sql({
        ics_no: data.ics_no,
        ris_id: data.ris_id || null,
        custodian_name: data.custodian_name || null,
        office: data.office || null,
        created_by: data.created_by || null,
        created_by_name: data.created_by_name || null,
      })}
      RETURNING *
    `;
    return row;
  });

export const createIcsItem = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const [row] = await sql`
      INSERT INTO ics_items ${sql({
        ics_id: data.ics_id,
        item_id: data.item_id,
        quantity: Number(data.quantity),
        unit_cost: Number(data.unit_cost || 0),
        remarks: data.remarks || null,
      })}
      RETURNING *
    `;
    return row;
  });

export const createParForm = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const [row] = await sql`
      INSERT INTO par_forms ${sql({
        par_no: data.par_no,
        ris_id: data.ris_id || null,
        accountable_person: data.accountable_person || null,
        office: data.office || null,
        created_by: data.created_by || null,
        created_by_name: data.created_by_name || null,
      })}
      RETURNING *
    `;
    return row;
  });

export const createParItem = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const [row] = await sql`
      INSERT INTO par_items ${sql({
        par_id: data.par_id,
        item_id: data.item_id,
        quantity: Number(data.quantity),
        unit_cost: Number(data.unit_cost || 0),
        remarks: data.remarks || null,
      })}
      RETURNING *
    `;
    return row;
  });

// ============================================
// INVENTORY SNAPSHOT (for AI assistant)
// ============================================

export const getInventorySnapshot = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const sql = await getDb();
      const items = await sql`
      SELECT i.name, i.quantity, i.unit, i.reorder_level,
        c.name AS category_name,
        s.name AS supplier_name
      FROM items i
      LEFT JOIN categories c ON c.id = i.category_id
      LEFT JOIN suppliers s ON s.id = i.supplier_id
      ORDER BY i.quantity ASC
    `;
      const txs = await sql`
      SELECT t.type, t.quantity, t.created_at,
        i.name AS item_name
      FROM transactions t
      LEFT JOIN items i ON i.id = t.item_id
      ORDER BY t.created_at DESC
      LIMIT 100
    `;

      const low = items
        .filter((i: any) => Number(i.quantity) <= Number(i.reorder_level))
        .slice(0, 25);
      return {
        total_items: items.length,
        out_of_stock: items.filter((i: any) => Number(i.quantity) === 0).length,
        low_stock_items: low.map((i: any) => ({
          name: i.name,
          qty: Number(i.quantity),
          unit: i.unit,
          reorder: Number(i.reorder_level),
          category: i.category_name,
          supplier: i.supplier_name,
        })),
        recent_transactions: txs.slice(0, 30).map((t: any) => ({
          item: t.item_name,
          type: t.type,
          qty: Number(t.quantity),
          at: t.created_at,
        })),
      };
    } catch (e) {
      console.error("getInventorySnapshot error:", e);
      return null;
    }
  },
);

