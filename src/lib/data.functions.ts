import { createServerFn } from "@tanstack/react-start";

let localSchemaReady: Promise<void> | null = null;

// Helper to get local DB on the server
async function getDb() {
  const { ensureSchema, getSql } = await import("@/lib/local-db");
  localSchemaReady ??= ensureSchema().then(() => undefined);
  await localSchemaReady;
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
              description: r.item.description,
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
    const quantity = Number(data.quantity);
    return await sql.begin(async (tx: any) => {
      const [item] = await tx`
        SELECT quantity FROM items WHERE id = ${data.item_id} FOR UPDATE
      `;
      if (!item) throw new Error("Inventory item was not found.");
      if (data.type === "OUT" && Number(item.quantity) < quantity) {
        throw new Error(`Only ${item.quantity} units are available.`);
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
      await tx`
        UPDATE items
        SET quantity = quantity + ${data.type === "IN" ? quantity : -quantity}
        WHERE id = ${data.item_id}
      `;
      return row;
    });
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
        approved_date: data.approved_date || null,
        issued_date: data.issued_date || null,
        verification_token: data.verification_token || null,
        verification_code: data.verification_code || null,
        document_version: Number(data.document_version || 1),
        verification_status: data.verification_status || "draft",
        verification_published_at: data.verification_published_at || null,
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
    const sql = await getDb();
    const date = data.date;
    const year = Number(date.slice(0, 4));
    const prefix = data.prefix.toUpperCase();
    const [counter] = await sql`
      INSERT INTO form_number_counters (form_prefix, series_year, last_number)
      VALUES (${prefix}, ${year}, 1)
      ON CONFLICT (form_prefix, series_year)
      DO UPDATE SET last_number = form_number_counters.last_number + 1
      RETURNING last_number
    `;
    const series = String(counter.last_number).padStart(7, "0");
    return prefix === "RIS"
      ? `${date}-${series}`
      : `${prefix}-${date}-${series}`;
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
