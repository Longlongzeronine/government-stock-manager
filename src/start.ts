import { createStart, createMiddleware } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "./integrations/supabase/client";
import { writeAuditEvent } from "./lib/audit.server";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const publicServerFunctions = new Set([
  "signInDeveloper",
  "getDeveloperSession",
  "signOutDeveloper",
  "getRisVerification",
]);

const adminOnlyFunctions = new Set([
  "createItem",
  "importItems",
  "updateItem",
  "updateItemMonthlyQuantity",
  "deleteItem",
  "createCategory",
  "updateCategory",
  "deleteCategory",
  "deleteSupplier",
  "listAuditLogs",
  "createFormsFlowBackup",
  "deleteAdminUser",
]);

function auditResultRecord(result: unknown): Record<string, unknown> {
  let value = result;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const record = value as Record<string, unknown>;
    if (record.result && typeof record.result === "object") value = record.result;
    else if (!record.id && record.data && typeof record.data === "object") value = record.data;
    else return record;
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function auditEventForFunction(name: string, result: unknown) {
  const source = auditResultRecord(result);
  const flow = String(source.property_flow || "").toLowerCase();
  const flowArea = flow === "semi-expendable" ? "Semi-Ex" : flow === "ppe" ? "PPE" : flow === "supplies" ? "Supplies" : "";
  const requestedArea = String(source.audit_area || "").toLowerCase();
  const explicitArea = requestedArea === "semi-expendable" ? "Semi-Ex" : requestedArea === "ppe" ? "PPE" : requestedArea === "supplies" ? "Supplies" : String(source.audit_area || "");
  const created: Record<string, string> = {
    createIarForm: "iar",
    postIar: "iar",
    createRisForm: "ris",
    createIcsForm: "ics",
    createParForm: "par",
  };
  const updated: Record<string, string> = {
    updateRisFormStatus: "ris",
  };
  if (created[name]) return { action: `form_created_${created[name]}`, area: explicitArea || flowArea || (created[name] === "ics" ? "Semi-Ex" : created[name] === "par" ? "PPE" : "Supplies") };
  if (updated[name]) return { action: `form_updated_${updated[name]}`, area: "Approval" };
  if (["approveIar", "approveRis", "approveItr"].includes(name)) {
    const type = name === "approveIar" ? "iar" : name === "approveRis" ? "ris" : "itr";
    return { action: `form_updated_${type}`, area: "Approval" };
  }

  const formType = String(source.document_type || "").trim().toLowerCase();
  const operation = String(source.audit_operation || "");
  if (name === "savePpeDocument" && formType && ["created", "updated"].includes(operation)) {
    return { action: `form_${operation}_${formType}`, area: explicitArea || flowArea || (formType === "splc" || formType === "itr" || formType === "rpcsp" ? "Semi-Ex" : "PPE") };
  }
  if (name === "approvePpeDocument" && formType) {
    return { action: `form_updated_${formType}`, area: explicitArea || flowArea || "Approval" };
  }

  const recordEvents: Record<string, { action: string; area: string }> = {
    createItem: { action: "record_created_inventory_item", area: "Inventory" },
    updateItem: { action: "record_updated_inventory_item", area: "Inventory" },
    updateItemMonthlyQuantity: { action: "record_updated_inventory_item", area: "Inventory" },
    createCategory: { action: "record_created_category", area: "Categories" },
    updateCategory: { action: "record_updated_category", area: "Categories" },
    createSupplier: { action: "record_created_supplier", area: "Suppliers" },
    updateSupplier: { action: "record_updated_supplier", area: "Suppliers" },
    createAdminUser: { action: "record_created_user", area: "Users" },
    setUserRole: { action: "record_updated_user", area: "Users" },
    setUserDisabled: { action: "record_updated_user", area: "Users" },
  };
  if (name === "createTransaction" && !["IAR", "RIS"].includes(String(source.source_form_type || "").toUpperCase())) {
    return { action: "record_created_stock_transaction", area: "Stock In / Out" };
  }
  const recordEvent = recordEvents[name];
  return recordEvent ? { ...recordEvent, area: explicitArea || recordEvent.area } : null;
}

function auditResultSummary(result: unknown) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return Array.isArray(result) ? { result_count: result.length } : {};
  }
  const source = auditResultRecord(result);
  const summary: Record<string, unknown> = {};
  for (const key of ["id", "userId", "email", "full_name", "name", "stock_number", "property_flow", "audit_area", "area", "source_form_type", "reference_number", "ris_no", "iar_no", "ics_no", "par_no", "document_no", "document_type", "audit_operation", "status", "disabled", "role", "roles", "formKey", "canAccess", "changesCount", "employmentStatus"]) {
    const value = source[key];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || (Array.isArray(value) && value.every((entry) => typeof entry === "string"))) {
      summary[key] = value;
    }
  }
  return summary;
}

const inventoryAuthMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return next({
      headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {},
    });
  })
  .server(async ({ next, method, serverFnMeta }) => {
    if (publicServerFunctions.has(serverFnMeta.name)) return next();

    const { readDeveloperSession } =
      await import("./lib/developer-session.server");
    const developerIdentity = await readDeveloperSession();
    let role = developerIdentity ? "admin" : "";
    const assignedRoles = new Set<string>(developerIdentity ? ["admin"] : []);
    let auditActorId = developerIdentity ? `developer:${developerIdentity.username}` : null;
    let auditActorEmail = developerIdentity ? developerIdentity.username : null;
    let auditActorName = developerIdentity?.username ?? null;

    if (!developerIdentity) {
      const authorization = getRequestHeader("authorization") || "";
      const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
      if (!accessToken) throw new Error("Authentication required.");

      const runtime = globalThis as typeof globalThis & {
        __WORKER_ENV__?: Record<string, unknown>;
        process?: { env?: Record<string, string | undefined> };
      };
      const env = runtime.__WORKER_ENV__ ?? runtime.process?.env ?? {};
      const url = String(
        env.SUPABASE_URL ||
          env.VITE_SUPABASE_URL ||
          import.meta.env.VITE_SUPABASE_URL ||
          "",
      );
      const anonKey = String(
        env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          "",
      );
      if (!url || !anonKey)
        throw new Error("Authentication service is not configured.");

      const client = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });
      const {
        data: { user },
        error,
      } = await client.auth.getUser(accessToken);
      if (error || !user) throw new Error("Authentication required.");
      auditActorId = user.id;
      auditActorEmail = user.email ?? null;
      auditActorName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? null;

      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("status,disabled")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) throw new Error("Could not verify account status.");
      if (["pending", "declined", "disabled"].includes(profile?.status ?? "") || profile?.disabled) {
        throw new Error("Account is not approved for access.");
      }

      const { data: roles, error: rolesError } = await client
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (rolesError) throw new Error("Could not verify account permissions.");
      (roles ?? []).forEach((row: { role: string }) => assignedRoles.add(row.role));
      role = assignedRoles.has("admin") ? "admin" : [...assignedRoles][0] ?? "regular_user";

    }

    // These endpoints perform their own role or form permission checks. Let
    // them reach that authorization instead of rejecting them as inventory writes.
    const formGuardedFunctions = new Set(["createIarForm", "createIarItem", "postIar", "updateIarPriceLots", "createRisForm", "createRisItem", "updateRisFormStatus", "savePpeDocument", "approvePpeDocument", "createTransaction", "setRoleFormPermission"]);
    const canWrite = ["admin", "super_admin", "supply_officer", "inspection_officer", "financial_analyst"].some((candidate) => assignedRoles.has(candidate));
    if (method !== "GET" && !canWrite && !formGuardedFunctions.has(serverFnMeta.name) && !adminOnlyFunctions.has(serverFnMeta.name)) {
      throw Object.assign(new Error("Forbidden: write access required."), { statusCode: 403 });
    }
    if (adminOnlyFunctions.has(serverFnMeta.name) && role !== "admin" && role !== "super_admin") {
      throw Object.assign(new Error("Forbidden: administrator access required."), { statusCode: 403 });
    }
    const result = await next();
    const auditEvent = auditEventForFunction(serverFnMeta.name, result);
    if (auditEvent) {
      const summary = auditResultSummary(result);
      const rowId = [summary.id, summary.userId].find((value): value is string => typeof value === "string") ?? null;
      try {
        await writeAuditEvent({
          actorId: auditActorId,
          actorEmail: auditActorEmail,
          action: auditEvent.action,
          tableName: auditEvent.area,
          rowId,
          payload: { actor_name: auditActorName, server_function: serverFnMeta.name, area: auditEvent.area, ...summary },
        });
      } catch (error) {
        console.error(`Could not record ${serverFnMeta.name} audit event`, error);
      }
    }
    return result;
  });

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
  functionMiddleware: [inventoryAuthMiddleware],
}));
