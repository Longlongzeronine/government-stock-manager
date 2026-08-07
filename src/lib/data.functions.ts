import { createServerFn } from "@tanstack/react-start";

let localSchemaReady: Promise<void> | null = null;

async function getDb() {
  const { ensureSchema, getSql } = await import("@/lib/local-db");
  localSchemaReady ??= ensureSchema().then(() => undefined);
  await localSchemaReady;
  return getSql();
}

async function ensureItemCodes(sql: any) {
  await sql`
    UPDATE items
    SET qr_code_value = 'ITEM:' || id::text
    WHERE qr_code_value IS NULL OR btrim(qr_code_value) = ''
  `;
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
      barcode_value: row.barcode_value && String(row.barcode_value) === String(row.id) ? null : row.barcode_value,
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
    const [codedRow] = await sql`
      UPDATE items
      SET qr_code_value = COALESCE(NULLIF(btrim(qr_code_value), ''), 'ITEM:' || id::text)
      WHERE id = ${row.id}
      RETURNING *
    `;
    return codedRow;
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

// ============================================
// RIS FORMS (Approval Workflow)
// ============================================

export const listRisForms = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await getDb();
    const rows = await sql`
      SELECT
        rf.id,
        rf.ris_no,
        rf.office,
        rf.purpose,
        rf.requested_by,
        rf.approved_by,
        rf.issued_by,
        rf.received_by,
        rf.status,
        rf.needed_by,
        rf.priority,
        rf.created_at,
        ri.id AS item_id,
        ri.quantity,
        ri.remarks,
        i.name AS item_name,
        i.unit,
        i.acquisition_cost,
        c.name AS category_name,
        s.name AS supplier_name
      FROM ris_forms rf
      LEFT JOIN ris_items ri ON ri.ris_id = rf.id
      LEFT JOIN items i ON i.id = ri.item_id
      LEFT JOIN categories c ON c.id = i.category_id
      LEFT JOIN suppliers s ON s.id = i.supplier_id
      ORDER BY rf.created_at DESC
    `;
    return rows.map((r: any) => ({
      id: r.id,
      ris_no: r.ris_no,
      office: r.office,
      purpose: r.purpose,
      requested_by: r.requested_by,
      approved_by: r.approved_by,
      issued_by: r.issued_by,
      received_by: r.received_by,
      status: r.status,
      needed_by: r.needed_by,
      priority: r.priority,
      created_at: r.created_at,
      item_id: r.item_id,
      quantity: Number(r.quantity || 0),
      remarks: r.remarks,
      item_name: r.item_name,
      unit: r.unit,
      acquisition_cost: Number(r.acquisition_cost || 0),
      category_name: r.category_name,
      supplier_name: r.supplier_name,
    }));
  } catch (e: any) {
    console.error("listRisForms error:", e);
    return [];
  }
});

export const updateRisFormStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const [row] = await sql`
      UPDATE ris_forms
      SET status = ${data.status}
      WHERE id = ${data.id}
      RETURNING *
    `;
    return row;
  });
