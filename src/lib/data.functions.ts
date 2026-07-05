import { createServerFn } from "@tanstack/react-start";
import { getDb } from "./db";

// ─── Items ──────────────────────────────────────────────────────────────────

export const listItems = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getDb();
  const rows = await sql`
    SELECT i.*,
      CASE WHEN c.id IS NOT NULL THEN jsonb_build_object('id', c.id, 'name', c.name) END AS category,
      CASE WHEN s.id IS NOT NULL THEN jsonb_build_object('id', s.id, 'name', s.name) END AS supplier
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    ORDER BY i.name
  `;
  return rows;
});

export const listBasicItems = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getDb();
  return sql`SELECT id, name, quantity, unit FROM items ORDER BY name`;
});

export const listInventoryItems = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getDb();
  return sql`SELECT id, name, unit, quantity, item_type FROM items ORDER BY name`;
});

export const searchItems = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getDb();
  return sql`SELECT id, name, quantity, unit, acquisition_cost, inventory_classification, semi_expendable_tier, barcode_value, qr_code_value FROM items ORDER BY name`;
});

export const getItem = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const rows = await sql`
      SELECT i.*,
        CASE WHEN c.id IS NOT NULL THEN jsonb_build_object('id', c.id, 'name', c.name) END AS category,
        CASE WHEN s.id IS NOT NULL THEN jsonb_build_object('id', s.id, 'name', s.name) END AS supplier
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.id = ${data.id}
    `;
    if (rows.length === 0) throw new Error("Item not found");
    return rows[0];
  });

export const getItemByCode = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const { code } = data;
    const normalized = code.startsWith("ITEM:") ? code : code.replace("ITEM:", "");
    const rows = await sql`
      SELECT id, name, quantity, unit, acquisition_cost, inventory_classification, semi_expendable_tier, barcode_value, qr_code_value
      FROM items
      WHERE barcode_value = ${normalized}
         OR qr_code_value = ${code}
         OR id = ${normalized}
      LIMIT 1
    `;
    return rows.length > 0 ? rows[0] : null;
  });

export const createItem = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const { name, description, category_id, supplier_id, item_type, quantity, unit, reorder_level, acquisition_cost, inventory_classification, semi_expendable_tier } = data;
    const rows = await sql`
      INSERT INTO items (
        name, description, category_id, supplier_id, item_type,
        quantity, unit, reorder_level,
        acquisition_cost, inventory_classification, semi_expendable_tier
      ) VALUES (
        ${name}, ${description ?? null}, ${category_id ?? null}, ${supplier_id ?? null}, ${item_type ?? "supply"},
        ${Number(quantity) || 0}, ${unit ?? "pcs"}, ${Number(reorder_level) || 10},
        ${Number(acquisition_cost) || 0}, ${inventory_classification ?? null}, ${semi_expendable_tier ?? null}
      )
      RETURNING *
    `;
    return rows[0];
  });

export const updateItem = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; data: any }) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const { id, data: fields } = data;
    // Build SET clause dynamically from provided fields
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    for (const [key, value] of Object.entries(fields)) {
      if (key === "id") continue;
      sets.push(`${key} = $${idx}`);
      vals.push(value ?? null);
      idx++;
    }
    vals.push(id);
    const query = `UPDATE items SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`;
    const rows = await sql.unsafe(query, vals);
    return rows[0];
  });

export const deleteItem = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    await sql`DELETE FROM items WHERE id = ${data.id}`;
    return { ok: true };
  });

// ─── Categories ────────────────────────────────────────────────────────────

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getDb();
  return sql`SELECT * FROM categories ORDER BY name`;
});

export const createCategory = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; description?: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const rows = await sql`INSERT INTO categories (name, description) VALUES (${data.name}, ${data.description ?? null}) RETURNING *`;
    return rows[0];
  });

export const updateCategory = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; name: string; description?: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const rows = await sql`UPDATE categories SET name = ${data.name}, description = ${data.description ?? null} WHERE id = ${data.id} RETURNING *`;
    return rows[0];
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    await sql`DELETE FROM categories WHERE id = ${data.id}`;
    return { ok: true };
  });

// ─── Suppliers ─────────────────────────────────────────────────────────────

export const listSuppliers = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getDb();
  return sql`SELECT * FROM suppliers ORDER BY name`;
});

export const createSupplier = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; contact?: string; address?: string; notes?: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const rows = await sql`
      INSERT INTO suppliers (name, contact, address, notes)
      VALUES (${data.name}, ${data.contact ?? null}, ${data.address ?? null}, ${data.notes ?? null})
      RETURNING *
    `;
    return rows[0];
  });

export const updateSupplier = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; name: string; contact?: string; address?: string; notes?: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const rows = await sql`
      UPDATE suppliers SET name = ${data.name}, contact = ${data.contact ?? null}, address = ${data.address ?? null}, notes = ${data.notes ?? null}
      WHERE id = ${data.id} RETURNING *
    `;
    return rows[0];
  });

export const deleteSupplier = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    await sql`DELETE FROM suppliers WHERE id = ${data.id}`;
    return { ok: true };
  });

// ─── Transactions ──────────────────────────────────────────────────────────

export const listTransactions = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getDb();
  const rows = await sql`
    SELECT t.*,
      CASE WHEN ti.id IS NOT NULL THEN jsonb_build_object('id', ti.id, 'name', ti.name, 'unit', ti.unit) END AS item
    FROM transactions t
    LEFT JOIN items ti ON t.item_id = ti.id
    ORDER BY t.transaction_date DESC, t.created_at DESC
    LIMIT 200
  `;
  return rows;
});

export const listRecentTransactions = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getDb();
  const rows = await sql`
    SELECT t.*,
      CASE WHEN ti.id IS NOT NULL THEN jsonb_build_object('id', ti.id, 'name', ti.name, 'unit', ti.unit) END AS item
    FROM transactions t
    LEFT JOIN items ti ON t.item_id = ti.id
    ORDER BY t.created_at DESC
    LIMIT 200
  `;
  return rows;
});

export const listCoaTransactions = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getDb();
  const rows = await sql`
    SELECT t.*,
      CASE WHEN ti.id IS NOT NULL THEN jsonb_build_object(
        'id', ti.id, 'name', ti.name, 'description', ti.description,
        'unit', ti.unit, 'item_type', ti.item_type
      ) END AS item
    FROM transactions t
    LEFT JOIN items ti ON t.item_id = ti.id
    ORDER BY t.transaction_date ASC, t.created_at ASC
  `;
  return rows;
});

export const listRisTransactions = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getDb();
  const rows = await sql`
    SELECT t.*,
      CASE WHEN ti.id IS NOT NULL THEN jsonb_build_object(
        'id', ti.id, 'name', ti.name, 'quantity', ti.quantity,
        'unit', ti.unit, 'acquisition_cost', ti.acquisition_cost,
        'inventory_classification', ti.inventory_classification,
        'semi_expendable_tier', ti.semi_expendable_tier
      ) END AS item
    FROM transactions t
    LEFT JOIN items ti ON t.item_id = ti.id
    ORDER BY t.created_at ASC
  `;
  return rows;
});

export const createTransaction = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const rows = await sql`
      INSERT INTO transactions (
        item_id, type, quantity, reference_no,
        transaction_date, responsibility_center_code, office_officer,
        staff_id, staff_name, remarks
      ) VALUES (
        ${data.item_id}, ${data.type}, ${Number(data.quantity)},
        ${data.reference_no ?? null}, ${data.transaction_date ?? new Date().toISOString().slice(0, 10)},
        ${data.responsibility_center_code ?? null}, ${data.office_officer ?? null},
        ${data.staff_id ?? null}, ${data.staff_name ?? null}, ${data.remarks ?? null}
      )
      RETURNING *
    `;
    return rows[0];
  });

// ─── Audit Logs ────────────────────────────────────────────────────────────

export const listAuditLogs = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getDb();
  return sql`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500`;
});

// ─── User Roles ────────────────────────────────────────────────────────────

export const getUserRole = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const rows = await sql`SELECT role FROM user_roles WHERE user_id = ${data.userId}`;
    if (rows.length === 0) return null;
    const order: Record<string, number> = { admin: 1, staff: 2, accounting: 3, viewer: 4 };
    const top = [...rows].sort((a: any, b: any) => (order[a.role] ?? 9) - (order[b.role] ?? 9))[0];
    return top?.role ?? null;
  });

// ─── Inventory Snapshot (for AI) ───────────────────────────────────────────

export const getInventorySnapshot = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getDb();
  const items = await sql`
    SELECT i.name, i.quantity, i.unit, i.reorder_level,
      c.name AS category_name, s.name AS supplier_name
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    ORDER BY i.quantity
  `;
  const txs = await sql`
    SELECT t.type, t.quantity, t.created_at, ti.name AS item_name
    FROM transactions t
    LEFT JOIN items ti ON t.item_id = ti.id
    ORDER BY t.created_at DESC
    LIMIT 100
  `;

  const low = items.filter((i: any) => i.quantity <= i.reorder_level).slice(0, 25);
  return {
    total_items: items.length,
    out_of_stock: items.filter((i: any) => i.quantity === 0).length,
    low_stock_items: low.map((i: any) => ({
      name: i.name,
      qty: i.quantity,
      unit: i.unit,
      reorder: i.reorder_level,
      category: i.category_name,
      supplier: i.supplier_name,
    })),
    recent_transactions: txs.slice(0, 30).map((t: any) => ({
      item: t.item_name,
      type: t.type,
      qty: t.quantity,
      at: t.created_at,
    })),
  };
});

// ─── Dashboard Stats ────────────────────────────────────────────────────────

export const getDashboardStats = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getDb();
  const items = await sql`SELECT id, name, quantity, reorder_level FROM items ORDER BY name`;
  const txs = await sql`
    SELECT type, quantity, created_at FROM transactions
    ORDER BY created_at DESC LIMIT 200
  `;

  const total = items.length;
  const low = items.filter((i: any) => i.quantity > 0 && i.quantity <= i.reorder_level).length;
  const out = items.filter((i: any) => i.quantity === 0).length;

  // 30-day usage chart
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const recentTxs = txs.filter((t: any) => t.created_at >= thirtyDaysAgo);

  return { items, transactions: txs, total, low, out, recentTxs };
});
