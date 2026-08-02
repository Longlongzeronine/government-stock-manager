import { c as createServerRpc } from "./createServerRpc-RASzoWcs.js";
import { a2 as createServerFn } from "./server-DkTiwXTO.js";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
async function getDb() {
  const {
    getSql
  } = await import("./local-db-nGvY_eVV.js");
  return getSql();
}
function normalizeUnit(value, itemName = "") {
  const unit = String(value ?? "").trim().toLowerCase();
  const name = itemName.toLowerCase();
  if (!unit || /^\d+(\.\d+)?$/.test(unit)) {
    if (/air conditioning|air cooler/.test(name)) return "unit";
    if (/ticket/.test(name)) return "ticket";
    return "pieces";
  }
  const aliases = {
    pc: "pieces",
    pcs: "pieces",
    piece: "pieces",
    pieces: "pieces",
    each: "pieces",
    ea: "pieces",
    gal: "gallon",
    gallon: "gallon",
    gallons: "gallon",
    btl: "bottle",
    bottle: "bottle",
    bottles: "bottle",
    pkt: "pack",
    packs: "pack",
    box: "box",
    boxes: "box",
    set: "set",
    sets: "set",
    roll: "roll",
    rolls: "roll",
    ream: "ream",
    reams: "ream",
    unit: "unit",
    units: "unit",
    ticket: "ticket",
    tickets: "ticket"
  };
  return aliases[unit] || unit;
}
const listItems_createServerFn_handler = createServerRpc({
  id: "09ca6c2083785473bb7f915c509d28f7768b2e0ef527a1f1ab93ebd18c40a541",
  name: "listItems",
  filename: "src/lib/data.functions.ts"
}, (opts) => listItems.__executeServer(opts));
const listItems = createServerFn({
  method: "GET"
}).handler(listItems_createServerFn_handler, async () => {
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
      ORDER BY i.name ASC
    `;
    return rows.map((r) => ({
      ...r,
      category: r.category?.id ? {
        id: r.category.id,
        name: r.category.name
      } : null,
      supplier: r.supplier?.id ? {
        id: r.supplier.id,
        name: r.supplier.name
      } : null
    }));
  } catch (e) {
    console.error("listItems error:", e);
    return [];
  }
});
const getItem_createServerFn_handler = createServerRpc({
  id: "de3e488301c36c24cf84c7162834cf37938afd5046277c2eb4b064dd023fcb14",
  name: "getItem",
  filename: "src/lib/data.functions.ts"
}, (opts) => getItem.__executeServer(opts));
const getItem = createServerFn({
  method: "GET"
}).inputValidator((d) => d).handler(getItem_createServerFn_handler, async ({
  data
}) => {
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
    category: row.category?.id ? {
      id: row.category.id,
      name: row.category.name
    } : null,
    supplier: row.supplier?.id ? {
      id: row.supplier.id,
      name: row.supplier.name
    } : null
  };
});
const createItem_createServerFn_handler = createServerRpc({
  id: "e3ed2ef163af2567402827443cb5af2c855a921527854edf4f37893db4665df7",
  name: "createItem",
  filename: "src/lib/data.functions.ts"
}, (opts) => createItem.__executeServer(opts));
const createItem = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createItem_createServerFn_handler, async ({
  data
}) => {
  const sql = await getDb();
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
    qr_code_value: data.qr_code_value || null
  })}
      RETURNING *
    `;
  return row;
});
const importItems_createServerFn_handler = createServerRpc({
  id: "8603c7f7434fba9abef0718bf57dafa0ca1f696e01b04b283f4e50746ff00656",
  name: "importItems",
  filename: "src/lib/data.functions.ts"
}, (opts) => importItems.__executeServer(opts));
const importItems = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(importItems_createServerFn_handler, async ({
  data
}) => {
  const sql = await getDb();
  const existing = await sql`SELECT name, barcode_value FROM items`;
  const names = new Set(existing.map((item) => String(item.name).trim().toLowerCase()));
  const codes = new Set(existing.map((item) => String(item.barcode_value || "").trim().toLowerCase()).filter(Boolean));
  let added = 0;
  let skipped = 0;
  for (const item of data.items || []) {
    const name = String(item.name || "").trim();
    const barcode = String(item.barcode_value || "").trim();
    const nameKey = name.toLowerCase();
    const codeKey = barcode.toLowerCase();
    if (!name || names.has(nameKey) || codeKey && codes.has(codeKey)) {
      skipped += 1;
      continue;
    }
    await sql`
        INSERT INTO items ${sql({
      name,
      description: item.description || null,
      item_type: item.item_type || "supply",
      quantity: Number(item.quantity) || 0,
      unit: normalizeUnit(item.unit, name),
      reorder_level: Number(item.reorder_level) || 10,
      acquisition_cost: Number(item.acquisition_cost) || 0,
      barcode_value: barcode || null
    })}
      `;
    names.add(nameKey);
    if (codeKey) codes.add(codeKey);
    added += 1;
  }
  return {
    added,
    skipped
  };
});
const updateItem_createServerFn_handler = createServerRpc({
  id: "47f8d41a4e352407b42697986f19f6ff4e279b6743d10f4d2c742480a9d7f2ed",
  name: "updateItem",
  filename: "src/lib/data.functions.ts"
}, (opts) => updateItem.__executeServer(opts));
const updateItem = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(updateItem_createServerFn_handler, async ({
  data
}) => {
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
    qr_code_value: data.qr_code_value || null
  })}
      WHERE id = ${data.id}
      RETURNING *
    `;
  return row;
});
const monthColumns = ["jan_quantity", "feb_quantity", "mar_quantity", "apr_quantity", "may_quantity", "jun_quantity", "jul_quantity", "aug_quantity", "sep_quantity", "oct_quantity", "nov_quantity", "dec_quantity"];
const updateItemMonthlyQuantity_createServerFn_handler = createServerRpc({
  id: "55061c0f64d1e67de8753c5d615686c7ceadced5cdb4e8b343621c20b7509c93",
  name: "updateItemMonthlyQuantity",
  filename: "src/lib/data.functions.ts"
}, (opts) => updateItemMonthlyQuantity.__executeServer(opts));
const updateItemMonthlyQuantity = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(updateItemMonthlyQuantity_createServerFn_handler, async ({
  data
}) => {
  const column = monthColumns[data.month];
  if (!column) throw new Error("Invalid month");
  const sql = await getDb();
  const [row] = await sql`
      UPDATE items SET ${sql({
    [column]: Math.max(0, Number(data.quantity) || 0)
  })}
      WHERE id = ${data.id}
      RETURNING *
    `;
  return row;
});
const deleteItem_createServerFn_handler = createServerRpc({
  id: "f936e6cde8b111f1251b1f47233d5058b4beda508b549db93a0e8c69bfd5ab18",
  name: "deleteItem",
  filename: "src/lib/data.functions.ts"
}, (opts) => deleteItem.__executeServer(opts));
const deleteItem = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(deleteItem_createServerFn_handler, async ({
  data
}) => {
  const sql = await getDb();
  await sql`DELETE FROM items WHERE id = ${data.id}`;
  return {
    ok: true
  };
});
const listCategories_createServerFn_handler = createServerRpc({
  id: "1278c454965daca32e094a0bf7971750ac6f9d781f55c6dfd56909ad0387883a",
  name: "listCategories",
  filename: "src/lib/data.functions.ts"
}, (opts) => listCategories.__executeServer(opts));
const listCategories = createServerFn({
  method: "GET"
}).handler(listCategories_createServerFn_handler, async () => {
  try {
    const sql = await getDb();
    return await sql`SELECT * FROM categories ORDER BY name ASC`;
  } catch {
    return [];
  }
});
const createCategory_createServerFn_handler = createServerRpc({
  id: "c163b305eb4750f10aaca980f3b6def76f2e5a017956a4a59d134cd89f68f6fd",
  name: "createCategory",
  filename: "src/lib/data.functions.ts"
}, (opts) => createCategory.__executeServer(opts));
const createCategory = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createCategory_createServerFn_handler, async ({
  data
}) => {
  const sql = await getDb();
  const [row] = await sql`
      INSERT INTO categories ${sql({
    name: data.name,
    description: data.description || null
  })}
      RETURNING *
    `;
  return row;
});
const updateCategory_createServerFn_handler = createServerRpc({
  id: "1b4e12a2a106d829c0e9fc34eb3dd88a3242c50bc9bed9511ca7e73621d72bbf",
  name: "updateCategory",
  filename: "src/lib/data.functions.ts"
}, (opts) => updateCategory.__executeServer(opts));
const updateCategory = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(updateCategory_createServerFn_handler, async ({
  data
}) => {
  const sql = await getDb();
  const [row] = await sql`
      UPDATE categories SET ${sql({
    name: data.name,
    description: data.description ?? null
  })}
      WHERE id = ${data.id}
      RETURNING *
    `;
  return row;
});
const deleteCategory_createServerFn_handler = createServerRpc({
  id: "e4e26d0689e41e94e718c27eeda4ec0b1117a0ed0dc294fe23825ba7fe7b12c1",
  name: "deleteCategory",
  filename: "src/lib/data.functions.ts"
}, (opts) => deleteCategory.__executeServer(opts));
const deleteCategory = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(deleteCategory_createServerFn_handler, async ({
  data
}) => {
  const sql = await getDb();
  await sql`DELETE FROM categories WHERE id = ${data.id}`;
  return {
    ok: true
  };
});
const listSuppliers_createServerFn_handler = createServerRpc({
  id: "99e1a0b8be387149f8f79612629786d00e98a35d942fc19c0c660213fe6fd071",
  name: "listSuppliers",
  filename: "src/lib/data.functions.ts"
}, (opts) => listSuppliers.__executeServer(opts));
const listSuppliers = createServerFn({
  method: "GET"
}).handler(listSuppliers_createServerFn_handler, async () => {
  try {
    const sql = await getDb();
    return await sql`SELECT * FROM suppliers ORDER BY name ASC`;
  } catch {
    return [];
  }
});
const createSupplier_createServerFn_handler = createServerRpc({
  id: "009ba10aeceaaf3149fb21b2bfbd9fb3428d52dd5169657148b6d630d6be0c7c",
  name: "createSupplier",
  filename: "src/lib/data.functions.ts"
}, (opts) => createSupplier.__executeServer(opts));
const createSupplier = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createSupplier_createServerFn_handler, async ({
  data
}) => {
  const sql = await getDb();
  const [row] = await sql`
      INSERT INTO suppliers ${sql({
    name: data.name,
    contact: data.contact || null,
    address: data.address || null,
    notes: data.notes || null
  })}
      RETURNING *
    `;
  return row;
});
const updateSupplier_createServerFn_handler = createServerRpc({
  id: "2e0ab475634d7021450d5af40bc69bc7e8a3fa8aaab6510fb01934b4d7b5a03a",
  name: "updateSupplier",
  filename: "src/lib/data.functions.ts"
}, (opts) => updateSupplier.__executeServer(opts));
const updateSupplier = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(updateSupplier_createServerFn_handler, async ({
  data
}) => {
  const sql = await getDb();
  const [row] = await sql`
      UPDATE suppliers SET ${sql({
    name: data.name,
    contact: data.contact ?? null,
    address: data.address ?? null,
    notes: data.notes ?? null
  })}
      WHERE id = ${data.id}
      RETURNING *
    `;
  return row;
});
const deleteSupplier_createServerFn_handler = createServerRpc({
  id: "20f29926e70807e9ed9e9778898dc55647c1ea919ee998b64fa4d746c565cc26",
  name: "deleteSupplier",
  filename: "src/lib/data.functions.ts"
}, (opts) => deleteSupplier.__executeServer(opts));
const deleteSupplier = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(deleteSupplier_createServerFn_handler, async ({
  data
}) => {
  const sql = await getDb();
  await sql`DELETE FROM suppliers WHERE id = ${data.id}`;
  return {
    ok: true
  };
});
const listTransactions_createServerFn_handler = createServerRpc({
  id: "6af8ea89fc0f78956c5075a5a3f331d23e9bd8cee59b05749228335a55df6cdf",
  name: "listTransactions",
  filename: "src/lib/data.functions.ts"
}, (opts) => listTransactions.__executeServer(opts));
const listTransactions = createServerFn({
  method: "GET"
}).inputValidator((d) => d ?? {}).handler(listTransactions_createServerFn_handler, async ({
  data
}) => {
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
    return rows.map((r) => ({
      ...r,
      item: r.item?.id ? {
        id: r.item.id,
        name: r.item.name,
        unit: r.item.unit
      } : null
    }));
  } catch {
    return [];
  }
});
const listTransactionsAsc_createServerFn_handler = createServerRpc({
  id: "3f022b6363bf3316e06afc7fa0b92c036727f129b4c5b3175c49c486935d57d5",
  name: "listTransactionsAsc",
  filename: "src/lib/data.functions.ts"
}, (opts) => listTransactionsAsc.__executeServer(opts));
const listTransactionsAsc = createServerFn({
  method: "GET"
}).inputValidator((d) => d ?? {}).handler(listTransactionsAsc_createServerFn_handler, async ({
  data
}) => {
  try {
    const sql = await getDb();
    const limit = data?.limit ?? 5e3;
    const rows = await sql`
        SELECT
          t.*,
          row_to_json(i.*) AS item
        FROM transactions t
        LEFT JOIN items i ON i.id = t.item_id
        ORDER BY t.created_at ASC
        LIMIT ${limit}
      `;
    return rows.map((r) => ({
      ...r,
      item: r.item?.id ? {
        id: r.item.id,
        name: r.item.name,
        unit: r.item.unit,
        quantity: r.item.quantity,
        acquisition_cost: r.item.acquisition_cost,
        inventory_classification: r.item.inventory_classification,
        semi_expendable_tier: r.item.semi_expendable_tier
      } : null
    }));
  } catch {
    return [];
  }
});
const createTransaction_createServerFn_handler = createServerRpc({
  id: "3b61ab0617674db56a3b680c6ecd0963890252a1b1877b68031dfc4e6ce6699e",
  name: "createTransaction",
  filename: "src/lib/data.functions.ts"
}, (opts) => createTransaction.__executeServer(opts));
const createTransaction = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createTransaction_createServerFn_handler, async ({
  data
}) => {
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
    source_form_id: data.source_form_id || null
  })}
      RETURNING *
    `;
  return row;
});
const listAuditLogs_createServerFn_handler = createServerRpc({
  id: "8e15f3e92acf301eecb6183f4a288a79a8f3c71e8fa4f1a9665fa577f7b4bc0b",
  name: "listAuditLogs",
  filename: "src/lib/data.functions.ts"
}, (opts) => listAuditLogs.__executeServer(opts));
const listAuditLogs = createServerFn({
  method: "GET"
}).handler(listAuditLogs_createServerFn_handler, async () => {
  try {
    const sql = await getDb();
    return await sql`
      SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500
    `;
  } catch {
    return [];
  }
});
const listIarForms_createServerFn_handler = createServerRpc({
  id: "51583681fe26af7ac0b35efffb9a17089bc28314e15a69e5589ad6268ea8079f",
  name: "listIarForms",
  filename: "src/lib/data.functions.ts"
}, (opts) => listIarForms.__executeServer(opts));
const listIarForms = createServerFn({
  method: "GET"
}).handler(listIarForms_createServerFn_handler, async () => {
  try {
    const sql = await getDb();
    return await sql`SELECT * FROM iar_forms ORDER BY created_at DESC`;
  } catch {
    return [];
  }
});
const createIarForm_createServerFn_handler = createServerRpc({
  id: "16158c8283a84ce27101afb7b58cb7111c0a17f312c20fe184036b2ade9a68ad",
  name: "createIarForm",
  filename: "src/lib/data.functions.ts"
}, (opts) => createIarForm.__executeServer(opts));
const createIarForm = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createIarForm_createServerFn_handler, async ({
  data
}) => {
  const sql = await getDb();
  const [row] = await sql`
      INSERT INTO iar_forms ${sql({
    iar_no: data.iar_no,
    supplier: data.supplier || null,
    invoice_no: data.invoice_no || null,
    accepted_by: data.accepted_by || null,
    created_by: data.created_by || null,
    created_by_name: data.created_by_name || null
  })}
      RETURNING *
    `;
  return row;
});
const createIarItem_createServerFn_handler = createServerRpc({
  id: "d633d8bbf2d22b7c3b68a8337470caaf1cf8388ca1fbd51943a52d58ecb209fd",
  name: "createIarItem",
  filename: "src/lib/data.functions.ts"
}, (opts) => createIarItem.__executeServer(opts));
const createIarItem = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createIarItem_createServerFn_handler, async ({
  data
}) => {
  const sql = await getDb();
  const [row] = await sql`
      INSERT INTO iar_items ${sql({
    iar_id: data.iar_id,
    item_id: data.item_id,
    quantity: Number(data.quantity),
    unit_cost: Number(data.unit_cost || 0),
    remarks: data.remarks || null,
    transaction_id: data.transaction_id || null
  })}
      RETURNING *
    `;
  return row;
});
const createRisForm_createServerFn_handler = createServerRpc({
  id: "94ddd59611abfed79ef0377ac578cea40f37b94576ee1a5ed839b6770376250e",
  name: "createRisForm",
  filename: "src/lib/data.functions.ts"
}, (opts) => createRisForm.__executeServer(opts));
const createRisForm = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createRisForm_createServerFn_handler, async ({
  data
}) => {
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
    created_by_name: data.created_by_name || null
  })}
      RETURNING *
    `;
  return row;
});
const createRisItem_createServerFn_handler = createServerRpc({
  id: "50efed0d3d81485d947f8379c9347711db6fb012f7ee5e98edd422551c594d44",
  name: "createRisItem",
  filename: "src/lib/data.functions.ts"
}, (opts) => createRisItem.__executeServer(opts));
const createRisItem = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createRisItem_createServerFn_handler, async ({
  data
}) => {
  const sql = await getDb();
  const [row] = await sql`
      INSERT INTO ris_items ${sql({
    ris_id: data.ris_id,
    item_id: data.item_id,
    quantity: Number(data.quantity),
    remarks: data.remarks || null,
    transaction_id: data.transaction_id || null
  })}
      RETURNING *
    `;
  return row;
});
const createIcsForm_createServerFn_handler = createServerRpc({
  id: "8aa8813a552cf6f4d6a79827c693b15bf88c365526492915be7e9ca866d6d1b9",
  name: "createIcsForm",
  filename: "src/lib/data.functions.ts"
}, (opts) => createIcsForm.__executeServer(opts));
const createIcsForm = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createIcsForm_createServerFn_handler, async ({
  data
}) => {
  const sql = await getDb();
  const [row] = await sql`
      INSERT INTO ics_forms ${sql({
    ics_no: data.ics_no,
    ris_id: data.ris_id || null,
    custodian_name: data.custodian_name || null,
    office: data.office || null,
    created_by: data.created_by || null,
    created_by_name: data.created_by_name || null
  })}
      RETURNING *
    `;
  return row;
});
const createIcsItem_createServerFn_handler = createServerRpc({
  id: "499d1ddc1c1f4c81325daa91a5b68b118741a799675b374ee718d4e590e3d471",
  name: "createIcsItem",
  filename: "src/lib/data.functions.ts"
}, (opts) => createIcsItem.__executeServer(opts));
const createIcsItem = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createIcsItem_createServerFn_handler, async ({
  data
}) => {
  const sql = await getDb();
  const [row] = await sql`
      INSERT INTO ics_items ${sql({
    ics_id: data.ics_id,
    item_id: data.item_id,
    quantity: Number(data.quantity),
    unit_cost: Number(data.unit_cost || 0),
    remarks: data.remarks || null
  })}
      RETURNING *
    `;
  return row;
});
const createParForm_createServerFn_handler = createServerRpc({
  id: "fcf5097d200732cec92fc7a87d6cf016a30ff2a8ddfe1f93e2c1bcdc7fe0f7c4",
  name: "createParForm",
  filename: "src/lib/data.functions.ts"
}, (opts) => createParForm.__executeServer(opts));
const createParForm = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createParForm_createServerFn_handler, async ({
  data
}) => {
  const sql = await getDb();
  const [row] = await sql`
      INSERT INTO par_forms ${sql({
    par_no: data.par_no,
    ris_id: data.ris_id || null,
    accountable_person: data.accountable_person || null,
    office: data.office || null,
    created_by: data.created_by || null,
    created_by_name: data.created_by_name || null
  })}
      RETURNING *
    `;
  return row;
});
const createParItem_createServerFn_handler = createServerRpc({
  id: "a158875d61597765e34116ab020b9db8d44ee5fd6c16c99f9611995861ddd294",
  name: "createParItem",
  filename: "src/lib/data.functions.ts"
}, (opts) => createParItem.__executeServer(opts));
const createParItem = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(createParItem_createServerFn_handler, async ({
  data
}) => {
  const sql = await getDb();
  const [row] = await sql`
      INSERT INTO par_items ${sql({
    par_id: data.par_id,
    item_id: data.item_id,
    quantity: Number(data.quantity),
    unit_cost: Number(data.unit_cost || 0),
    remarks: data.remarks || null
  })}
      RETURNING *
    `;
  return row;
});
const getInventorySnapshot_createServerFn_handler = createServerRpc({
  id: "6ea5e6a167a18fd4e1eae938b817a4bfd8414797ee0073cbb0123a8f5e19b735",
  name: "getInventorySnapshot",
  filename: "src/lib/data.functions.ts"
}, (opts) => getInventorySnapshot.__executeServer(opts));
const getInventorySnapshot = createServerFn({
  method: "GET"
}).handler(getInventorySnapshot_createServerFn_handler, async () => {
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
    const low = items.filter((i) => Number(i.quantity) <= Number(i.reorder_level)).slice(0, 25);
    return {
      total_items: items.length,
      out_of_stock: items.filter((i) => Number(i.quantity) === 0).length,
      low_stock_items: low.map((i) => ({
        name: i.name,
        qty: Number(i.quantity),
        unit: i.unit,
        reorder: Number(i.reorder_level),
        category: i.category_name,
        supplier: i.supplier_name
      })),
      recent_transactions: txs.slice(0, 30).map((t) => ({
        item: t.item_name,
        type: t.type,
        qty: Number(t.quantity),
        at: t.created_at
      }))
    };
  } catch (e) {
    console.error("getInventorySnapshot error:", e);
    return null;
  }
});
export {
  createCategory_createServerFn_handler,
  createIarForm_createServerFn_handler,
  createIarItem_createServerFn_handler,
  createIcsForm_createServerFn_handler,
  createIcsItem_createServerFn_handler,
  createItem_createServerFn_handler,
  createParForm_createServerFn_handler,
  createParItem_createServerFn_handler,
  createRisForm_createServerFn_handler,
  createRisItem_createServerFn_handler,
  createSupplier_createServerFn_handler,
  createTransaction_createServerFn_handler,
  deleteCategory_createServerFn_handler,
  deleteItem_createServerFn_handler,
  deleteSupplier_createServerFn_handler,
  getInventorySnapshot_createServerFn_handler,
  getItem_createServerFn_handler,
  importItems_createServerFn_handler,
  listAuditLogs_createServerFn_handler,
  listCategories_createServerFn_handler,
  listIarForms_createServerFn_handler,
  listItems_createServerFn_handler,
  listSuppliers_createServerFn_handler,
  listTransactionsAsc_createServerFn_handler,
  listTransactions_createServerFn_handler,
  updateCategory_createServerFn_handler,
  updateItemMonthlyQuantity_createServerFn_handler,
  updateItem_createServerFn_handler,
  updateSupplier_createServerFn_handler
};
