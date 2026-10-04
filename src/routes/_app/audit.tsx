import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { format } from "date-fns";
import { listAuditLogs } from "@/lib/data.functions";
import { PageHeader } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { MobileCard } from "@/components/common/MobileCard";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/_app/audit")({
  head: () => ({ meta: [{ title: "Audit Log - Supplify" }] }),
  component: Audit,
});

function parsePayload(payload: unknown): unknown {
  if (typeof payload !== "string") return payload;
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}

function payloadRecord(payload: unknown): Record<string, unknown> | null {
  const parsed = parsePayload(payload);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const snapshot = record.after ?? record.new ?? record.new_record ?? record.record ?? record.data ?? record;
  return snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
    ? snapshot as Record<string, unknown>
    : null;
}

function fieldLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\bqr\b/gi, "QR").replace(/\bid\b/gi, "ID").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function fieldValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.map(fieldValue).join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${fieldLabel(key)}: ${fieldValue(item)}`)
      .join(" · ");
  }
  return String(value);
}

function displayTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "MMM d, yyyy h:mm a");
}

function moduleLabel(table: string) {
  const names: Record<string, string> = {
    items: "Inventory",
    transactions: "Stock In / Out",
    categories: "Categories",
    suppliers: "Suppliers",
    profiles: "Users",
    user_roles: "User Roles",
    iar_forms: "IAR Forms",
    ris_forms: "RIS Forms",
    ics_forms: "ICS Forms",
    par_forms: "PAR Forms",
  };
  return names[table] ?? fieldLabel(table || "Unknown");
}

function recordType(row: any) {
  const record = payloadRecord(row.payload);
  const type = record?.item_type ?? record?.type ?? record?.form_type;
  return type ? fieldValue(type) : moduleLabel(row.table_name);
}

function recordName(row: any) {
  const record = payloadRecord(row.payload);
  const name = record?.name ?? record?.item_name ?? record?.ris_no ?? record?.iar_no ?? record?.supplier_name;
  return name ? fieldValue(name) : row.row_id ? `Record ${String(row.row_id).slice(0, 8)}` : "—";
}

function actionStyle(action: string) {
  const value = action.toLowerCase();
  if (/delete|remove|reject|cancel/.test(value)) return "border-destructive/30 bg-destructive/10 text-destructive";
  if (/create|insert|add|approve/.test(value)) return "border-success/30 bg-success/10 text-success";
  if (/update|edit|change/.test(value)) return "border-warning/30 bg-warning/10 text-warning-foreground";
  return "border-border bg-muted/50 text-foreground";
}

function actionLabel(action: string) {
  const value = action.toLowerCase();
  if (/delete|remove/.test(value)) return "Deleted";
  if (/reject/.test(value)) return "Rejected";
  if (/cancel/.test(value)) return "Cancelled";
  if (/approve/.test(value)) return "Approved";
  if (/create|insert|add/.test(value)) return "Created";
  if (/update|edit|change/.test(value)) return "Updated";
  return fieldLabel(action);
}

function ChangeDetails({ row }: { row: any }) {
  const fields = Object.entries(payloadRecord(row.payload) ?? {});
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <h3 className="mb-3 text-sm font-semibold">What changed</h3>
      {fields.length ? (
        <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
          {fields.map(([key, value]) => (
            <div key={key} className="min-w-0 border-b border-border pb-2">
              <dt className="text-[11px] font-semibold text-foreground">{fieldLabel(key)}</dt>
              <dd className="mt-1 break-words text-xs text-muted-foreground">{fieldValue(value)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">No change details were saved for this event.</p>
      )}
      <div className="mt-4 grid gap-2 border-t border-border pt-3 text-xs sm:grid-cols-3">
        <div><span className="font-semibold">Event ID</span><div className="mt-1 break-all font-mono text-muted-foreground">{row.id}</div></div>
        <div><span className="font-semibold">Actor ID</span><div className="mt-1 break-all font-mono text-muted-foreground">{row.actor_id ?? "—"}</div></div>
        <div><span className="font-semibold">Record ID</span><div className="mt-1 break-all font-mono text-muted-foreground">{row.row_id ?? "—"}</div></div>
      </div>
    </div>
  );
}

function Audit() {
  const { isAdmin, developerMode } = useAuth();
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["audit"],
    queryFn: () => listAuditLogs(),
    refetchInterval: 3000,
  });
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("48");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const isMobileView = useIsMobile();

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const cutoff = range === "all" ? 0 : Date.now() - Number(range) * 60 * 60 * 1000;
    return rows.filter((row: any) => {
      const created = new Date(row.created_at).getTime();
      if (cutoff && (!Number.isFinite(created) || created < cutoff)) return false;
      if (!term) return true;
      return [
        row.actor_email,
        row.action,
        row.table_name,
        row.row_id,
        JSON.stringify(row.payload ?? ""),
      ].some((value) => String(value ?? "").toLowerCase().includes(term));
    });
  }, [rows, search, range]);

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!isAdmin && !developerMode) {
    return <div className="p-8 text-sm text-muted-foreground">Admin access required.</div>;
  }

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="System activity, last 500 events" />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
          <label className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by email, action, or item..."
              className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Date range
            <select value={range} onChange={(event) => setRange(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
              <option value="48">Last 48 hours</option>
              <option value="168">Last 7 days</option>
              <option value="720">Last 30 days</option>
              <option value="all">All loaded events</option>
            </select>
          </label>
          <span className="ml-auto text-xs text-muted-foreground">{filteredRows.length} of {rows.length} events</span>
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center text-sm text-muted-foreground">Loading events...</div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-card p-8 text-center text-sm text-destructive">Could not load audit events: {error.message}</div>
        ) : isMobileView ? (
          <div className="space-y-3">
            {filteredRows.map((row: any) => (
              <MobileCard key={row.id} className="p-0">
                <button type="button" onClick={() => toggleExpanded(row.id)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/20">
                  {expanded.has(row.id) ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${actionStyle(row.action)}`}>{actionLabel(row.action)}</span>
                      <span className="text-xs text-muted-foreground">{moduleLabel(row.table_name)}</span>
                    </div>
                    <div className="mt-1 truncate text-sm font-medium">{recordName(row)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{row.actor_email ?? "Unknown user"} · {displayTime(row.created_at)}</div>
                  </div>
                </button>
                {expanded.has(row.id) && <div className="border-t border-border p-3"><ChangeDetails row={row} /></div>}
              </MobileCard>
            ))}
            {filteredRows.length === 0 && <div className="rounded-lg border border-border bg-card p-12 text-center text-sm text-muted-foreground">No events match these filters.</div>}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="w-8 px-2 py-3"></th>
                  <th className="w-44 px-3 py-3 text-left">Date &amp; time</th>
                  <th className="w-36 px-3 py-3 text-left">User action</th>
                  <th className="w-36 px-3 py-3 text-left">Area</th>
                  <th className="w-48 px-3 py-3 text-left">Email</th>
                  <th className="w-36 px-3 py-3 text-left">Record type</th>
                  <th className="px-3 py-3 text-left">Item / record</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row: any) => (
                  <Fragment key={row.id}>
                    <tr key={row.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-2 py-2">
                        <button type="button" onClick={() => toggleExpanded(row.id)} aria-label={`${expanded.has(row.id) ? "Hide" : "Show"} event details`} className="rounded p-1 hover:bg-accent">
                          {expanded.has(row.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-xs tabular-nums">{displayTime(row.created_at)}</td>
                      <td className="px-3 py-3"><span className={`rounded border px-2 py-1 text-[10px] font-semibold ${actionStyle(row.action)}`}>{actionLabel(row.action)}</span></td>
                      <td className="px-3 py-3 text-xs">{moduleLabel(row.table_name)}</td>
                      <td className="px-3 py-3 text-xs">{row.actor_email ?? "—"}</td>
                      <td className="px-3 py-3 text-xs">{recordType(row)}</td>
                      <td className="max-w-[260px] truncate px-3 py-3 text-xs font-medium" title={recordName(row)}>{recordName(row)}</td>
                    </tr>
                    {expanded.has(row.id) && (
                      <tr key={`${row.id}-details`} className="border-t border-border bg-muted/20">
                        <td colSpan={7} className="p-3 sm:p-4"><ChangeDetails row={row} /></td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {filteredRows.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-sm text-muted-foreground">No events match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
