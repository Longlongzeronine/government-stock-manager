import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, FileText, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { SummaryActions } from "@/components/common/SummaryActions";
import { useAuth } from "@/contexts/AuthContext";
import { exportCSV } from "@/lib/export";
import { listRisForms } from "@/lib/data.functions";

export const Route = createFileRoute("/_app/ris-history")({
  head: () => ({ meta: [{ title: "RIS History - Supplify" }] }),
  component: RisHistoryPage,
});

type HistoryStatus = "pending" | "approved" | "rejected";
type HistoryRow = {
  id: string;
  ris_no: string;
  office: string | null;
  status: string | null;
  created_at: string;
  item_name: string | null;
  quantity: number | string | null;
  unit: string | null;
  total_amount: number | string | null;
  review_notes: string | null;
};

function normalizeStatus(value: unknown): HistoryStatus {
  if (value === "approved" || value === "issued") return "approved";
  if (value === "rejected" || value === "cancelled") return "rejected";
  return "pending";
}

function statusLabel(status: HistoryStatus) {
  return status === "approved"
    ? "Approved"
    : status === "rejected"
      ? "Rejected"
      : "Pending";
}

function statusClasses(status: HistoryStatus) {
  return status === "approved"
    ? "bg-success/15 text-success border-success/30"
    : status === "rejected"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : "bg-warning/15 text-warning-foreground border-warning/30";
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function money(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function StatusIcon({ status }: { status: HistoryStatus }) {
  const Icon =
    status === "approved"
      ? CheckCircle2
      : status === "rejected"
        ? XCircle
        : Clock3;
  return <Icon className="h-4 w-4" />;
}

function RisHistoryPage() {
  const { user } = useAuth();
  const {
    data: forms = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["risForms", "history", user?.id],
    queryFn: () => listRisForms({ data: { created_by: user?.id } }),
    enabled: Boolean(user?.id),
    refetchInterval: 5000,
  });
  const rows = forms as HistoryRow[];
  const counts = rows.reduce(
    (summary, row) => {
      summary[normalizeStatus(row.status)] += 1;
      return summary;
    },
    { pending: 0, approved: 0, rejected: 0 } as Record<HistoryStatus, number>,
  );

  function exportSummary() {
    exportCSV(
      rows.map((row) => ({
        ris_no: row.ris_no,
        item: row.item_name || "No item listed",
        office: row.office || "",
        quantity: row.quantity || 0,
        submitted: row.created_at,
        amount: row.total_amount || 0,
        status: statusLabel(normalizeStatus(row.status)),
      })),
      "ris-history-summary",
    );
  }

  return (
    <div>
      <PageHeader
        title="RIS History"
        subtitle="View the current status of your requisition and issue slips"
      />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">RIS History Summary</div>
            <div className="text-xs text-muted-foreground">
              Export or print your request history
            </div>
          </div>
          <SummaryActions
            onExport={exportSummary}
            onPrint={() => window.print()}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <HistorySummary
            icon={Clock3}
            label="Pending"
            value={counts.pending}
            tone="warning"
          />
          <HistorySummary
            icon={CheckCircle2}
            label="Approved"
            value={counts.approved}
            tone="success"
          />
          <HistorySummary
            icon={XCircle}
            label="Rejected"
            value={counts.rejected}
            tone="destructive"
          />
        </div>
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-4 py-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <h2 className="text-lg">My requests</h2>
              <p className="text-xs text-muted-foreground">
                This list refreshes automatically. Approval controls are
                available only to authorized reviewers.
              </p>
            </div>
          </div>
          {error && (
            <div className="p-4 text-sm text-destructive">
              Could not load your RIS history.
            </div>
          )}
          {isLoading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Loading RIS history...
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              You have no RIS requests yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">RIS No.</th>
                    <th className="text-left px-4 py-3">Item</th>
                    <th className="text-left px-4 py-3">Office</th>
                    <th className="text-right px-4 py-3">Quantity</th>
                    <th className="text-left px-4 py-3">Submitted</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const status = normalizeStatus(row.status);
                    return (
                      <tr key={row.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{row.ris_no}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {row.item_name || "No item listed"}
                          </div>
                          {row.review_notes && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Note: {row.review_notes}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.office || "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {Number(row.quantity || 0).toLocaleString()}{" "}
                          {row.unit || "pcs"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(row.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          ₱{money(Number(row.total_amount || 0))}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${statusClasses(status)}`}
                          >
                            <StatusIcon status={status} />
                            {statusLabel(status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function HistorySummary({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock3;
  label: string;
  value: number;
  tone: "warning" | "success" | "destructive";
}) {
  const classes = {
    warning: "bg-warning/15 text-warning-foreground",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
  };
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
      <div
        className={`grid h-10 w-10 place-items-center rounded-md ${classes[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
