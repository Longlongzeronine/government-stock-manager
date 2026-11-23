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

const auditSkippedFunctions = new Set(["recordUserAuditActivity", "listAdminUsers", "listRoleMatrix"]);

function auditTableForFunction(name: string) {
  if (/User|Role|Admin|Password|Disabled|Approval/i.test(name)) return "user_accounts";
  if (/Iar|Ris|Ics|Par|Ppe|Itr|Rspi|Rpcsp|Form/i.test(name)) return "forms";
  if (/Item|Inventory|Transaction|Category|Supplier|Stock/i.test(name)) return "inventory";
  return "site";
}

function auditActionForFunction(name: string) {
  const known: Record<string, string> = {
    approveUser: "user_approved",
    createAdminUser: "account_created",
    createRisForm: "form_submitted",
    declineUser: "user_declined",
    deleteAdminUser: "account_deleted",
    postIar: "form_submitted",
    resetUserPassword: "password_reset",
    setRoleFormPermission: "form_permission_changed",
    setUserDisabled: "user_status_changed",
    setUserRole: "user_role_changed",
    updateRisFormStatus: "form_status_changed",
  };
  if (known[name]) return known[name];
  if (/^create/.test(name)) return "record_created";
  if (/^update|^set|^remember/.test(name)) return "record_updated";
  if (/^delete/.test(name)) return "record_deleted";
  if (/^approve/.test(name)) return "record_approved";
  return `site_action_${name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()}`;
}

function auditResultSummary(result: unknown) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return Array.isArray(result) ? { result_count: result.length } : {};
  }
  const source = result as Record<string, unknown>;
  const summary: Record<string, unknown> = {};
  for (const key of ["id", "userId", "email", "name", "ris_no", "iar_no", "document_no", "status", "disabled", "role", "roles", "formKey", "canAccess", "changesCount", "employmentStatus"]) {
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
    const formGuardedFunctions = new Set(["createIarForm", "createIarItem", "postIar", "updateIarPriceLots", "createRisForm", "createRisItem", "updateRisFormStatus", "savePpeDocument", "approvePpeDocument", "createTransaction", "setRoleFormPermission", "recordUserAuditActivity"]);
    const canWrite = ["admin", "super_admin", "supply_officer", "inspection_officer", "financial_analyst"].some((candidate) => assignedRoles.has(candidate));
    if (method !== "GET" && !canWrite && !formGuardedFunctions.has(serverFnMeta.name) && !adminOnlyFunctions.has(serverFnMeta.name)) {
      throw Object.assign(new Error("Forbidden: write access required."), { statusCode: 403 });
    }
    if (adminOnlyFunctions.has(serverFnMeta.name) && role !== "admin" && role !== "super_admin") {
      throw Object.assign(new Error("Forbidden: administrator access required."), { statusCode: 403 });
    }
    const result = await next();
    if ((!auditSkippedFunctions.has(serverFnMeta.name) && method !== "GET") || serverFnMeta.name === "createFormsFlowBackup") {
      const summary = auditResultSummary(result);
      const rowId = [summary.id, summary.userId].find((value): value is string => typeof value === "string") ?? null;
      try {
        await writeAuditEvent({
          actorId: auditActorId,
          actorEmail: auditActorEmail,
          action: auditActionForFunction(serverFnMeta.name),
          tableName: auditTableForFunction(serverFnMeta.name),
          rowId,
          payload: { actor_name: auditActorName, server_function: serverFnMeta.name, ...summary },
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
