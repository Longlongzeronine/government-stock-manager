import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ACCESS_PRESETS,
  SERVER_FUNCTION_ACCESS,
  canAccess,
  canManageTarget,
  isAccessSchemaUnavailable,
  normalizeAccess,
  routeAccessForPath,
} from "../src/lib/access-control.ts";
import { ROLE_CODES, ROLE_LABELS } from "../src/lib/form-definitions.ts";

test("an account without an access record receives dashboard only", () => {
  assert.equal(canAccess(null, "dashboard", "view"), true);
  assert.equal(canAccess(null, "inventory", "view"), false);
});

test("an explicit empty matrix denies access", () => {
  assert.equal(canAccess({}, "dashboard", "view"), false);
  assert.equal(canAccess({ audit_logs: [] }, "audit_logs", "view"), false);
});

test("view does not grant create, update, delete, import, or manage", () => {
  const access = { inventory: ["view"], approvals: ["view"] };
  for (const action of ["create", "update", "delete", "import"]) assert.equal(canAccess(access, "inventory", action), false);
  assert.equal(canAccess(access, "approvals", "approve"), false);
});

test("normalization adds only documented dependencies", () => {
  const normalized = normalizeAccess({ inventory: ["delete"], forms: ["approve"], migrations: ["run"], unknown: ["view"] });
  assert.deepEqual(normalized.inventory, ["view", "delete"]);
  assert.deepEqual(normalized.forms, ["view", "approve"]);
  assert.deepEqual(normalized.migrations, ["view", "run"]);
  assert.deepEqual(normalized.dev_space, ["view"]);
  assert.equal("unknown" in normalized, false);
});

test("the access catalog contains only Supplify modules", () => {
  for (const preset of Object.values(ACCESS_PRESETS)) {
    assert.equal("members" in preset.access, false);
    assert.equal("payroll_deductions" in preset.access, false);
    assert.equal("api_console" in preset.access, false);
  }
});

test("presets stay synchronized with the Users & Roles catalog", () => {
  assert.deepEqual(Object.keys(ACCESS_PRESETS), ROLE_CODES);
  for (const role of ROLE_CODES) assert.equal(ACCESS_PRESETS[role].label, ROLE_LABELS[role]);
  assert.equal(canAccess(ACCESS_PRESETS.regular_user.access, "inventory", "view"), true);
  assert.equal(canAccess(ACCESS_PRESETS.regular_user.access, "inventory", "update"), false);
  assert.equal(canAccess(ACCESS_PRESETS.super_admin.access, "migrations", "run"), true);
  assert.equal(canAccess(ACCESS_PRESETS.supply_officer.access, "inventory", "update"), true);
  assert.equal(canAccess(ACCESS_PRESETS.admin.access, "user_access", "manage"), true);
});

test("an access administrator can manage another account but never itself", () => {
  assert.equal(canManageTarget("admin-user", "target-user"), true);
  assert.equal(canManageTarget("admin-user", "admin-user"), false);
});

test("legacy admin fallback is limited to a genuinely missing access schema", () => {
  assert.equal(isAccessSchemaUnavailable({ code: "PGRST202", message: "Could not find public.get_my_access" }), true);
  assert.equal(isAccessSchemaUnavailable({ code: "PGRST205", message: "Could not find public.user_access" }), true);
  assert.equal(isAccessSchemaUnavailable({ code: "500", message: "network timeout" }), false);
});

test("navigation routes map to their view or manage permission", () => {
  assert.deepEqual(routeAccessForPath("/inventory"), { module: "inventory" });
  assert.deepEqual(routeAccessForPath("/user-access"), { module: "user_access", action: "manage" });
  assert.deepEqual(routeAccessForPath("/migrations"), { module: "migrations" });
});

test("every non-public server function is registered in the fail-closed map", () => {
  const files = ["data.functions.ts", "admin.functions.ts", "ai.functions.ts", "access.functions.ts", "migration.functions.ts"];
  const names = files.flatMap((file) => {
    const source = readFileSync(new URL(`../src/lib/${file}`, import.meta.url), "utf8");
    return [...source.matchAll(/export const\s+(\w+)\s*=\s*createServerFn/g)].map((match) => match[1]);
  });
  const publicFunctions = new Set(["getRisVerification"]);
  const missing = names.filter((name) => !publicFunctions.has(name) && !SERVER_FUNCTION_ACCESS[name]);
  assert.deepEqual(missing, []);
});

test("unmapped and unauthorized direct server calls use HTTP 403", () => {
  const middleware = readFileSync(new URL("../src/start.ts", import.meta.url), "utf8");
  assert.match(middleware, /Access map missing for server function/);
  assert.match(middleware, /statusCode:\s*403/);
  assert.match(middleware, /get_my_access/);
});

test("database save enforces self-lockout protection and access-change auditing", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20261122010000_user_access_control.sql", import.meta.url), "utf8");
  assert.match(migration, /v_actor = _target_user_id/);
  assert.match(migration, /insert into public\.user_access_audit_logs/);
  assert.match(migration, /previous_access, new_access, administrator_user_id/);
});
