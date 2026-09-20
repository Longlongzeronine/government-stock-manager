// Uses the server-side local PostgreSQL client for inventory snapshot

export async function getInventorySnapshot() {
  try {
    const { getSql } = await import("@/lib/local-db");
    const sql = getSql();
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
}
