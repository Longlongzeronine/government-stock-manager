import { ROLE_CODES, ROLE_LABELS, type RoleCode } from "./form-definitions.ts";

export type AccessMatrix = Record<string, string[]>;

export type AccessModule = {
  key: string;
  label: string;
  description: string;
  group: "operations" | "administration" | "developer";
  actions: string[];
};

export const ACCESS_GROUPS = [
  { key: "operations", label: "Inventory Operations", description: "Supplify inventory, forms, stock, and daily operational pages." },
  { key: "administration", label: "Administration", description: "Supplify approvals, user access, and audit records." },
  { key: "developer", label: "Dev Space", description: "Protected Supplify maintenance tools and database migrations." },
] as const;

export const ACCESS_MODULES: AccessModule[] = [
  { key: "dashboard", label: "Dashboard", description: "Inventory overview, alerts, charts, and quick actions.", group: "operations", actions: ["view"] },
  { key: "inventory", label: "Inventory", description: "Items, quantities, prices, imports, and catalog maintenance.", group: "operations", actions: ["view", "create", "update", "import", "delete"] },
  { key: "scanner", label: "Scanner", description: "Barcode and QR lookup, labels, and item history.", group: "operations", actions: ["view"] },
  { key: "ris_history", label: "RIS History", description: "Previously prepared requisition and issue slips.", group: "operations", actions: ["view"] },
  { key: "forms", label: "Forms Flow", description: "Government inventory forms, accountability records, and exports.", group: "operations", actions: ["view", "create", "update", "approve", "export"] },
  { key: "requisitions", label: "Requisitions", description: "Prepare, update, print, and remove requisition drafts.", group: "operations", actions: ["view", "create", "update", "delete"] },
  { key: "stock", label: "Stock In / Out", description: "Review and record stock movements.", group: "operations", actions: ["view", "create", "update", "delete"] },
  { key: "categories", label: "Categories", description: "Inventory category maintenance.", group: "operations", actions: ["view", "create", "update", "delete"] },
  { key: "suppliers", label: "Suppliers", description: "Supplier records and contact details.", group: "operations", actions: ["view", "create", "update", "delete"] },
  { key: "assistant", label: "AI Assistant", description: "Ask inventory questions using the approved assistant.", group: "operations", actions: ["view", "use"] },

  { key: "approvals", label: "Approvals", description: "Review, recommend, approve, release, or reject Supplify forms.", group: "administration", actions: ["view", "review", "recommend", "approve", "release", "reject"] },
  { key: "user_access", label: "User Access", description: "Assign explicit Supplify access to other accounts.", group: "administration", actions: ["manage"] },
  { key: "audit_logs", label: "Audit Logs", description: "Inventory and access-change audit events.", group: "administration", actions: ["view"] },

  { key: "dev_space", label: "Dev Space", description: "Protected Supplify developer workspace.", group: "developer", actions: ["view"] },
  { key: "migrations", label: "Migrations", description: "Review migration state and execute bundled pending SQL.", group: "developer", actions: ["view", "run"] },
] as const;

const moduleByKey = new Map(ACCESS_MODULES.map((module) => [module.key, module]));

export const DEFAULT_ACCESS: AccessMatrix = { dashboard: ["view"] };

export function normalizeAccess(input: unknown): AccessMatrix {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const result: AccessMatrix = {};
  for (const [moduleKey, rawActions] of Object.entries(input as Record<string, unknown>)) {
    const definition = moduleByKey.get(moduleKey);
    if (!definition || !Array.isArray(rawActions)) continue;
    const allowed = new Set(definition.actions);
    const selected = [...new Set(rawActions.filter((action): action is string => typeof action === "string" && allowed.has(action)))];
    if (selected.some((action) => action !== "view") && allowed.has("view") && !selected.includes("view")) selected.unshift("view");
    result[moduleKey] = definition.actions.filter((action) => selected.includes(action));
  }
  if (result.migrations?.length) result.dev_space = ["view"];
  return result;
}

export function canAccess(access: AccessMatrix | null | undefined, module: string, action = "view") {
  const effective = access == null ? DEFAULT_ACCESS : access;
  return Array.isArray(effective[module]) && effective[module].includes(action);
}

export function canManageTarget(actorUserId: string, targetUserId: string) {
  return Boolean(actorUserId && targetUserId && actorUserId !== targetUserId);
}

function matrix(entries: Record<string, string[]>) {
  return normalizeAccess(entries);
}

const allAccess = Object.fromEntries(ACCESS_MODULES.map((module) => [module.key, module.actions]));
const viewerAccess = matrix({
  dashboard: ["view"], inventory: ["view"], scanner: ["view"], ris_history: ["view"],
  forms: ["view"], requisitions: ["view"], stock: ["view"], categories: ["view"], suppliers: ["view"],
  assistant: ["view"],
});

const rolePresetAccess: Record<RoleCode, AccessMatrix> = {
  super_admin: normalizeAccess(allAccess),
  regular_user: matrix({ ...viewerAccess }),
  permanent_employee: matrix({ ...viewerAccess }),
  supply_officer: matrix({
    ...viewerAccess,
    inventory: ["view", "create", "update", "import"],
    stock: ["view", "create", "update", "delete"],
    forms: ["view", "create", "update", "export"],
    requisitions: ["view", "create", "update", "delete"],
    categories: ["view", "create", "update", "delete"],
    suppliers: ["view", "create", "update", "delete"],
    assistant: ["view", "use"],
    approvals: ["view", "review"],
  }),
  inspection_officer: matrix({
    ...viewerAccess,
    forms: ["view", "update", "approve", "export"],
    approvals: ["view", "review", "recommend", "approve", "reject"],
  }),
  financial_analyst: matrix({
    ...viewerAccess,
    forms: ["view", "export"],
    approvals: ["view", "review"],
  }),
  admin: normalizeAccess(allAccess),
};

const rolePresetDescriptions: Record<RoleCode, string> = {
  super_admin: "Full Supplify access, including User Access, audit logs, Dev Space, and migrations.",
  regular_user: "Standard read access; available forms follow the Form access matrix.",
  permanent_employee: "Standard read access; permanent-employee forms follow the Form access matrix.",
  supply_officer: "Operational create and update access for inventory, forms, requisitions, and stock.",
  inspection_officer: "Operational read access plus form inspection and approval actions.",
  financial_analyst: "Read and export access for inventory forms and review workflows.",
  admin: "Full Supplify access, including account administration and developer tools.",
};

export const ACCESS_PRESETS = Object.fromEntries(ROLE_CODES.map((role) => [role, {
  label: ROLE_LABELS[role],
  description: rolePresetDescriptions[role],
  access: rolePresetAccess[role],
}])) as Record<RoleCode, { label: string; description: string; access: AccessMatrix }>;

export function isAccessSchemaUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string; details?: string };
  const code = String(candidate.code ?? "").toUpperCase();
  const text = `${candidate.message ?? ""} ${candidate.details ?? ""}`.toLowerCase();
  return ["PGRST202", "PGRST205", "42P01", "42883"].includes(code)
    || text.includes("get_my_access")
    || text.includes("user_access") && (text.includes("not find") || text.includes("does not exist"));
}

export type AccessRequirement = { module: string; action?: string };

const any = (...requirements: AccessRequirement[]) => requirements;

export const SERVER_FUNCTION_ACCESS: Record<string, AccessRequirement[]> = {
  listItems: any({ module: "dashboard" }, { module: "inventory" }, { module: "scanner" }, { module: "forms" }, { module: "stock" }, { module: "requisitions" }, { module: "assistant" }),
  getItem: any({ module: "inventory" }, { module: "scanner" }, { module: "forms" }, { module: "requisitions" }),
  createItem: any({ module: "inventory", action: "create" }, { module: "forms", action: "create" }),
  importItems: any({ module: "inventory", action: "import" }),
  updateItem: any({ module: "inventory", action: "update" }),
  updateItemMonthlyQuantity: any({ module: "inventory", action: "update" }),
  deleteItem: any({ module: "inventory", action: "delete" }),
  listCategories: any({ module: "dashboard" }, { module: "inventory" }, { module: "categories" }, { module: "forms" }),
  createCategory: any({ module: "categories", action: "create" }, { module: "inventory", action: "create" }),
  updateCategory: any({ module: "categories", action: "update" }),
  deleteCategory: any({ module: "categories", action: "delete" }),
  listSuppliers: any({ module: "dashboard" }, { module: "inventory" }, { module: "suppliers" }, { module: "forms" }),
  createSupplier: any({ module: "suppliers", action: "create" }),
  updateSupplier: any({ module: "suppliers", action: "update" }),
  deleteSupplier: any({ module: "suppliers", action: "delete" }),
  listTransactions: any({ module: "dashboard" }, { module: "scanner" }, { module: "forms" }, { module: "stock" }, { module: "assistant" }),
  listTransactionsAsc: any({ module: "forms" }, { module: "stock" }),
  createTransaction: any({ module: "stock", action: "create" }, { module: "forms", action: "create" }),
  listAuditLogs: any({ module: "audit_logs" }),
  getInventorySnapshot: any({ module: "dashboard" }, { module: "assistant" }),
  askAssistant: any({ module: "assistant", action: "use" }),

  listIarForms: any({ module: "forms" }, { module: "approvals" }), getIarFormDetails: any({ module: "forms" }, { module: "approvals" }),
  listIarLineRemarks: any({ module: "forms" }), postIar: any({ module: "forms", action: "create" }),
  createIarForm: any({ module: "forms", action: "create" }), createIarItem: any({ module: "forms", action: "create" }),
  updateIarPriceLots: any({ module: "forms", action: "update" }),
  listRisForms: any({ module: "forms" }, { module: "ris_history" }, { module: "approvals" }),
  getRisFormDetails: any({ module: "forms" }, { module: "ris_history" }, { module: "approvals" }),
  getRisFormStatus: any({ module: "forms" }, { module: "ris_history" }, { module: "approvals" }),
  updateRisFormStatus: any({ module: "forms", action: "update" }, { module: "approvals", action: "review" }),
  createRisForm: any({ module: "forms", action: "create" }), createRisItem: any({ module: "forms", action: "create" }),
  listFormPersonnelMemory: any({ module: "forms" }), rememberFormPersonnel: any({ module: "forms", action: "update" }),
  reserveNextFormNumber: any({ module: "forms", action: "create" }), getNextRisNumberFromHistory: any({ module: "forms" }),
  listIcsForms: any({ module: "forms" }), listAccountabilityEvents: any({ module: "forms" }),
  createIcsForm: any({ module: "forms", action: "create" }), createIcsItem: any({ module: "forms", action: "create" }),
  createParForm: any({ module: "forms", action: "create" }), createParItem: any({ module: "forms", action: "create" }),
  listPpeDocuments: any({ module: "forms" }, { module: "approvals" }), listParForms: any({ module: "forms" }),
  savePpeDocument: any({ module: "forms", action: "create" }, { module: "forms", action: "update" }),
  createFormsFlowBackup: any({ module: "forms", action: "export" }),
  approvePpeDocument: any({ module: "approvals", action: "approve" }), approveIar: any({ module: "approvals", action: "approve" }),
  approveRis: any({ module: "approvals", action: "approve" }), approveItr: any({ module: "approvals", action: "approve" }),
  reportPropertyLoss: any({ module: "forms", action: "create" }), receiveReturnedProperty: any({ module: "forms", action: "update" }),
  generateRegspi: any({ module: "forms", action: "create" }), generateRspi: any({ module: "forms", action: "create" }),
  generateRpcsp: any({ module: "forms", action: "create" }), checkInventoryReconciliation: any({ module: "forms" }),

  listAdminUsers: any({ module: "user_access", action: "manage" }), createAdminUser: any({ module: "user_access", action: "manage" }),
  setUserRole: any({ module: "user_access", action: "manage" }), listRoleMatrix: any({ module: "user_access", action: "manage" }),
  setRoleFormPermission: any({ module: "user_access", action: "manage" }), batchSetRoleFormPermissions: any({ module: "user_access", action: "manage" }),
  resetUserPassword: any({ module: "user_access", action: "manage" }), setUserDisabled: any({ module: "user_access", action: "manage" }),
  deleteAdminUser: any({ module: "user_access", action: "manage" }), approveUser: any({ module: "user_access", action: "manage" }),
  declineUser: any({ module: "user_access", action: "manage" }),
  listUserAccess: any({ module: "user_access", action: "manage" }), saveUserAccess: any({ module: "user_access", action: "manage" }),
  listMigrationStatus: any({ module: "migrations" }), runPendingMigrations: any({ module: "migrations", action: "run" }),
};

const ROUTE_ACCESS: Array<{ prefix: string; requirement: AccessRequirement }> = [
  { prefix: "/migrations", requirement: { module: "migrations" } },
  { prefix: "/user-access", requirement: { module: "user_access", action: "manage" } },
  { prefix: "/dashboard", requirement: { module: "dashboard" } },
  { prefix: "/inventory", requirement: { module: "inventory" } },
  { prefix: "/scanner", requirement: { module: "scanner" } },
  { prefix: "/approval", requirement: { module: "approvals" } },
  { prefix: "/ris-history", requirement: { module: "ris_history" } },
  { prefix: "/forms", requirement: { module: "forms" } },
  { prefix: "/requisitions", requirement: { module: "requisitions" } },
  { prefix: "/stock", requirement: { module: "stock" } },
  { prefix: "/categories", requirement: { module: "categories" } },
  { prefix: "/suppliers", requirement: { module: "suppliers" } },
  { prefix: "/assistant", requirement: { module: "assistant" } },
  { prefix: "/users", requirement: { module: "user_access", action: "manage" } },
  { prefix: "/audit", requirement: { module: "audit_logs" } },
  { prefix: "/developer", requirement: { module: "dev_space" } },
  { prefix: "/dev-space", requirement: { module: "dev_space" } },
];

export function routeAccessForPath(pathname: string) {
  return ROUTE_ACCESS.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.requirement ?? null;
}
