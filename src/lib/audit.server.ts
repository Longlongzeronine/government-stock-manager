import { getRestWriteConfig, isWorkersRuntime, sbInsert } from "@/lib/supabase-rest";

export interface AuditEvent {
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  tableName: string;
  rowId?: string | null;
  payload?: Record<string, unknown> | null;
}

let localSchemaReady: Promise<void> | null = null;

function localDatabaseUnavailable(error: unknown) {
  const value = error as { code?: string; message?: string };
  return Boolean(
    (value?.code && (/^08/.test(value.code) || ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EHOSTUNREACH"].includes(value.code))) ||
      /connect(?:ion)? (?:refused|timeout|terminated)|connection closed unexpectedly|econnrefused|etimedout|ehostunreach/i.test(value?.message || ""),
  );
}

export async function writeAuditEvent(event: AuditEvent) {
  const row = {
    actor_id: event.actorId,
    actor_email: event.actorEmail,
    action: event.action,
    table_name: event.tableName,
    row_id: event.rowId ?? null,
    payload: event.payload ?? null,
  };

  if (!isWorkersRuntime()) {
    try {
      const { ensureSchema, ensureAuditLogSchema, getSql } = await import("@/lib/local-db");
      localSchemaReady ??= ensureSchema().then(() => undefined);
      await localSchemaReady;
      await ensureAuditLogSchema();
      const sql = getSql();
      await sql`INSERT INTO audit_logs ${sql(row)}`;
      return;
    } catch (error) {
      if (!localDatabaseUnavailable(error)) throw error;
    }
  }

  const config = getRestWriteConfig();
  if (!config) throw new Error("Audit log storage is not configured");
  await sbInsert("audit_logs", row, config);
}
