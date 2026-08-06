import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/AppShell";
import {
  Clock,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
} from "lucide-react";
import { listRisForms, updateRisFormStatus } from "@/lib/data.functions";

export const Route = createFileRoute("/_app/approval")({
  head: () => ({ meta: [{ title: "Approvals — Supplify" }] }),
  component: App,
});

type Status = "pending" | "approved" | "rejected";
type Priority = "urgent" | "high" | "normal" | "low";

interface Request {
  id: string;
  ris_no: string;
  item: string;
  category: string;
  requester: string;
  department: string;
  quantity: number;
  unit: string;
  unitCost: number;
  total: number;
  submittedAt: string;
  neededBy: string;
  priority: Priority;
  status: Status;
  notes: string;
  vendor: string;
}

const PRIORITY_ORDER: Priority[] = ["urgent", "high", "normal", "low"];

const PRIORITY_CONFIG: Record<Priority, { label: string; textCls: string; dotCls: string }> = {
  urgent: { label: "URGENT", textCls: "text-warning", dotCls: "bg-warning" },
  high: { label: "HIGH", textCls: "text-destructive", dotCls: "bg-destructive" },
  normal: { label: "NORMAL", textCls: "text-success", dotCls: "bg-success" },
  low: { label: "LOW", textCls: "text-muted-foreground", dotCls: "bg-muted-foreground" },
};

const NAVY_BADGE_CLS = "bg-navy text-navy-foreground border-navy";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-");
  return `${month}-${day}-${year}`;
}

function fmtDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isOverdue(neededBy: string | null | undefined) {
  if (!neededBy) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = neededBy.split("-").map(Number);
  const due = new Date(year, month - 1, day);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

type DueUrgency = "overdue" | "soon" | "ok";

function getDueUrgency(neededBy: string | null | undefined): DueUrgency {
  if (!neededBy) return "ok";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = neededBy.split("-").map(Number);
  const due = new Date(year, month - 1, day);
  due.setHours(0, 0, 0, 0);
  const diffDays = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 14) return "soon";
  return "ok";
}

const DUE_URGENCY_CONFIG: Record<DueUrgency, { textCls: string; dotCls: string }> = {
  overdue: { textCls: "text-destructive", dotCls: "bg-destructive" },
  soon: { textCls: "text-warning", dotCls: "bg-warning" },
  ok: { textCls: "text-success", dotCls: "bg-success" },
};

function getDueDateCls(req: Request) {
  return DUE_URGENCY_CONFIG[getDueUrgency(req.neededBy)].textCls;
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "pending") {
    return (
      <span className={`text-[10px] tracking-wide px-2 py-1 rounded-md border ${NAVY_BADGE_CLS}`}>
        PENDING
      </span>
    );
  }
  const cls = {
    approved: "bg-success/15 text-success border-success/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
  }[status];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${cls}`}>
      {status.toUpperCase()}
    </span>
  );
}

function CategoryChip({ category }: { category: string }) {
  return (
    <span
      className={`inline-flex items-center justify-start leading-tight text-[10px] tracking-wide px-2 py-1 rounded-md border ${NAVY_BADGE_CLS}`}
    >
      {category}
    </span>
  );
}

function DueDot({ neededBy }: { neededBy: string }) {
  const cls = DUE_URGENCY_CONFIG[getDueUrgency(neededBy)].dotCls;
  return (
    <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${cls}`} />
  );
}

interface DetailModalProps {
  req: Request;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function DetailModal({ req, onClose, onApprove, onReject }: DetailModalProps) {
  const [note, setNote] = useState("");

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-auto bg-card border border-border rounded-lg shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
          <div>
            <div className="text-xs text-muted-foreground mb-1">{req.ris_no}</div>
            <div className="text-sm font-semibold leading-snug">{req.item}</div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={req.status} />
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-lg leading-none px-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5">
          <DetailRow label="Category" value={req.category} />
          <DetailRow label="Vendor" value={req.vendor || "—"} />
          <DetailRow label="Requester" value={`${req.requester} · ${req.department}`} />
          <DetailRow label="Submitted" value={fmtDateTime(req.submittedAt)} />
          <DetailRow
            label="Needed By"
            value={isOverdue(req.neededBy) ? `${fmtDate(req.neededBy)} (overdue)` : fmtDate(req.neededBy)}
          />
          <DetailRow label="Priority" value={PRIORITY_CONFIG[req.priority].label} />
          <DetailRow label="Quantity" value={`${req.quantity.toLocaleString()} ${req.unit}`} />
          <DetailRow label="Unit Cost" value={`$${fmt(req.unitCost)}`} />
          <DetailRow label="Total Amount" value={`$${fmt(req.total)}`} />
        </div>

        {req.notes && (
          <div className="m-5 p-3 bg-navy/5 border-l-2 border-navy rounded-md">
            <div className="text-[11px] text-muted-foreground mb-1">REQUESTER NOTES</div>
            <div className="text-xs leading-relaxed">{req.notes}</div>
          </div>
        )}

        {req.status === "pending" && (
          <div className="px-5 pb-5">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add review note (optional)..."
              className="w-full min-h-[72px] mb-3 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs resize-y outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => onReject(req.id)}
                className="flex-1 py-2 rounded-md border border-destructive/30 bg-card text-destructive text-xs font-semibold tracking-wide hover:bg-destructive/10"
              >
                REJECT
              </button>
              <button
                onClick={() => onApprove(req.id)}
                className="flex-[2] py-2 rounded-md border border-navy bg-navy text-navy-foreground text-xs font-semibold tracking-wide hover:opacity-90"
              >
                APPROVE REQUEST
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: any) {
  const toneCls = {
    warning: "bg-warning/15 text-warning-foreground",
    navy: "bg-navy text-navy-foreground",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
  }[tone as string];
  return (
    <div className="bg-card border border-border rounded-lg p-5 flex items-center gap-4">
      <div className={`h-11 w-11 rounded-md grid place-items-center ${toneCls}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function FilterBtn({ label, value, current, onSelect }: { label: string; value: string; current: string; onSelect: (v: any) => void }) {
  const active = current === value;
  return (
    <button
      onClick={() => onSelect(value)}
      className={`text-[11px] tracking-wide px-2.5 py-1 rounded-md border ${
        active
          ? "bg-navy border-navy text-navy-foreground font-semibold"
          : "border-transparent text-muted-foreground hover:bg-accent"
      }`}
    >
      {label}
    </button>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <span className={`text-[9px] ml-1 ${active ? "text-navy" : "text-muted-foreground"}`}>
      {active ? (dir === "desc" ? "▼" : "▲") : "⇅"}
    </span>
  );
}

const COLUMNS = "grid-cols-[130px_1fr_120px_90px_90px_100px_90px_110px]";

export default function App() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Request | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | Status>("pending");
  const [filterPriority, setFilterPriority] = useState<"all" | Priority>("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"total" | "submittedAt" | "neededBy" | "priority">("submittedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: risForms = [] } = useQuery({
    queryKey: ["risForms"],
    queryFn: listRisForms,
  });

  const requests: Request[] = risForms.map((r: any) => ({
    id: r.id,
    ris_no: r.ris_no,
    item: r.item_name || "Unknown Item",
    category: r.category_name || "Uncategorized",
    requester: r.requested_by || "Unknown",
    department: r.office || "—",
    quantity: Number(r.quantity || 0),
    unit: r.unit || "pcs",
    unitCost: Number(r.acquisition_cost || 0),
    total: Number(r.quantity || 0) * Number(r.acquisition_cost || 0),
    submittedAt: r.created_at || "",
    neededBy: r.needed_by || "",
    priority: (r.priority as Priority) || "normal",
    status: r.status === "issued" ? "approved" : r.status === "cancelled" ? "rejected" : "pending",
    notes: r.remarks || "",
    vendor: r.supplier_name || "",
  }));

  const approve = async (id: string) => {
    await updateRisFormStatus({ data: { id, status: "approved" } });
    qc.invalidateQueries({ queryKey: ["risForms"] });
    setSelected(null);
  };

  const reject = async (id: string) => {
    await updateRisFormStatus({ data: { id, status: "rejected" } });
    qc.invalidateQueries({ queryKey: ["risForms"] });
    setSelected(null);
  };

  const categories = ["all", ...Array.from(new Set(requests.map((r) => r.category)))];

  // Count of requests per category, shown next to each option in the dropdown.
  const categoryCounts: Record<string, number> = { all: requests.length };
  for (const r of requests) {
    categoryCounts[r.category] = (categoryCounts[r.category] ?? 0) + 1;
  }

  const filtered = requests
    .filter((r) => filterStatus === "all" || r.status === filterStatus)
    .filter((r) => filterPriority === "all" || r.priority === filterPriority)
    .filter((r) => filterCategory === "all" || r.category === filterCategory)
    .filter(
      (r) =>
        search === "" ||
        r.item.toLowerCase().includes(search.toLowerCase()) ||
        r.requester.toLowerCase().includes(search.toLowerCase()) ||
        r.department.toLowerCase().includes(search.toLowerCase()) ||
        r.ris_no.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      let va: number, vb: number;
      if (sortField === "total") {
        va = a.total;
        vb = b.total;
      } else if (sortField === "priority") {
        va = PRIORITY_ORDER.indexOf(a.priority);
        vb = PRIORITY_ORDER.indexOf(b.priority);
      } else {
        va = new Date(a[sortField]).getTime();
        vb = new Date(b[sortField]).getTime();
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const pendingTotal = requests.filter((r) => r.status === "pending").reduce((s, r) => s + r.total, 0);
  const approvedTotal = requests.filter((r) => r.status === "approved").reduce((s, r) => s + r.total, 0);
  const urgentCount = requests.filter((r) => r.status === "pending" && r.priority === "urgent").length;

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const columns: { label: string; align: "left" | "right" | "center"; field: typeof sortField | null }[] = [
    { label: "REQ ID", align: "left", field: null },
    { label: "ITEM / DEPT", align: "left", field: null },
    { label: "CATEGORY", align: "left", field: null },
    { label: "QTY", align: "left", field: null },
    { label: "UNIT COST", align: "left", field: null },
    { label: "TOTAL", align: "left", field: "total" },
    { label: "DUE", align: "left", field: "neededBy" },
    { label: "STATUS", align: "left", field: null },
  ];

  return (
    <div>
      <PageHeader title="Approvals" subtitle="Review and act on pending purchase requests" />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={Clock} label="Awaiting Review" value={pendingCount} tone="warning" />
          <Stat icon={DollarSign} label="Pending Value" value={`$${fmt(pendingTotal)}`} tone="navy" />
          <Stat icon={CheckCircle2} label="Approved Total" value={`$${fmt(approvedTotal)}`} tone="success" />
          <Stat icon={AlertTriangle} label="Urgent Items" value={urgentCount} tone="destructive" />
        </div>

        <div className="bg-card border border-border rounded-lg">
          <div className="flex flex-wrap items-center gap-4 p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items, requesters, ID..."
                className="w-56 rounded-md border border-border bg-accent/40 pl-8 pr-3 py-1.5 text-sm outline-none"
              />
            </div>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground tracking-wider mr-1">STATUS</span>
              <FilterBtn label="ALL" value="all" current={filterStatus} onSelect={setFilterStatus} />
              <FilterBtn label="PENDING" value="pending" current={filterStatus} onSelect={setFilterStatus} />
              <FilterBtn label="APPROVED" value="approved" current={filterStatus} onSelect={setFilterStatus} />
              <FilterBtn label="REJECTED" value="rejected" current={filterStatus} onSelect={setFilterStatus} />
            </div>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground tracking-wider mr-1">PRIORITY</span>
              <FilterBtn label="ALL" value="all" current={filterPriority} onSelect={setFilterPriority} />
              <FilterBtn label="URGENT" value="urgent" current={filterPriority} onSelect={setFilterPriority} />
              <FilterBtn label="HIGH" value="high" current={filterPriority} onSelect={setFilterPriority} />
              <FilterBtn label="NORMAL" value="normal" current={filterPriority} onSelect={setFilterPriority} />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="ml-auto text-sm rounded-md border border-border bg-accent/40 px-2.5 py-1.5 outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "all"
                    ? `All Categories (${categoryCounts.all})`
                    : `${c} (${categoryCounts[c] ?? 0})`}
                </option>
              ))}
            </select>
          </div>

          <div className={`grid ${COLUMNS} border-b border-border bg-accent/30`}>
            {columns.map((col) => (
              <div
                key={col.label}
                onClick={() => col.field && toggleSort(col.field)}
                className={`text-[10px] text-muted-foreground tracking-wider px-3 py-2 select-none ${
                  col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                } ${col.field ? "cursor-pointer" : ""}`}
              >
                {col.label}
                {col.field && <SortIcon active={sortField === col.field} dir={sortDir} />}
              </div>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No requests match the current filters.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((req) => (
                <div
                  key={req.id}
                  onClick={() => setSelected(req)}
                  className={`grid ${COLUMNS} cursor-pointer hover:bg-accent`}
                >
                  <div className="px-3 py-3 flex items-center gap-2">
                    <DueDot neededBy={req.neededBy} />
                    <span className={`text-xs font-medium ${getDueDateCls(req)}`}>
                      {req.ris_no}
                    </span>
                  </div>
                  <div className="px-3 py-3 flex flex-col justify-center gap-0.5">
                    <span className="text-xs font-medium leading-snug">{req.item}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {req.requester} · {req.department}
                    </span>
                  </div>
                  <div className="px-3 py-3 flex items-center">
                    <CategoryChip category={req.category} />
                  </div>
                  <div className="px-3 py-3 flex items-center justify-start text-xs tabular-nums">
                    {req.quantity.toLocaleString()}
                    <span className="text-muted-foreground ml-1">{req.unit}</span>
                  </div>
                  <div className="px-3 py-3 flex items-center justify-start text-xs tabular-nums">${fmt(req.unitCost)}</div>
                  <div className="px-3 py-3 flex items-center justify-start text-xs tabular-nums font-semibold">
                    ${fmt(req.total)}
                  </div>
                  <div className={`px-3 py-3 flex items-center text-[11px] font-medium ${getDueDateCls(req)}`}>
                    {fmtDate(req.neededBy)}
                  </div>
                  <div className="px-3 py-3 flex items-center justify-start">
                    <StatusBadge status={req.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {requests.length} requests · ${fmt(filtered.reduce((s, r) => s + r.total, 0))} total
          </span>
          <span className="text-xs text-muted-foreground">Click any row to review</span>
        </div>
      </div>

      {selected && (
        <DetailModal
          req={selected}
          onClose={() => setSelected(null)}
          onApprove={(id) => {
            approve(id);
          }}
          onReject={(id) => {
            reject(id);
          }}
        />
      )}
    </div>
  );
}
