import { createServerFn } from "@tanstack/react-start";

// Helper to get local DB on the server
async function getDb() {
  const { getSql } = await import("@/lib/local-db");
  return getSql();
}

async function ensureItemCodes(sql: any) {
  await sql`
    UPDATE items
    SET barcode_value = id::text
    WHERE barcode_value IS NULL OR btrim(barcode_value) = ''
  `;
  await sql`
    UPDATE items
    SET qr_code_value = 'ITEM:' || id::text
    WHERE qr_code_value IS NULL OR btrim(qr_code_value) = ''
  `;
}

// ============================================
// ITEMS
// ============================================

export const listItems = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await getDb();
    await ensureItemCodes(sql);
    const rows = await sql`
      SELECT
        i.*,
        row_to_json(c.*) AS category,
        row_to_json(s.*) AS supplier
      FROM items i
      LEFT JOIN categories c ON c.id = i.category_id
      LEFT JOIN suppliers s ON s.id = i.supplier_id
      ORDER BY i.name ASC
    `;
    // Transform the nested JSON into the expected format
    return rows.map((r: any) => ({
      ...r,
      category: r.category?.id
        ? { id: r.category.id, name: r.category.name }
        : null,
      supplier: r.supplier?.id
        ? { id: r.supplier.id, name: r.supplier.name }
        : null,
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
      category: row.category?.id
        ? { id: row.category.id, name: row.category.name }
        : null,
      supplier: row.supplier?.id
        ? { id: row.supplier.id, name: row.supplier.name }
        : null,
    };
  });

export const createItem = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const [row] = await sql`
      INSERT INTO items ${sql({
        name: data.name,
        description: data.description || null,
        category_id: data.category_id || null,
        supplier_id: data.supplier_id || null,
        item_type: data.item_type || "supply",
        quantity: Number(data.quantity) || 0,
        unit: data.unit || "pcs",
        reorder_level: Number(data.reorder_level) || 10,
        acquisition_cost: Number(data.acquisition_cost) || 0,
        barcode_value: data.barcode_value || null,
        qr_code_value: data.qr_code_value || null,
      })}
      RETURNING *
    `;
    const [codedRow] = await sql`
      UPDATE items
      SET barcode_value = COALESCE(NULLIF(btrim(barcode_value), ''), id::text),
          qr_code_value = COALESCE(NULLIF(btrim(qr_code_value), ''), 'ITEM:' || id::text)
      WHERE id = ${row.id}
      RETURNING *
    `;
    return codedRow;
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
        unit: data.unit || "pcs",
        reorder_level: Number(data.reorder_level) || 10,
        acquisition_cost: Number(data.acquisition_cost) || 0,
        barcode_value: data.barcode_value || null,
        qr_code_value: data.qr_code_value || null,
      })}
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

export const listCategories = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const sql = await getDb();
      return await sql`SELECT * FROM categories ORDER BY name ASC`;
    } catch {
      return [];
    }
  },
);

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

export const listSuppliers = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const sql = await getDb();
      return await sql`SELECT * FROM suppliers ORDER BY name ASC`;
    } catch {
      return [];
    }
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
        item: r.item?.id
          ? { id: r.item.id, name: r.item.name, unit: r.item.unit }
          : null,
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

export const listAuditLogs = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const sql = await getDb();
      return await sql`
      SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500
    `;
    } catch {
      return [];
    }
  },
);

// ============================================
// FORMS (IAR, RIS, ICS, PAR)
// ============================================

export const listIarForms = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const sql = await getDb();
      return await sql`SELECT * FROM iar_forms ORDER BY created_at DESC`;
    } catch {
      return [];
    }
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
