import { createServerFn } from "@tanstack/react-start";

// Helper to get local DB on the server
async function getDb() {
  const { getSql } = await import("@/lib/local-db");
  return getSql();
}

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

// ============================================
// ITEMS
// ============================================

export const listItems = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await getDb();
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
    // Transform the nested JSON into the expected format
    return rows.map((r: any) => ({
      ...r,
      category: r.category?.id ? { id: r.category.id, name: r.category.name } : null,
      supplier: r.supplier?.id ? { id: r.supplier.id, name: r.supplier.name } : null,
    }));
  } catch (e: any) {
    console.error("listItems error:", e);
    return [];
  }
});

export const getItem = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const [row] = await sql`
      SELECT i.*,
        row_to_json(c.*) AS category,
        row_to_json(s.*) AS supplier
      FROM items i
      LEFT JOIN categories c ON c.id = i.category_id
      LEFT JOIN suppliers s ON s.id = i.supplier_id
      WHERE i.id = ${data.id}
    `;
    if (!row) return null;
    return {
      ...row,
      category: row.category?.id ? { id: row.category.id, name: row.category.name } : null,
      supplier: row.supplier?.id ? { id: row.supplier.id, name: row.supplier.name } : null,
    };
  });

export const createItem = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    // Place new items after the highest existing sort_order so the file order stays stable.
    const [maxRow] = await sql`SELECT COALESCE(MAX(sort_order), 0) AS m FROM items`;
    const nextSort = Number(maxRow.m) + 1;
    const [row] = await sql`
      INSERT INTO items ${sql({
        name: data.name,
        description: data.description || null,
        category_id: data.category_id || null,
        supplier_id: data.supplier_id || null,
        item_type: data.item_type || "supply",
        quantity: Number(data.quantity) || 0,
        unit: normalizeUnit(data.unit, data.name),
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
        sort_order: nextSort,
      })}
      RETURNING *
    `;
    return row;
  });

export const importItems = createServerFn({ method: "POST" })
  .inputValidator((d: { items: any[] }) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const existing = await sql`SELECT id, name, barcode_value FROM items`;
    const names = new Map<string, { id: string | null; hasBarcode: boolean }>(existing.map((item: any) => [String(item.name).trim().toLowerCase(), { id: item.id, hasBarcode: !!item.barcode_value }]));
    const codes = new Set(existing.map((item: any) => String(item.barcode_value || "").trim().toLowerCase()).filter(Boolean));
    let added = 0;
    let skipped = 0;
    let updated = 0;
    let nextSort = Number((await sql`SELECT COALESCE(MAX(sort_order), 0) AS m FROM items`)[0].m) + 1;

    for (const item of data.items || []) {
      const name = String(item.name || "").trim();
      const barcode = String(item.barcode_value || "").trim();
      const nameKey = name.toLowerCase();
      const codeKey = barcode.toLowerCase();
      if (!name) {
        skipped += 1;
        continue;
      }
      // Use code (barcode_value) as primary identity — different codes = different products
      if (codeKey && codes.has(codeKey)) {
        skipped += 1;
        continue;
      }

      // Find or create category if category_name is provided
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

      // ── Handle case: no barcode but name already exists ──
      // This happens when Part II items from a previous import had barcode_value erroneously set,
      // and now we need to "move" them to Part II by clearing the barcode.
      const existingMatch = names.get(nameKey);
      if (!codeKey && existingMatch) {
        if (existingMatch.hasBarcode) {
          // Update existing item: clear barcode, update fields
          await sql`
            UPDATE items SET ${sql({
              name,
              description: item.description || null,
              category_id: categoryId,
              item_type: item.item_type || "supply",
              quantity: Number(item.quantity) || 0,
              unit: normalizeUnit(item.unit, name),
              reorder_level: Number(item.reorder_level) || 10,
              acquisition_cost: Number(item.acquisition_cost) || 0,
              barcode_value: null,
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
            })}
            WHERE id = ${existingMatch.id}
          `;
          updated += 1;
        } else {
          // Name exists and already has no barcode — skip as duplicate
          skipped += 1;
        }
        continue;
      }

      await sql`
        INSERT INTO items ${sql({
          name,
          description: item.description || null,
          category_id: categoryId,
          item_type: item.item_type || "supply",
          quantity: Number(item.quantity) || 0,
          unit: normalizeUnit(item.unit, name),
          reorder_level: Number(item.reorder_level) || 10,
          acquisition_cost: Number(item.acquisition_cost) || 0,
          barcode_value: barcode || null,
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
          sort_order: nextSort,
        })}
      `;
      nextSort += 1;
      names.set(nameKey, { id: null, hasBarcode: !!codeKey });
      if (codeKey) codes.add(codeKey);
      added += 1;
    }
    return { added, skipped, updated };
  });

export const updateItem = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const [row] = await sql`
      UPDATE items SET ${sql({
        name: data.name,
        description: data.description ?? null,
        category_id: data.category_id || null,
        supplier_id: data.supplier_id || null,
        item_type: data.item_type || "supply",
        quantity: Number(data.quantity) || 0,
        unit: normalizeUnit(data.unit, data.name),
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
    const sql = await getDb();
    await sql`DELETE FROM items WHERE id = ${data.id}`;
    return { ok: true };
  });

// ============================================
// CATEGORIES
// ============================================

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await getDb();
    return await sql`SELECT * FROM categories ORDER BY name ASC`;
  } catch {
    return [];
  }
});

export const createCategory = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const [row] = await sql`
      INSERT INTO categories ${sql({ name: data.name, description: data.description || null })}
      RETURNING *
    `;
    return row;
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

export const listSuppliers = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await getDb();
    return await sql`SELECT * FROM suppliers ORDER BY name ASC`;
  } catch {
    return [];
  }
});

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

// ============================================
// TRANSACTIONS
// ============================================

export const listTransactions = createServerFn({ method: "GET" })
  .inputValidator((d: { limit?: number } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    try {
      const sql = await getDb();
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
        item: r.item?.id ? { id: r.item.id, name: r.item.name, unit: r.item.unit } : null,
      }));
    } catch {
      return [];
    }
  });

export const listTransactionsAsc = createServerFn({ method: "GET" })
  .inputValidator((d: { limit?: number } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    try {
      const sql = await getDb();
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
              unit: r.item.unit,
              quantity: r.item.quantity,
              acquisition_cost: r.item.acquisition_cost,
              inventory_classification: r.item.inventory_classification,
              semi_expendable_tier: r.item.semi_expendable_tier,
            }
          : null,
      }));
    } catch {
      return [];
    }
  });

export const createTransaction = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const [row] = await sql`
      INSERT INTO transactions ${sql({
        item_id: data.item_id,
        type: data.type,
        quantity: Number(data.quantity),
        staff_id: data.staff_id || null,
        staff_name: data.staff_name || null,
        remarks: data.remarks || null,
        source_form_type: data.source_form_type || null,
        source_form_id: data.source_form_id || null,
      })}
      RETURNING *
    `;
    return row;
  });

// ============================================
// AUDIT LOGS
// ============================================

export const listAuditLogs = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await getDb();
    return await sql`
      SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500
    `;
  } catch {
    return [];
  }
});

// ============================================
// FORMS (IAR, RIS, ICS, PAR)
// ============================================

export const listIarForms = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await getDb();
    return await sql`SELECT * FROM iar_forms ORDER BY created_at DESC`;
  } catch {
    return [];
  }
});

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
    const sql = await getDb();
    const [row] = await sql`
      INSERT INTO ris_forms ${sql({
        ris_no: data.ris_no,
        office: data.office || null,
        purpose: data.purpose || null,
        requested_by: data.requested_by || null,
        approved_by: data.approved_by || null,
        issued_by: data.issued_by || null,
        received_by: data.received_by || null,
        created_by: data.created_by || null,
        created_by_name: data.created_by_name || null,
      })}
      RETURNING *
    `;
    return row;
  });

export const createRisItem = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const [row] = await sql`
      INSERT INTO ris_items ${sql({
        ris_id: data.ris_id,
        item_id: data.item_id,
        quantity: Number(data.quantity),
        remarks: data.remarks || null,
        transaction_id: data.transaction_id || null,
      })}
      RETURNING *
    `;
    return row;
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

export const getInventorySnapshot = createServerFn({ method: "GET" }).handler(async () => {
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

    const low = items.filter((i: any) => Number(i.quantity) <= Number(i.reorder_level)).slice(0, 25);
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
});
