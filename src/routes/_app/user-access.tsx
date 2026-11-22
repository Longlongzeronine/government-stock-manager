import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Check, KeyRound, Save, Search, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { nav } from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import {
  ACCESS_GROUPS,
  ACCESS_MODULES,
  ACCESS_PRESETS,
  DEFAULT_ACCESS,
  canAccess,
  normalizeAccess,
  type AccessMatrix,
} from "@/lib/access-control";
import { listUserAccess, saveUserAccess } from "@/lib/access.functions";
import { ROLE_CODES, ROLE_LABELS, type RoleCode } from "@/lib/form-definitions";

export const Route = createFileRoute("/_app/user-access")({
  head: () => ({ meta: [{ title: "User Access — Supplify" }] }),
  component: UserAccessPage,
});

function copyAccess(access: AccessMatrix) {
  return Object.fromEntries(Object.entries(access).map(([key, actions]) => [key, [...actions]]));
}

const roleCodeSet = new Set<string>(ROLE_CODES);

function isRoleCode(value: string): value is RoleCode {
  return roleCodeSet.has(value);
}

function combineAccess(matrices: AccessMatrix[]) {
  const combined: AccessMatrix = {};
  for (const matrix of matrices) {
    for (const [module, actions] of Object.entries(matrix)) {
      combined[module] = [...new Set([...(combined[module] ?? []), ...actions])];
    }
  }
  return normalizeAccess(combined);
}

function UserAccessPage() {
  const { session, canAccess: currentUserCanAccess } = useAuth();
  const accessToken = session?.access_token ?? "";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AccessMatrix>({});
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const query = useQuery({
    queryKey: ["user-access", "accounts"],
    enabled: Boolean(accessToken && currentUserCanAccess("user_access", "manage")),
    queryFn: () => listUserAccess({ data: { accessToken } }),
  });
  const users = query.data?.users ?? [];
  const selected = users.find((user: any) => user.id === selectedId) ?? null;
  const presetRoles = useMemo(() => {
    const catalog = query.data?.roles?.length
      ? query.data.roles
      : ROLE_CODES.map((code) => ({ code, label: ROLE_LABELS[code] }));
    return catalog.filter((role: any) => isRoleCode(role.code));
  }, [query.data?.roles]);
  const selectedRoleCodes: RoleCode[] = ((selected?.roles ?? []) as string[]).filter(isRoleCode);

  useEffect(() => {
    if (!selectedId && users.length) setSelectedId(users.find((user: any) => user.id !== query.data?.actorUserId)?.id ?? users[0].id);
  }, [query.data?.actorUserId, selectedId, users]);

  useEffect(() => {
    if (!selected) return;
    setDraft(copyAccess(selected.access ?? DEFAULT_ACCESS));
    setReason("");
  }, [selected?.id, selected?.updated_at]);

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return users.filter((user: any) => {
      const matchesText = !needle || `${user.full_name ?? ""} ${user.email ?? ""}`.toLowerCase().includes(needle);
      const state = user.disabled || user.status === "declined" ? "inactive" : user.status === "pending" ? "pending" : "active";
      return matchesText && (statusFilter === "all" || statusFilter === state);
    });
  }, [search, statusFilter, users]);

  function toggle(moduleKey: string, action: string, checked: boolean) {
    setDraft((current) => {
      const next = copyAccess(current);
      const actions = new Set(next[moduleKey] ?? []);
      if (!checked && action === "view") actions.clear();
      else if (checked) actions.add(action);
      else actions.delete(action);
      next[moduleKey] = [...actions];
      return normalizeAccess(next);
    });
  }

  function applyPreset(value: string) {
    if (value === "assigned_roles") {
      setDraft(combineAccess(selectedRoleCodes.map((role) => ACCESS_PRESETS[role].access)));
      return;
    }
    if (isRoleCode(value)) setDraft(copyAccess(ACCESS_PRESETS[value].access));
  }

  async function save() {
    if (!selected || selected.id === query.data?.actorUserId) return;
    setSaving(true);
    try {
      await saveUserAccess({ data: { accessToken, userId: selected.id, access: draft, reason } });
      toast.success("User access saved");
      await query.refetch();
    } catch (error: any) {
      toast.error(error?.message ?? "Could not save user access");
    } finally {
      setSaving(false);
    }
  }

  if (!currentUserCanAccess("user_access", "manage")) {
    return <div className="p-8 text-sm text-muted-foreground">User access administrator permission required.</div>;
  }

  return (
    <div>
      <PageHeader title="User Access" subtitle="Assign pages and actions to each registered account" />
      <div className="grid min-h-[calc(100vh-74px)] gap-4 bg-muted/25 p-4 xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)_240px]">
        <aside className="overflow-hidden rounded-xl border border-border bg-card xl:sticky xl:top-4 xl:h-[calc(100vh-106px)]">
          <div className="border-b border-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Users</p>
            <h2 className="mt-1 text-lg font-semibold">Select Account</h2>
            <p className="mt-1 text-xs text-muted-foreground">Registered accounts are loaded from the protected profile directory.</p>
          </div>
          <div className="space-y-2 border-b border-border p-3">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="all">All users</option><option value="active">Active</option><option value="pending">Pending</option><option value="inactive">Inactive</option>
            </select>
            <label className="relative block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm" /></label>
          </div>
          <div className="max-h-[calc(100vh-310px)] overflow-y-auto p-2">
            {query.isLoading && <p className="p-4 text-sm text-muted-foreground">Loading accounts…</p>}
            {query.error && <p className="p-4 text-sm text-destructive">{query.error.message}</p>}
            {filteredUsers.map((user: any) => {
              const active = user.id === selectedId;
              const initials = (user.full_name || user.email || "U").split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase();
              return <button key={user.id} onClick={() => setSelectedId(user.id)} className={`mb-1 flex w-full gap-3 rounded-lg p-3 text-left transition-colors ${active ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold ${active ? "bg-white/15" : "bg-primary/10 text-primary"}`}>{initials}</span>
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{user.full_name || "Unnamed user"}</span><span className={`block truncate text-xs ${active ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{user.email}</span><span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${active ? "border-white/25" : "border-border"}`}>{user.hasAccessRecord ? "Configured" : "Default"}</span></span>
              </button>;
            })}
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          {!selected ? <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Select an account to configure access.</div> : <>
            <section className="rounded-xl border border-border bg-card">
              <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Access Matrix</p>
                  <h2 className="mt-1 text-xl font-semibold">{selected.full_name || selected.email}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Tick only the pages and actions this account should access.</p>
                  {selectedRoleCodes.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-1.5"><span className="text-xs text-muted-foreground">Assigned roles:</span>{selectedRoleCodes.map((role) => <span key={role} className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium">{presetRoles.find((item: any) => item.code === role)?.label ?? ROLE_LABELS[role]}</span>)}</div>}
                  {!selected.hasAccessRecord && <p className="mt-2 text-xs font-medium text-amber-700">No explicit record yet. Dashboard-only default is shown until you save.</p>}
                </div>
                {selected.id === query.data?.actorUserId && <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Your own access is locked</span>}
              </div>
              {query.data?.schemaReady === false && <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Preview mode: the access-control migration has not been applied yet. You can inspect the Supplify matrix, but saving is disabled until the migration is executed.</div>}
              <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Apply role preset</span>
                  <select defaultValue="" onChange={(event) => { applyPreset(event.target.value); event.currentTarget.value = ""; }} className="min-w-64 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Manual selection</option>
                    {selectedRoleCodes.length > 0 && <option value="assigned_roles">Assigned roles ({selectedRoleCodes.map((role) => presetRoles.find((item: any) => item.code === role)?.label ?? ROLE_LABELS[role]).join(" + ")})</option>}
                    {presetRoles.map((role: any) => <option key={role.code} value={role.code}>{role.label}</option>)}
                  </select>
                  <span className="mt-1.5 block max-w-xl text-xs text-muted-foreground">These role names are synced with Users &amp; Roles. Forms Flow still follows the existing Form access matrix for the selected role.</span>
                </label>
                <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setDraft({})} className="rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent">Clear</button><button type="button" onClick={save} disabled={saving || selected.id === query.data?.actorUserId || query.data?.schemaReady === false} title={query.data?.schemaReady === false ? "Apply the user-access migration before saving." : undefined} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save Access"}</button></div>
              </div>
            </section>

            {ACCESS_GROUPS.map((group) => <section key={group.key} className="overflow-hidden rounded-xl border border-border bg-card"><div className="border-b border-border bg-muted/25 px-4 py-3"><h3 className="font-semibold">{group.label}</h3><p className="text-xs text-muted-foreground">{group.description}</p></div><div className="grid gap-3 p-3 lg:grid-cols-2">{ACCESS_MODULES.filter((module) => module.group === group.key).map((module) => <article key={module.key} className="rounded-lg border border-border"><div className="border-b border-border bg-muted/15 px-3 py-3"><h4 className="font-semibold text-primary">{module.label}</h4><p className="mt-0.5 text-xs text-muted-foreground">{module.description}</p></div><div className="flex flex-wrap gap-2 p-3">{module.actions.map((action) => { const checked = canAccess(draft, module.key, action); return <label key={action} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${checked ? "border-primary/40 bg-primary/5 text-primary" : "border-border"}`}><input type="checkbox" checked={checked} disabled={selected.id === query.data?.actorUserId} onChange={(event) => toggle(module.key, action, event.target.checked)} className="accent-primary" />{action.replaceAll("_", " ")}</label>; })}</div></article>)}</div></section>)}

            <section className="rounded-xl border border-border bg-card p-4"><label className="block"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason / request reference</span><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Optional reason for this access change" className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label><p className="mt-3 text-xs text-muted-foreground">Last assigned {selected.assignedAt ? new Date(selected.assignedAt).toLocaleString() : "never"}{selected.assignedBy ? ` by ${selected.assignedBy.name || selected.assignedBy.email}` : ""}. Every save records the previous and new matrix.</p></section>
          </>}
        </main>

        <aside className="hidden 2xl:block">
          <div className="sticky top-4 rounded-xl border border-border bg-card p-3"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Live Preview</p><p className="text-xs text-muted-foreground">Pages this account will see</p></div><ShieldCheck className="h-5 w-5 text-primary" /></div><div className="mt-3 overflow-hidden rounded-lg bg-sidebar text-sidebar-foreground"><div className="border-b border-white/10 px-3 py-3 text-xs font-semibold"><UserRound className="mr-2 inline h-4 w-4" />{selected?.full_name || "Selected account"}</div><div className="p-2">{nav.filter((item) => canAccess(draft, item.module, item.action ?? "view")).map((item) => { const Icon = item.icon; return <div key={item.to} className="flex items-center gap-2 rounded px-2 py-2 text-xs"><Icon className="h-3.5 w-3.5" />{item.label}<Check className="ml-auto h-3 w-3 text-emerald-300" /></div>; })}{nav.every((item) => !canAccess(draft, item.module, item.action ?? "view")) && <p className="p-3 text-xs text-white/60">No navigation pages assigned.</p>}</div></div><div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground"><KeyRound className="mt-0.5 h-4 w-4 shrink-0" />Backend operations use this same matrix even when an endpoint is called directly.</div></div>
        </aside>
      </div>
    </div>
  );
}
