import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ComponentType } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Printer,
  Search,
  Shield,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { RoleGate } from "@/components/common/RoleGate";
import { SummaryActions } from "@/components/common/SummaryActions";
import { exportCSV } from "@/lib/export";
import { listRisForms, updateRisFormStatus } from "@/lib/data.functions";

export const Route = createFileRoute("/_app/approval")({
  head: () => ({ meta: [{ title: "Approvals - Supplify" }] }),
  component: ApprovalPage,
});

type Status = "pending" | "approved" | "rejected";
type Priority = "urgent" | "high" | "normal" | "low";
type SortField = "total" | "submittedAt" | "priority";

type RequestRow = {
  id: string;
  risNo: string;
  item: string;
  category: string;
  requester: string;
  department: string;
  quantity: number;
  unit: string;
  unitCost: number;
  total: number;
  submittedAt: string;
  priority: Priority;
  status: Status;
  notes: string;
  vendor: string;
};

type RisApprovalRow = {
  id: string;
  ris_no: string;
  office: string | null;
  requested_by: string | null;
  status: string | null;
  priority: string | null;
  review_notes: string | null;
  remarks: string | null;
  created_at: string;
  item_name: string | null;
  category_name: string | null;
  quantity: number | string | null;
  unit: string | null;
  acquisition_cost: number | string | null;
  total_amount: number | string | null;
  supplier_name: string | null;
};

const PRIORITY_ORDER: Priority[] = ["urgent", "high", "normal", "low"];
const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; text: string; dot: string }
> = {
  urgent: { label: "URGENT", text: "text-warning", dot: "bg-warning" },
  high: { label: "HIGH", text: "text-destructive", dot: "bg-destructive" },
  normal: { label: "NORMAL", text: "text-success", dot: "bg-success" },
  low: {
    label: "LOW",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

function money(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${month}-${day}-${year}` : value;
}

function dateTimeLabel(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeStatus(value: unknown): Status {
  if (value === "approved" || value === "issued") return "approved";
  if (value === "rejected" || value === "cancelled") return "rejected";
  return "pending";
}

function normalizePriority(value: unknown): Priority {
  return value === "urgent" || value === "high" || value === "low"
    ? value
    : "normal";
}

function StatusBadge({ status }: { status: Status }) {
  const classes = {
    pending: "bg-navy text-navy-foreground border-navy",
    approved: "bg-success/15 text-success border-success/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
  }[status];
  return (
    <span
      className={`text-[10px] font-semibold tracking-wide px-2 py-1 rounded-md border ${classes}`}
    >
      {status.toUpperCase()}
    </span>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tone: string;
}) {
  const tones: Record<string, string> = {
    warning: "bg-warning/15 text-warning-foreground",
    navy: "bg-navy text-navy-foreground",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
  };
  return (
    <div className="bg-card border border-border rounded-lg p-5 flex items-center gap-4">
      <div
        className={`h-11 w-11 rounded-md grid place-items-center ${tones[tone]}`}
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

function FilterButton({
  label,
  value,
  current,
  onSelect,
}: {
  label: string;
  value: string;
  current: string;
  onSelect: (value: string) => void;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`text-[11px] tracking-wide px-2.5 py-1 rounded-md border ${active ? "bg-navy border-navy text-navy-foreground font-semibold" : "border-transparent text-muted-foreground hover:bg-accent"}`}
    >
      {label}
    </button>
  );
}

function DetailModal({
  request,
  onClose,
  onDecision,
}: {
  request: RequestRow;
  onClose: () => void;
  onDecision: (status: "approved" | "rejected", note: string) => Promise<void>;
}) {
  const [note, setNote] = useState(request.notes || "");
  const [saving, setSaving] = useState(false);

  async function decide(status: "approved" | "rejected") {
    setSaving(true);
    try {
      await onDecision(status, note);
    } finally {
      setSaving(false);
    }
  }

  const rows = [
    ["Category", request.category],
    ["Vendor", request.vendor || "—"],
    ["Requester", `${request.requester} · ${request.department}`],
    ["Submitted", dateTimeLabel(request.submittedAt)],
    ["Priority", PRIORITY_CONFIG[request.priority].label],
    ["Quantity", `${request.quantity.toLocaleString()} ${request.unit}`],
    ["Unit Cost", `₱${money(request.unitCost)}`],
    ["Total Amount", `₱${money(request.total)}`],
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-6"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-auto bg-card border border-border rounded-lg shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              {request.risNo}
            </div>
            <div className="text-sm font-semibold leading-snug">
              {request.item}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={request.status} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close request details"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="px-5">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between py-2 border-b border-border"
            >
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-xs text-right max-w-[65%]">{value}</span>
            </div>
          ))}
        </div>
        {request.status === "pending" && (
          <div className="px-5 pb-5 pt-4">
            <label className="block text-[11px] text-muted-foreground mb-1">
              REVIEW NOTE
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add a note for this decision (optional)..."
              className="w-full min-h-[72px] mb-3 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs resize-y outline-none"
              disabled={saving}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void decide("rejected")}
                className="flex-1 py-2 rounded-md border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/10 disabled:opacity-50"
              >
                REJECT
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void decide("approved")}
                className="flex-[2] py-2 rounded-md bg-navy text-navy-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "SAVING..." : "APPROVE REQUEST"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ApprovalPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("submittedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const {
    data: risForms = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["risForms", "approval"],
    queryFn: () => listRisForms({ data: {} }),
    refetchInterval: 5000,
  });

  const requests = useMemo<RequestRow[]>(
    () =>
      risForms.map((row: RisApprovalRow) => {
        const quantity = Number(row.quantity || 0);
        const unitCost = Number(row.acquisition_cost || 0);
        return {
          id: row.id,
          risNo: row.ris_no,
          item: row.item_name || "Unknown item",
          category: row.category_name || "Uncategorized",
          requester: row.requested_by || "Unknown requester",
          department: row.office || "—",
          quantity,
          unit: row.unit || "pcs",
          unitCost,
          total: Number(row.total_amount ?? quantity * unitCost),
          submittedAt: row.created_at || "",
          priority: normalizePriority(row.priority),
          status: normalizeStatus(row.status),
          notes: row.review_notes || row.remarks || "",
          vendor: row.supplier_name || "",
        };
      }),
    [risForms],
  );

  const categories = useMemo(
    () => [
      "all",
      ...Array.from(
        new Set(requests.map((request) => request.category)),
      ).sort(),
    ],
    [requests],
  );
  const filtered = useMemo(
    () =>
      requests
        .filter(
          (request) =>
            statusFilter === "all" || request.status === statusFilter,
        )
        .filter(
          (request) =>
            priorityFilter === "all" || request.priority === priorityFilter,
        )
        .filter(
          (request) =>
            categoryFilter === "all" || request.category === categoryFilter,
        )
        .filter((request) =>
          `${request.risNo} ${request.item} ${request.requester} ${request.department}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .sort((a, b) => {
          let left: number;
          let right: number;
          if (sortField === "total") {
            left = a.total;
            right = b.total;
          } else if (sortField === "priority") {
            left = PRIORITY_ORDER.indexOf(a.priority);
            right = PRIORITY_ORDER.indexOf(b.priority);
          } else {
            left = new Date(a.submittedAt).getTime();
            right = new Date(b.submittedAt).getTime();
          }
          return sortDirection === "asc" ? left - right : right - left;
        }),
    [
      requests,
      statusFilter,
      priorityFilter,
      categoryFilter,
      search,
      sortField,
      sortDirection,
    ],
  );

  const pending = requests.filter((request) => request.status === "pending");
  const approved = requests.filter((request) => request.status === "approved");
  function toggleSort(field: SortField) {
    if (sortField === field)
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDirection("desc");
    }
  }
  async function decide(
    request: RequestRow,
    status: "approved" | "rejected",
    note: string,
  ) {
    try {
      await updateRisFormStatus({
        data: { id: request.id, status, review_note: note },
      });
      await queryClient.invalidateQueries({
        queryKey: ["risForms", "approval"],
      });
      setSelected(null);
      toast.success(
        status === "approved" ? "Request approved" : "Request rejected",
      );
    } catch (cause: unknown) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Could not update the request.",
      );
      throw cause;
    }
  }

  function exportSummary() {
    exportCSV(
      requests.map((request) => ({
        ris_no: request.risNo,
        item: request.item,
        requester: request.requester,
        office: request.department,
        quantity: request.quantity,
        total: request.total,
        status: request.status,
        priority: request.priority,
      })),
      "approval-summary",
    );
  }

  return (
    <RoleGate
      allow={["admin", "staff"]}
      fallback={
        <div className="p-8 text-sm text-muted-foreground">
          You do not have permission to view approvals.
        </div>
      }
    >
      <PageHeader
        title="Approvals"
        subtitle="Review and act on pending requisition requests"
      />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Approval Summary</div>
            <div className="text-xs text-muted-foreground">
              Export or print the current request summary
            </div>
          </div>
          <SummaryActions
            onExport={exportSummary}
            onPrint={() => window.print()}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            icon={Clock}
            label="Awaiting Review"
            value={pending.length}
            tone="warning"
          />
          <Stat
            icon={DollarSign}
            label="Pending Value"
            value={`₱${money(pending.reduce((sum, request) => sum + request.total, 0))}`}
            tone="navy"
          />
          <Stat
            icon={CheckCircle2}
            label="Approved Total"
            value={`₱${money(approved.reduce((sum, request) => sum + request.total, 0))}`}
            tone="success"
          />
          <Stat
            icon={AlertTriangle}
            label="Urgent Items"
            value={
              pending.filter((request) => request.priority === "urgent").length
            }
            tone="destructive"
          />
        </div>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search requests..."
                className="w-56 rounded-md border border-border bg-accent/40 pl-8 pr-3 py-1.5 text-sm outline-none"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground tracking-wider mr-1">
                STATUS
              </span>
              <FilterButton
                label="ALL"
                value="all"
                current={statusFilter}
                onSelect={setStatusFilter}
              />
              <FilterButton
                label="PENDING"
                value="pending"
                current={statusFilter}
                onSelect={setStatusFilter}
              />
              <FilterButton
                label="APPROVED"
                value="approved"
                current={statusFilter}
                onSelect={setStatusFilter}
              />
              <FilterButton
                label="REJECTED"
                value="rejected"
                current={statusFilter}
                onSelect={setStatusFilter}
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="ml-auto text-sm rounded-md border border-border bg-accent/40 px-2.5 py-1.5 outline-none"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "all" ? "All categories" : category}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="text-sm rounded-md border border-border bg-accent/40 px-2.5 py-1.5 outline-none"
            >
              <option value="all">All priorities</option>
              {PRIORITY_ORDER.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_CONFIG[priority].label}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <div className="p-4 text-sm text-destructive">
              Could not load approval requests. Check the database schema and
              connection.
            </div>
          )}
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Loading requests...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No requests match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[130px_1fr_130px_90px_110px_110px_100px] border-b border-border bg-accent/30">
                  {[
                    ["REQ ID", null],
                    ["ITEM / DEPT", null],
                    ["CATEGORY", null],
                    ["QTY", null],
                    ["TOTAL", "total"],
                    ["SUBMITTED", "submittedAt"],
                    ["STATUS", null],
                  ].map(([label, field]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => field && toggleSort(field as SortField)}
                      className={`text-[10px] text-muted-foreground tracking-wider px-3 py-2 text-left ${field ? "cursor-pointer hover:text-foreground" : ""}`}
                    >
                      {label}
                      {field
                        ? ` ${sortField === field ? (sortDirection === "desc" ? "▼" : "▲") : "↕"}`
                        : ""}
                    </button>
                  ))}
                </div>
                <div className="divide-y divide-border">
                  {filtered.map((request) => (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => setSelected(request)}
                      className="w-full grid grid-cols-[130px_1fr_130px_90px_110px_110px_100px] text-left hover:bg-accent"
                    >
                      <span className="px-3 py-3 flex items-center gap-2 text-xs font-medium">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${request.status === "pending" ? "bg-warning" : request.status === "approved" ? "bg-success" : "bg-destructive"}`}
                        />
                        {request.risNo}
                      </span>
                      <span className="px-3 py-3 flex flex-col justify-center">
                        <span className="text-xs font-medium truncate">
                          {request.item}
                        </span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {request.requester} · {request.department}
                        </span>
                      </span>
                      <span className="px-3 py-3 flex items-center text-[10px]">
                        {request.category}
                      </span>
                      <span className="px-3 py-3 flex items-center text-xs tabular-nums">
                        {request.quantity.toLocaleString()} {request.unit}
                      </span>
                      <span className="px-3 py-3 flex items-center text-xs tabular-nums font-semibold">
                        ₱{money(request.total)}
                      </span>
                      <span className="px-3 py-3 flex items-center text-[11px] text-muted-foreground">
                        {dateLabel(request.submittedAt)}
                      </span>
                      <span className="px-3 py-3 flex items-center">
                        <StatusBadge status={request.status} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {filtered.length} of {requests.length} requests
          </span>
          <span className="inline-flex items-center gap-1">
            <Shield className="h-3.5 w-3.5" /> Decisions are recorded with the
            request.
          </span>
        </div>
      </div>
      {selected && (
        <DetailModal
          request={selected}
          onClose={() => setSelected(null)}
          onDecision={(status, note) => decide(selected, status, note)}
        />
      )}
    </RoleGate>
  );
}
