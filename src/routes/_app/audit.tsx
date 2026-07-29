import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listAuditLogs } from "@/lib/data.functions";
import { PageHeader } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { MobileCard, MobileCardRow } from "@/components/common/MobileCard";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/_app/audit")({
  head: () => ({ meta: [{ title: "Audit Log — Supplify" }] }),
  component: Audit,
});

function Audit() {
  const { isAdmin } = useAuth();
  const { data: rows = [] } = useQuery({
    queryKey: ["audit"],
    queryFn: () => listAuditLogs(),
    refetchInterval: 3000,
  });
  const isMobileView = useIsMobile();

  if (!isAdmin) return <div className="p-8 text-sm text-muted-foreground">Admin access required.</div>;
  return (
    <div>
      <PageHeader title="Audit Log" subtitle="System activity, last 500 events" />
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Desktop Table View */}
        {!isMobileView && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground"><tr>
                <th className="text-left px-4 py-3">When</th>
                <th className="text-left px-4 py-3">Actor</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Table</th>
                <th className="text-left px-4 py-3">Row</th>
              </tr></thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-2.5 tabular-nums text-xs">{format(new Date(r.created_at), "MMM d, HH:mm:ss")}</td>
                    <td className="px-4 py-2.5">{r.actor_email ?? "—"}</td>
                    <td className="px-4 py-2.5"><span className="text-xs px-2 py-0.5 rounded border border-border bg-muted/50">{r.action}</span></td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.table_name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.row_id?.slice(0, 8)}…</td>
                  </tr>
                ))}
                {rows.length === 0 && (<tr><td colSpan={5} className="p-12 text-center text-sm text-muted-foreground">No events.</td></tr>)}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Card View */}
        {isMobileView && (
          <div className="space-y-3">
            {rows.map((r: any) => (
              <MobileCard key={r.id}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs px-2 py-0.5 rounded border border-border bg-muted/50 shrink-0">{r.action}</span>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {format(new Date(r.created_at), "MMM d, HH:mm:ss")}
                  </div>
                </div>
                <div className="border-t border-border pt-2 space-y-2">
                  <MobileCardRow label="Actor" value={r.actor_email ?? "—"} />
                  <MobileCardRow label="Table" value={<span className="font-mono text-xs">{r.table_name}</span>} />
                  {r.row_id && (
                    <MobileCardRow label="Row" value={<span className="font-mono text-xs text-muted-foreground">{r.row_id.slice(0, 8)}…</span>} />
                  )}
                </div>
              </MobileCard>
            ))}
            {rows.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground bg-card border border-border rounded-lg">
                No events.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
