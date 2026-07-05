import { createServerFn } from "@tanstack/react-start";
import { getDb } from "./db";

export const createIarForm = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const rows = await sql`
      INSERT INTO iar_forms (iar_no, supplier, invoice_no, accepted_by, created_by, created_by_name)
      VALUES (${data.iar_no}, ${data.supplier ?? null}, ${data.invoice_no ?? null}, ${data.accepted_by ?? null}, ${data.created_by ?? null}, ${data.created_by_name ?? null})
      RETURNING id
    `;
    return rows[0];
  });

export const createIarItem = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const rows = await sql`
      INSERT INTO iar_items (iar_id, item_id, quantity, unit_cost, remarks, transaction_id)
      VALUES (${data.iar_id}, ${data.item_id}, ${Number(data.quantity)}, ${Number(data.unit_cost || 0)}, ${data.remarks ?? null}, ${data.transaction_id ?? null})
      RETURNING id
    `;
    return rows[0];
  });

export const createRisForm = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const rows = await sql`
      INSERT INTO ris_forms (ris_no, office, purpose, requested_by, approved_by, issued_by, received_by, created_by, created_by_name)
      VALUES (${data.ris_no}, ${data.office}, ${data.purpose ?? null}, ${data.requested_by ?? null}, ${data.approved_by ?? null}, ${data.issued_by ?? null}, ${data.received_by ?? null}, ${data.created_by ?? null}, ${data.created_by_name ?? null})
      RETURNING id
    `;
    return rows[0];
  });

export const createRisItem = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const rows = await sql`
      INSERT INTO ris_items (ris_id, item_id, quantity, remarks, transaction_id)
      VALUES (${data.ris_id}, ${data.item_id}, ${Number(data.quantity)}, ${data.remarks ?? null}, ${data.transaction_id ?? null})
      RETURNING id
    `;
    return rows[0];
  });

export const createIcsForm = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const rows = await sql`
      INSERT INTO ics_forms (ics_no, ris_id, custodian_name, office, created_by, created_by_name)
      VALUES (${data.ics_no}, ${data.ris_id ?? null}, ${data.custodian_name}, ${data.office}, ${data.created_by ?? null}, ${data.created_by_name ?? null})
      RETURNING id
    `;
    return rows[0];
  });

export const createIcsItems = createServerFn({ method: "POST" })
  .inputValidator((d: { items: any[] }) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    for (const item of data.items) {
      await sql`
        INSERT INTO ics_items (ics_id, item_id, quantity, unit_cost, remarks)
        VALUES (${item.ics_id}, ${item.item_id}, ${Number(item.quantity)}, ${Number(item.unit_cost || 0)}, ${item.remarks ?? null})
      `;
    }
    return { ok: true };
  });

export const createParForm = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    const rows = await sql`
      INSERT INTO par_forms (par_no, ris_id, accountable_person, office, created_by, created_by_name)
      VALUES (${data.par_no}, ${data.ris_id ?? null}, ${data.accountable_person}, ${data.office}, ${data.created_by ?? null}, ${data.created_by_name ?? null})
      RETURNING id
    `;
    return rows[0];
  });

export const createParItems = createServerFn({ method: "POST" })
  .inputValidator((d: { items: any[] }) => d)
  .handler(async ({ data }) => {
    const sql = await getDb();
    for (const item of data.items) {
      await sql`
        INSERT INTO par_items (par_id, item_id, quantity, unit_cost, remarks)
        VALUES (${item.par_id}, ${item.item_id}, ${Number(item.quantity)}, ${Number(item.unit_cost || 0)}, ${item.remarks ?? null})
      `;
    }
    return { ok: true };
  });
