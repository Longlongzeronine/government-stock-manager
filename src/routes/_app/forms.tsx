import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  FileCheck2,
  FileSpreadsheet,
  FileText,
  LayoutPanelLeft,
  PackageCheck,
  Plus,
  Save,
  Send,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/_app/forms")({
  head: () => ({ meta: [{ title: "Forms Flow - Supplify" }] }),
  component: FormsFlow,
});

type FlowTab = "iar" | "stock-card" | "ris" | "rsmi";
type ViewMode = "preview" | "split";
type Orientation = "portrait" | "landscape";

type Item = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  acquisition_cost?: number;
  inventory_classification?:
    | "expendable_supply"
    | "semi_expendable_property"
    | "ppe";
  semi_expendable_tier?: "low_value" | "high_value" | null;
};

type Transaction = {
  id: string;
  item_id: string;
  type: "IN" | "OUT";
  quantity: number;
  staff_name: string | null;
  remarks: string | null;
  created_at: string;
  item?: Item;
};

type StockRow = Transaction & { balance: number };

type Line = {
  id: string;
  item_id: string;
  quantity: string;
  unitCost: string;
  remarks: string;
};

type IarState = {
  iarNo: string;
  supplier: string;
  invoiceNo: string;
  acceptedBy: string;
};

type RisState = {
  risNo: string;
  office: string;
  purpose: string;
  requestedBy: string;
  approvedBy: string;
  issuedBy: string;
  receivedBy: string;
};

function FormsFlow() {
  const { canWrite, user } = useAuth();
  const queryClient = useQueryClient();
  const userName = user?.user_metadata?.full_name || user?.email || "";
  const today = new Date().toISOString().slice(0, 10);

  const [tab, setTab] = useState<FlowTab>("iar");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [zoom, setZoom] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [reportMonth, setReportMonth] = useState(today.slice(0, 7));
  const [iar, setIar] = useState<IarState>({
    iarNo: `IAR-${today}`,
    supplier: "",
    invoiceNo: "",
    acceptedBy: userName,
  });
  const [iarLines, setIarLines] = useState<Line[]>([blankLine()]);
  const [ris, setRis] = useState<RisState>({
    risNo: `RIS-${today}`,
    office: "",
    purpose: "",
    requestedBy: userName,
    approvedBy: "",
    issuedBy: userName,
    receivedBy: "",
  });
  const [risLines, setRisLines] = useState<Line[]>([blankLine()]);
  const [saving, setSaving] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: async () =>
      (
        await supabase
          .from("items")
          .select(
            "id,name,quantity,unit,acquisition_cost,inventory_classification,semi_expendable_tier",
          )
          .order("name")
      ).data ?? [],
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", "forms-flow"],
    queryFn: async () =>
      (
        await supabase
          .from("transactions")
          .select(
            "*, item:items(id,name,quantity,unit,acquisition_cost,inventory_classification,semi_expendable_tier)",
          )
          .order("created_at", { ascending: true })
      ).data ?? [],
  });

  const acceptedStockItems = useMemo(
    () => getAcceptedStockItems(items, transactions),
    [items, transactions],
  );
  const stockCardItems = useMemo(
    () => getStockCardItems(items, transactions),
    [items, transactions],
  );
  const selectedItem = stockCardItems.find(
    (item: Item) => item.id === (selectedItemId || stockCardItems[0]?.id),
  );
  const stockRows = useMemo(
    () => getStockRows(selectedItem, transactions),
    [selectedItem, transactions],
  );
  const rsmiRows = useMemo(
    () => getRsmiRows(transactions, reportMonth),
    [transactions, reportMonth],
  );
  const flowStats = useMemo(
    () => getFlowStats(transactions, reportMonth, tab),
    [transactions, reportMonth, tab],
  );

  function refreshFlow() {
    queryClient.invalidateQueries({ queryKey: ["items"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["transactions", "forms-flow"] });
  }

  async function saveIar() {
    const validLines = iarLines.filter(
      (line) => line.item_id && Number(line.quantity) > 0,
    );
    if (!iar.iarNo.trim()) return toast.error("IAR number is required.");
    if (validLines.length === 0)
      return toast.error("Add at least one accepted item.");

    setSaving(true);
    const { data: iarRecord, error: iarError } = await supabase
      .from("iar_forms")
      .insert({
        iar_no: iar.iarNo,
        supplier: iar.supplier || null,
        invoice_no: iar.invoiceNo || null,
        accepted_by: iar.acceptedBy || null,
        created_by: user?.id,
        created_by_name: userName,
      })
      .select("id")
      .single();

    if (iarError) {
      setSaving(false);
      return toast.error(iarError.message);
    }

    for (const line of validLines) {
      const { data: tx, error: txError } = await supabase
        .from("transactions")
        .insert({
          item_id: line.item_id,
          type: "IN",
          quantity: Number(line.quantity),
          staff_id: user?.id,
          staff_name: userName,
          source_form_type: "IAR",
          source_form_id: iarRecord.id,
          remarks: [
            `IAR ${iar.iarNo}`,
            iar.supplier ? `Supplier: ${iar.supplier}` : "",
            iar.invoiceNo ? `Invoice: ${iar.invoiceNo}` : "",
            line.unitCost ? `Unit Cost: ${peso(Number(line.unitCost))}` : "",
            line.remarks,
          ]
            .filter(Boolean)
            .join(" | "),
        })
        .select("id")
        .single();

      if (txError) {
        setSaving(false);
        return toast.error(txError.message);
      }

      const { error: lineError } = await supabase.from("iar_items").insert({
        iar_id: iarRecord.id,
        item_id: line.item_id,
        quantity: Number(line.quantity),
        unit_cost: Number(line.unitCost || 0),
        remarks: line.remarks || null,
        transaction_id: tx.id,
      });

      if (lineError) {
        setSaving(false);
        return toast.error(lineError.message);
      }
    }

    setSaving(false);
    toast.success("IAR posted. Stock card receipts were added.");
    refreshFlow();
    setTab("stock-card");
  }

  async function saveRis() {
    const validLines = risLines.filter(
      (line) => line.item_id && Number(line.quantity) > 0,
    );
    if (!ris.risNo.trim()) return toast.error("RIS number is required.");
    if (!ris.office.trim())
      return toast.error("Requesting office is required.");
    if (validLines.length === 0)
      return toast.error("Add at least one item to issue.");

    for (const line of validLines) {
      const item = acceptedStockItems.find(
        (candidate: Item) => candidate.id === line.item_id,
      );
      if (!item) {
        return toast.error("RIS can only issue items that were accepted through IAR and still have stock.");
      }
      if (item && Number(line.quantity) > item.quantity) {
        return toast.error(
          `${item.name} has only ${item.quantity} ${item.unit} available.`,
        );
      }
    }

    setSaving(true);
    const { data: risRecord, error: risError } = await supabase
      .from("ris_forms")
      .insert({
        ris_no: ris.risNo,
        office: ris.office,
        purpose: ris.purpose || null,
        requested_by: ris.requestedBy || null,
        approved_by: ris.approvedBy || null,
        issued_by: ris.issuedBy || null,
        received_by: ris.receivedBy || null,
        created_by: user?.id,
        created_by_name: userName,
      })
      .select("id")
      .single();

    if (risError) {
      setSaving(false);
      return toast.error(risError.message);
    }

    const issuedLines: Array<Line & { item?: Item }> = [];

    for (const line of validLines) {
      const item =
        acceptedStockItems.find(
          (candidate: Item) => candidate.id === line.item_id,
        ) ?? items.find((candidate: Item) => candidate.id === line.item_id);
      const { data: tx, error: txError } = await supabase
        .from("transactions")
        .insert({
          item_id: line.item_id,
          type: "OUT",
          quantity: Number(line.quantity),
          staff_id: user?.id,
          staff_name: userName,
          source_form_type: "RIS",
          source_form_id: risRecord.id,
          remarks: [
            `RIS ${ris.risNo}`,
            `Office: ${ris.office}`,
            "Responsibility Center: 16 009 03 0001 07",
            ris.purpose ? `Purpose: ${ris.purpose}` : "",
            line.remarks,
          ]
            .filter(Boolean)
            .join(" | "),
        })
        .select("id")
        .single();

      if (txError) {
        setSaving(false);
        return toast.error(txError.message);
      }

      const { error: lineError } = await supabase.from("ris_items").insert({
        ris_id: risRecord.id,
        item_id: line.item_id,
        quantity: Number(line.quantity),
        remarks: line.remarks || null,
        transaction_id: tx.id,
      });

      if (lineError) {
        setSaving(false);
        return toast.error(lineError.message);
      }

      issuedLines.push({ ...line, item });
    }

    const accountabilityError = await createAccountabilityDocuments({
      risId: risRecord.id,
      risNo: ris.risNo,
      office: ris.office,
      custodian: ris.receivedBy || ris.requestedBy || userName,
      userId: user?.id,
      userName,
      lines: issuedLines,
    });

    if (accountabilityError) {
      setSaving(false);
      return toast.error(accountabilityError);
    }

    setSaving(false);
    toast.success("RIS issued. Stock balances were deducted.");
    refreshFlow();
    setTab("rsmi");
  }

  function resetActiveForm() {
    if (!window.confirm(`Clear the current ${activeStageLabel(tab)} input?`))
      return;
    if (tab === "iar") {
      setIar({
        iarNo: `IAR-${today}`,
        supplier: "",
        invoiceNo: "",
        acceptedBy: userName,
      });
      setIarLines([blankLine()]);
    } else if (tab === "ris") {
      setRis({
        risNo: `RIS-${today}`,
        office: "",
        purpose: "",
        requestedBy: userName,
        approvedBy: "",
        issuedBy: userName,
        receivedBy: "",
      });
      setRisLines([blankLine()]);
    }
  }

  function saveActiveStage() {
    if (tab === "iar") return saveIar();
    if (tab === "ris") return saveRis();
    toast.info(
      `${activeStageLabel(tab)} is generated from saved transactions.`,
    );
  }

  return (
    <div>
      <PageHeader
        title="Forms Flow"
        subtitle="Preview and encode IAR, Stock Card, RIS, and RSMI"
        actions={
          <>
            <button
              onClick={resetActiveForm}
              disabled={tab === "stock-card" || tab === "rsmi"}
              className="flow-header-btn"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
            <button
              onClick={saveActiveStage}
              disabled={
                !canWrite || saving || tab === "stock-card" || tab === "rsmi"
              }
              className="flow-header-primary"
            >
              {tab === "ris" ? (
                <Send className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving
                ? "Saving..."
                : tab === "ris"
                  ? "Issue RIS"
                  : tab === "iar"
                    ? "Post IAR"
                    : "Generated"}
            </button>
          </>
        }
      />

      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <WorkflowStepper active={tab} onChange={setTab} />

        <div
          className={`flex flex-col gap-3 lg:flex-row lg:items-center ${
            viewMode === "split" ? "lg:justify-between" : "lg:justify-start"
          }`}
        >
          <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border bg-card p-1 sm:inline-flex">
            {[
              { value: "preview", label: "Form Preview", icon: FileText },
              { value: "split", label: "Split View", icon: LayoutPanelLeft },
            ].map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setViewMode(option.value as ViewMode)}
                  className={`flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium ${
                    viewMode === option.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border bg-card p-1 sm:inline-flex">
              {(["portrait", "landscape"] as Orientation[]).map((option) => (
                <button
                  key={option}
                  onClick={() => setOrientation(option)}
                  className={`rounded px-3 py-2 text-sm font-medium capitalize ${
                    orientation === option
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="inline-flex items-center gap-1 rounded-md border border-border bg-card p-1">
              <button
                className="flow-icon"
                title="Zoom out"
                onClick={() =>
                  setZoom(Math.max(0.6, Number((zoom - 0.1).toFixed(1))))
                }
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="w-12 text-center text-xs font-semibold tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                className="flow-icon"
                title="Zoom in"
                onClick={() =>
                  setZoom(Math.min(1.4, Number((zoom + 0.1).toFixed(1))))
                }
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                className="rounded px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent"
                onClick={() => setZoom(1)}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div
          className={
            viewMode === "split"
              ? "space-y-4"
              : "grid gap-4 xl:grid-cols-[minmax(0,1040px)_minmax(380px,1fr)] xl:items-start"
          }
        >
          <main className="min-w-0">
            <div
              className={
                viewMode === "split"
                  ? "grid gap-4 xl:grid-cols-[minmax(430px,0.85fr)_minmax(560px,1.15fr)]"
                  : ""
              }
            >
              {viewMode === "split" && (
                <EntryPanel
                  tab={tab}
                  inventoryItems={items}
                  risItems={acceptedStockItems}
                  stockCardItems={stockCardItems}
                  canWrite={canWrite}
                  saving={saving}
                  iar={iar}
                  setIar={setIar}
                  iarLines={iarLines}
                  setIarLines={setIarLines}
                  ris={ris}
                  setRis={setRis}
                  risLines={risLines}
                  setRisLines={setRisLines}
                  selectedItemId={selectedItem?.id || ""}
                  setSelectedItemId={setSelectedItemId}
                  reportMonth={reportMonth}
                  setReportMonth={setReportMonth}
                  onSaveIar={saveIar}
                  onSaveRis={saveRis}
                />
              )}

              <PaperPreview
                tab={tab}
                orientation={orientation}
                zoom={zoom}
                editable
                inventoryItems={items}
                risItems={acceptedStockItems}
                stockCardItems={stockCardItems}
                iar={iar}
                setIar={setIar}
                iarLines={iarLines}
                setIarLines={setIarLines}
                ris={ris}
                setRis={setRis}
                risLines={risLines}
                setRisLines={setRisLines}
                selectedItem={selectedItem}
                selectedItemId={selectedItem?.id || ""}
                setSelectedItemId={setSelectedItemId}
                stockRows={stockRows}
                reportMonth={reportMonth}
                setReportMonth={setReportMonth}
                rsmiRows={rsmiRows}
              />
            </div>
          </main>

          <FlowSupportPanel
            placement={viewMode === "split" ? "bottom" : "side"}
            stats={flowStats}
            inventoryItems={items}
            transactions={transactions}
            reportMonth={reportMonth}
          />
        </div>
      </div>
      <style>{flowStyles}</style>
    </div>
  );
}

function WorkflowStepper({
  active,
  onChange,
}: {
  active: FlowTab;
  onChange: (tab: FlowTab) => void;
}) {
  const steps: { value: FlowTab; label: string; detail: string; icon: any }[] =
    [
      {
        value: "iar",
        label: "IAR",
        detail: "Acceptance report",
        icon: PackageCheck,
      },
      {
        value: "stock-card",
        label: "Stock Card",
        detail: "Item ledger",
        icon: FileSpreadsheet,
      },
      { value: "ris", label: "RIS", detail: "Issue slip", icon: Send },
      {
        value: "rsmi",
        label: "RSMI",
        detail: "Monthly report",
        icon: FileCheck2,
      },
    ];

  return (
    <div className="grid gap-2 rounded-lg border border-border bg-card p-2 md:grid-cols-4">
      {steps.map((step) => {
        const Icon = step.icon;
        const isActive = active === step.value;
        return (
          <button
            key={step.value}
            onClick={() => onChange(step.value)}
            className={`flex min-w-0 items-center gap-3 rounded-md px-3 py-3 text-left ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${isActive ? "bg-white/15" : "bg-muted"}`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{step.label}</span>
              <span
                className={`block truncate text-xs ${isActive ? "text-primary-foreground/75" : "text-muted-foreground"}`}
              >
                {step.detail}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EntryPanel({
  tab,
  inventoryItems,
  risItems,
  stockCardItems,
  canWrite,
  saving,
  iar,
  setIar,
  iarLines,
  setIarLines,
  ris,
  setRis,
  risLines,
  setRisLines,
  selectedItemId,
  setSelectedItemId,
  reportMonth,
  setReportMonth,
  onSaveIar,
  onSaveRis,
}: {
  tab: FlowTab;
  inventoryItems: Item[];
  risItems: Item[];
  stockCardItems: Item[];
  canWrite: boolean;
  saving: boolean;
  iar: IarState;
  setIar: (state: IarState) => void;
  iarLines: Line[];
  setIarLines: (lines: Line[]) => void;
  ris: RisState;
  setRis: (state: RisState) => void;
  risLines: Line[];
  setRisLines: (lines: Line[]) => void;
  selectedItemId: string;
  setSelectedItemId: (id: string) => void;
  reportMonth: string;
  setReportMonth: (month: string) => void;
  onSaveIar: () => void;
  onSaveRis: () => void;
}) {
  if (tab === "iar") {
    return (
      <section className="rounded-lg border border-border bg-card">
        <FormTitle
          title="IAR Input"
          subtitle="Accepted deliveries become Stock Card receipt entries."
        />
        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FlowField label="IAR No.">
              <input
                className="flow-input"
                value={iar.iarNo}
                onChange={(e) => setIar({ ...iar, iarNo: e.target.value })}
              />
            </FlowField>
            <FlowField label="Supplier">
              <input
                className="flow-input"
                value={iar.supplier}
                onChange={(e) => setIar({ ...iar, supplier: e.target.value })}
              />
            </FlowField>
            <FlowField label="Invoice / DR No.">
              <input
                className="flow-input"
                value={iar.invoiceNo}
                onChange={(e) => setIar({ ...iar, invoiceNo: e.target.value })}
              />
            </FlowField>
            <FlowField label="Accepted By">
              <input
                className="flow-input"
                value={iar.acceptedBy}
                onChange={(e) => setIar({ ...iar, acceptedBy: e.target.value })}
              />
            </FlowField>
          </div>
          <LineEditor
            items={inventoryItems}
            lines={iarLines}
            onLines={setIarLines}
            showCost
          />
          <FlowActions>
            <button
              disabled={!canWrite || saving}
              onClick={onSaveIar}
              className="flow-primary"
            >
              <Save className="h-4 w-4" /> {saving ? "Posting..." : "Post IAR"}
            </button>
          </FlowActions>
        </div>
      </section>
    );
  }

  if (tab === "ris") {
    return (
      <section className="rounded-lg border border-border bg-card">
        <FormTitle
          title="RIS Input"
          subtitle="Issued items become Stock Card issue entries and RSMI rows."
        />
        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FlowField label="RIS No.">
              <input
                className="flow-input"
                value={ris.risNo}
                onChange={(e) => setRis({ ...ris, risNo: e.target.value })}
              />
            </FlowField>
            <FlowField label="Requesting Office">
              <input
                className="flow-input"
                value={ris.office}
                onChange={(e) => setRis({ ...ris, office: e.target.value })}
              />
            </FlowField>
            <FlowField label="Requested By">
              <input
                className="flow-input"
                value={ris.requestedBy}
                onChange={(e) =>
                  setRis({ ...ris, requestedBy: e.target.value })
                }
              />
            </FlowField>
            <FlowField label="Purpose">
              <input
                className="flow-input"
                value={ris.purpose}
                onChange={(e) => setRis({ ...ris, purpose: e.target.value })}
              />
            </FlowField>
            <FlowField label="Approved By">
              <input
                className="flow-input"
                value={ris.approvedBy}
                onChange={(e) => setRis({ ...ris, approvedBy: e.target.value })}
              />
            </FlowField>
            <FlowField label="Issued By">
              <input
                className="flow-input"
                value={ris.issuedBy}
                onChange={(e) => setRis({ ...ris, issuedBy: e.target.value })}
              />
            </FlowField>
            <FlowField label="Received By">
              <input
                className="flow-input"
                value={ris.receivedBy}
                onChange={(e) => setRis({ ...ris, receivedBy: e.target.value })}
              />
            </FlowField>
          </div>
          <LineEditor
            items={risItems}
            lines={risLines}
            onLines={setRisLines}
            emptyMessage="Post an IAR receipt first before issuing items through RIS."
          />
          <FlowActions>
            <button
              disabled={!canWrite || saving}
              onClick={onSaveRis}
              className="flow-primary"
            >
              <Send className="h-4 w-4" /> {saving ? "Issuing..." : "Issue RIS"}
            </button>
          </FlowActions>
        </div>
      </section>
    );
  }

  if (tab === "stock-card") {
    return (
      <section className="rounded-lg border border-border bg-card">
        <FormTitle
          title="Stock Card Options"
          subtitle="Select an item to preview its ledger."
        />
        <div className="p-4">
          <FlowField label="Item">
            <select
              className="flow-input"
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
            >
              {stockCardItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </FlowField>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <FormTitle
        title="RSMI Options"
        subtitle="Select month to generate the report."
      />
      <div className="p-4">
        <FlowField label="Report Month">
          <input
            className="flow-input"
            type="month"
            value={reportMonth}
            onChange={(e) => setReportMonth(e.target.value)}
          />
        </FlowField>
      </div>
    </section>
  );
}

function PaperPreview({
  tab,
  orientation,
  zoom,
  editable,
  inventoryItems,
  risItems,
  stockCardItems,
  iar,
  setIar,
  iarLines,
  setIarLines,
  ris,
  setRis,
  risLines,
  setRisLines,
  selectedItem,
  selectedItemId,
  setSelectedItemId,
  stockRows,
  reportMonth,
  setReportMonth,
  rsmiRows,
}: {
  tab: FlowTab;
  orientation: Orientation;
  zoom: number;
  editable: boolean;
  inventoryItems: Item[];
  risItems: Item[];
  stockCardItems: Item[];
  iar: IarState;
  setIar: (state: IarState) => void;
  iarLines: Line[];
  setIarLines: (lines: Line[]) => void;
  ris: RisState;
  setRis: (state: RisState) => void;
  risLines: Line[];
  setRisLines: (lines: Line[]) => void;
  selectedItem?: Item;
  selectedItemId: string;
  setSelectedItemId: (id: string) => void;
  stockRows: StockRow[];
  reportMonth: string;
  setReportMonth: (month: string) => void;
  rsmiRows: RsmiRow[];
}) {
  return (
    <section className="flow-preview-shell">
      <div className="flow-preview-bg">
        <div
          className="flow-preview-zoom"
          style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }}
        >
          {tab === "iar" && (
            <IarPaper
              orientation={orientation}
              items={inventoryItems}
              form={iar}
              onForm={setIar}
              lines={iarLines}
              onLines={setIarLines}
              editable={editable}
            />
          )}
          {tab === "stock-card" && (
            <StockCardPaper
              orientation={orientation}
              items={stockCardItems}
              item={selectedItem}
              selectedItemId={selectedItemId}
              onSelectedItemId={setSelectedItemId}
              rows={stockRows}
              editable={editable}
            />
          )}
          {tab === "ris" && (
            <RisPaper
              orientation={orientation}
              items={risItems}
              form={ris}
              onForm={setRis}
              lines={risLines}
              onLines={setRisLines}
              editable={editable}
            />
          )}
          {tab === "rsmi" && (
            <RsmiPaper
              orientation={orientation}
              reportMonth={reportMonth}
              onReportMonth={setReportMonth}
              rows={rsmiRows}
              editable={editable}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function IarPaper({
  orientation,
  items,
  form,
  onForm,
  lines,
  onLines,
  editable,
}: {
  orientation: Orientation;
  items: Item[];
  form: IarState;
  onForm: (form: IarState) => void;
  lines: Line[];
  onLines: (lines: Line[]) => void;
  editable: boolean;
}) {
  const validLines = getPreviewLines(items, lines);
  const displayLines = editable
    ? padRows(lines, Math.max(8, lines.length))
    : padRows(validLines, 8);

  function updateLine(id: string, patch: Partial<Line>) {
    onLines(
      lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  function addLine() {
    onLines([...lines, blankLine()]);
  }

  function removeLine(id: string) {
    onLines(lines.length > 1 ? lines.filter((line) => line.id !== id) : lines);
  }

  return (
    <div className={`flow-paper ${orientation}`}>
      <PaperHeader
        title="Inspection and Acceptance Report"
        formNo={form.iarNo}
        editable={editable}
        onFormNo={(value) => onForm({ ...form, iarNo: value })}
      />
      <div className="paper-meta three">
        <PaperMeta
          label="Supplier"
          value={form.supplier}
          editable={editable}
          onChange={(value) => onForm({ ...form, supplier: value })}
        />
        <PaperMeta
          label="Invoice / DR No."
          value={form.invoiceNo}
          editable={editable}
          onChange={(value) => onForm({ ...form, invoiceNo: value })}
        />
        <PaperMeta
          label="Accepted By"
          value={form.acceptedBy}
          editable={editable}
          onChange={(value) => onForm({ ...form, acceptedBy: value })}
        />
      </div>
      <table className="paper-grid">
        <thead>
          <tr>
            <th className="stock-no-col">Stock No.</th>
            <th className="item-col">Item Description</th>
            <th>Unit</th>
            <th className="qty-col">Qty.</th>
            <th className="cost-col">Unit Cost</th>
            <th>Remarks</th>
            {editable && <th className="action-col"></th>}
          </tr>
        </thead>
        <tbody>
          {displayLines.map((line, index) => {
            const sourceLine = editable ? (line as Line | null) : null;
            const previewLine = editable
              ? getPreviewLine(items, sourceLine)
              : (line as PreviewLine | null);
            return (
              <tr key={sourceLine?.id || previewLine?.id || index}>
                <td>{String(index + 1).padStart(3, "0")}</td>
                <td>
                  {editable && sourceLine ? (
                    <select
                      className="paper-cell-control"
                      value={sourceLine.item_id}
                      onChange={(e) =>
                        updateLine(sourceLine.id, { item_id: e.target.value })
                      }
                    >
                      <option value="">Select item...</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    previewLine?.item?.name || ""
                  )}
                </td>
                <td>{previewLine?.item?.unit || ""}</td>
                <td className="right">
                  {editable && sourceLine ? (
                    <input
                      className="paper-cell-control right"
                      type="number"
                      min={1}
                      value={sourceLine.quantity}
                      onChange={(e) =>
                        updateLine(sourceLine.id, { quantity: e.target.value })
                      }
                    />
                  ) : (
                    previewLine?.quantity || ""
                  )}
                </td>
                <td className="right">
                  {editable && sourceLine ? (
                    <input
                      className="paper-cell-control right"
                      type="number"
                      min={0}
                      step="0.01"
                      value={sourceLine.unitCost}
                      onChange={(e) =>
                        updateLine(sourceLine.id, { unitCost: e.target.value })
                      }
                    />
                  ) : previewLine?.unitCost ? (
                    peso(Number(previewLine.unitCost))
                  ) : (
                    ""
                  )}
                </td>
                <td>
                  {editable && sourceLine ? (
                    <input
                      className="paper-cell-control"
                      value={sourceLine.remarks}
                      onChange={(e) =>
                        updateLine(sourceLine.id, { remarks: e.target.value })
                      }
                    />
                  ) : (
                    previewLine?.remarks || ""
                  )}
                </td>
                {editable && (
                  <td className="center">
                    {sourceLine && (
                      <button
                        className="flow-icon text-destructive"
                        onClick={() => removeLine(sourceLine.id)}
                        title="Remove row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {editable && (
        <button className="flow-secondary mt-3" onClick={addLine}>
          <Plus className="h-4 w-4" /> Add Row
        </button>
      )}
      <SignatureBlock
        labels={["Supply Officer", "Inspection Officer", "Accepted By"]}
        values={["", "", form.acceptedBy]}
      />
    </div>
  );
}

function StockCardPaper({
  orientation,
  items,
  item,
  selectedItemId,
  onSelectedItemId,
  rows,
  editable,
}: {
  orientation: Orientation;
  items: Item[];
  item?: Item;
  selectedItemId: string;
  onSelectedItemId: (id: string) => void;
  rows: StockRow[];
  editable: boolean;
}) {
  return (
    <div className={`flow-paper ${orientation}`}>
      <div className="paper-title-dark">Stock Card</div>
      <div className="paper-meta two">
        <div className="paper-meta-cell">
          <span>Item:</span>{" "}
          {editable ? (
            <select
              className="paper-meta-control"
              value={selectedItemId}
              onChange={(event) => onSelectedItemId(event.target.value)}
            >
              {items.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          ) : (
            item?.name || ""
          )}
        </div>
        <PaperMeta label="Stock No." value={item ? item.id.slice(0, 8) : ""} />
        <PaperMeta label="Description" value={item?.name || ""} />
        <PaperMeta label="Unit of Measurement" value={item?.unit || ""} />
      </div>
      <table className="paper-grid stock-card">
        <thead>
          <tr>
            <th>Date</th>
            <th>Reference</th>
            <th>Receipt Qty.</th>
            <th>Issue Qty.</th>
            <th>Office</th>
            <th>Balance Qty.</th>
          </tr>
        </thead>
        <tbody>
          {padRows(rows, 24).map((row, index) => (
            <tr key={row?.id || index}>
              <td>
                {row ? format(new Date(row.created_at), "MM/dd/yyyy") : ""}
              </td>
              <td>{extractReference(row?.remarks)}</td>
              <td className="right">
                {row?.type === "IN" ? row.quantity : ""}
              </td>
              <td className="right">
                {row?.type === "OUT" ? row.quantity : ""}
              </td>
              <td>{extractOffice(row?.remarks)}</td>
              <td className="right">{row?.balance ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RisPaper({
  orientation,
  items,
  form,
  onForm,
  lines,
  onLines,
  editable,
}: {
  orientation: Orientation;
  items: Item[];
  form: RisState;
  onForm: (form: RisState) => void;
  lines: Line[];
  onLines: (lines: Line[]) => void;
  editable: boolean;
}) {
  const validLines = getPreviewLines(items, lines);
  const displayLines = editable
    ? padRows(lines, Math.max(10, lines.length))
    : padRows(validLines, 10);

  function updateLine(id: string, patch: Partial<Line>) {
    onLines(
      lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  function addLine() {
    onLines([...lines, blankLine()]);
  }

  function removeLine(id: string) {
    onLines(lines.length > 1 ? lines.filter((line) => line.id !== id) : lines);
  }

  return (
    <div className={`flow-paper ${orientation} ris-paper`}>
      <div className="paper-title-dark">Requisition and Issue Slip</div>
      <div className="paper-meta two">
        <PaperMeta label="Entity Name" value="Government Stock Manager" />
        <PaperMeta label="Fund Cluster" value="01" />
        <PaperMeta
          label="Division"
          value={form.office}
          editable={editable}
          onChange={(value) => onForm({ ...form, office: value })}
        />
        <PaperMeta
          label="Responsibility Center Code"
          value="16 009 03 0001 07"
        />
        <PaperMeta
          label="Office"
          value={form.office || "Supplies and Materials Management"}
          editable={editable}
          onChange={(value) => onForm({ ...form, office: value })}
        />
        <PaperMeta
          label="RIS No."
          value={form.risNo}
          editable={editable}
          onChange={(value) => onForm({ ...form, risNo: value })}
        />
      </div>
      <table className="paper-grid ris-grid">
        <thead>
          <tr>
            <th colSpan={4}>Requisition</th>
            <th colSpan={2}>Stock Available?</th>
            <th colSpan={2}>Issue</th>
          </tr>
          <tr>
            <th className="stock-no-col">Stock No.</th>
            <th>Unit</th>
            <th className="item-col">Description</th>
            <th className="qty-col">Qty.</th>
            <th>Yes</th>
            <th>No</th>
            <th className="qty-col">Qty.</th>
            <th>Remarks</th>
            {editable && <th className="action-col"></th>}
          </tr>
        </thead>
        <tbody>
          {displayLines.map((line, index) => {
            const sourceLine = editable ? (line as Line | null) : null;
            const previewLine = editable
              ? getPreviewLine(items, sourceLine)
              : (line as PreviewLine | null);
            const requested = Number(previewLine?.quantity || 0);
            const available = previewLine?.item
              ? previewLine.item.quantity >= requested
              : false;
            return (
              <tr key={sourceLine?.id || previewLine?.id || index}>
                <td>{String(index + 1).padStart(3, "0")}</td>
                <td>{previewLine?.item?.unit || ""}</td>
                <td>
                  {editable && sourceLine ? (
                    <select
                      className="paper-cell-control"
                      value={sourceLine.item_id}
                      onChange={(e) =>
                        updateLine(sourceLine.id, { item_id: e.target.value })
                      }
                    >
                      <option value="">Select item...</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    previewLine?.item?.name || ""
                  )}
                </td>
                <td className="right">
                  {editable && sourceLine ? (
                    <input
                      className="paper-cell-control right"
                      type="number"
                      min={1}
                      value={sourceLine.quantity}
                      onChange={(e) =>
                        updateLine(sourceLine.id, { quantity: e.target.value })
                      }
                    />
                  ) : (
                    previewLine?.quantity || ""
                  )}
                </td>
                <td className="center">
                  {previewLine ? (available ? "/" : "") : ""}
                </td>
                <td className="center">
                  {previewLine ? (!available ? "/" : "") : ""}
                </td>
                <td className="right">
                  {available ? previewLine?.quantity : ""}
                </td>
                <td>
                  {editable && sourceLine ? (
                    <input
                      className="paper-cell-control"
                      value={sourceLine.remarks}
                      onChange={(e) =>
                        updateLine(sourceLine.id, { remarks: e.target.value })
                      }
                    />
                  ) : (
                    previewLine?.remarks || (previewLine ? "For issuance" : "")
                  )}
                </td>
                {editable && (
                  <td className="center">
                    {sourceLine && (
                      <button
                        className="flow-icon text-destructive"
                        onClick={() => removeLine(sourceLine.id)}
                        title="Remove row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {editable && (
        <button className="flow-secondary mt-3" onClick={addLine}>
          <Plus className="h-4 w-4" /> Add Row
        </button>
      )}
      <div className="paper-purpose">
        <strong>Purpose:</strong>{" "}
        {editable ? (
          <input
            className="paper-inline-control"
            value={form.purpose}
            onChange={(event) =>
              onForm({ ...form, purpose: event.target.value })
            }
          />
        ) : (
          form.purpose
        )}
      </div>
      <table className="signature-table">
        <tbody>
          <tr>
            <td>Signature</td>
            <td>Requested by:</td>
            <td>Approved by:</td>
            <td>Issued by:</td>
            <td>Received by:</td>
          </tr>
          <tr>
            <td>Printed Name</td>
            <td>
              {editable ? (
                <input
                  className="paper-cell-control center"
                  value={form.requestedBy}
                  onChange={(e) =>
                    onForm({ ...form, requestedBy: e.target.value })
                  }
                />
              ) : (
                form.requestedBy
              )}
            </td>
            <td>
              {editable ? (
                <input
                  className="paper-cell-control center"
                  value={form.approvedBy}
                  onChange={(e) =>
                    onForm({ ...form, approvedBy: e.target.value })
                  }
                />
              ) : (
                form.approvedBy
              )}
            </td>
            <td>
              {editable ? (
                <input
                  className="paper-cell-control center"
                  value={form.issuedBy}
                  onChange={(e) =>
                    onForm({ ...form, issuedBy: e.target.value })
                  }
                />
              ) : (
                form.issuedBy
              )}
            </td>
            <td>
              {editable ? (
                <input
                  className="paper-cell-control center"
                  value={form.receivedBy}
                  onChange={(e) =>
                    onForm({ ...form, receivedBy: e.target.value })
                  }
                />
              ) : (
                form.receivedBy
              )}
            </td>
          </tr>
          <tr>
            <td>Designation</td>
            <td>End User</td>
            <td>Head of Office</td>
            <td>Supply Officer</td>
            <td>End User</td>
          </tr>
          <tr>
            <td>Date</td>
            <td>{format(new Date(), "MMM d, yyyy")}</td>
            <td>{format(new Date(), "MMM d, yyyy")}</td>
            <td>{format(new Date(), "MMM d, yyyy")}</td>
            <td>{format(new Date(), "MMM d, yyyy")}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function RsmiPaper({
  orientation,
  reportMonth,
  onReportMonth,
  rows,
  editable,
}: {
  orientation: Orientation;
  reportMonth: string;
  onReportMonth: (month: string) => void;
  rows: RsmiRow[];
  editable: boolean;
}) {
  const recapRows = getRsmiRecapRows(rows);
  return (
    <div className={`flow-paper ${orientation} rsmi-paper`}>
      <div className="paper-title-dark">
        Report of Supplies and Materials Issued
      </div>
      <div className="paper-meta two">
        <PaperMeta label="Entity Name" value="Government Stock Manager" />
        <PaperMeta
          label="Report Month"
          value={reportMonth}
          editable={editable}
          type="month"
          onChange={onReportMonth}
        />
        <PaperMeta label="Fund Cluster" value="01" />
        <PaperMeta
          label="Prepared By"
          value="Supply and Property Division Unit"
        />
      </div>
      <table className="paper-grid">
        <thead>
          <tr>
            <th colSpan={6}>
              To be filled up by the Supply and/or Property Division Unit
            </th>
            <th colSpan={2}>To be filled up by the Accounting Division Unit</th>
          </tr>
          <tr>
            <th>RIS No.</th>
            <th>Responsibility Center Code</th>
            <th>Stock No.</th>
            <th>Item</th>
            <th>Unit</th>
            <th>Quantity Issued</th>
            <th>Unit Cost</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {padRows(rows, 12).map((row, index) => (
            <tr key={row?.id || index}>
              <td>{row?.risNo || ""}</td>
              <td>{row?.responsibilityCenterCode || ""}</td>
              <td>{row?.stockNo || ""}</td>
              <td>{row?.item || ""}</td>
              <td>{row?.unit || ""}</td>
              <td className="right">{row?.quantity || ""}</td>
              <td className="right">
                {row?.unitCost ? peso(row.unitCost) : ""}
              </td>
              <td className="right">{row?.amount ? peso(row.amount) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="paper-grid rsmi-recap">
        <thead>
          <tr>
            <th colSpan={2}>Recapitulation</th>
            <th colSpan={3}>Recapitulation</th>
          </tr>
          <tr>
            <th>Stock No.</th>
            <th>Quantity</th>
            <th>Unit Cost</th>
            <th>Total Cost</th>
            <th>UACS Object Code</th>
          </tr>
        </thead>
        <tbody>
          {padRows(recapRows, 8).map((row, index) => (
            <tr key={row?.stockNo || index}>
              <td>{row?.stockNo || ""}</td>
              <td className="right">{row?.quantity || ""}</td>
              <td className="right">
                {row?.unitCost ? peso(row.unitCost) : ""}
              </td>
              <td className="right">
                {row?.totalCost ? peso(row.totalCost) : ""}
              </td>
              <td>{row?.uacsObjectCode || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <SignatureBlock
        labels={["Certified Correct", "Posted By"]}
        values={["Supply and Property Custodian", "Accounting Staff"]}
      />
    </div>
  );
}

function LineEditor({
  items,
  lines,
  onLines,
  showCost = false,
  emptyMessage = "No items available.",
}: {
  items: Item[];
  lines: Line[];
  onLines: (lines: Line[]) => void;
  showCost?: boolean;
  emptyMessage?: string;
}) {
  function updateLine(id: string, patch: Partial<Line>) {
    onLines(
      lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  function removeLine(id: string) {
    onLines(lines.length > 1 ? lines.filter((line) => line.id !== id) : lines);
  }

  return (
    <div className="flow-scroll">
      <table className="flow-table line-editor-table min-w-[720px]">
        <thead>
          <tr>
            <th>Item</th>
            <th className="text-right">Available</th>
            <th className="text-right">Quantity</th>
            {showCost && <th className="text-right">Unit Cost</th>}
            <th>Remarks</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={showCost ? 6 : 5} className="px-3 py-6 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          )}
          {lines.map((line) => {
            const item = items.find(
              (candidate) => candidate.id === line.item_id,
            );
            return (
              <tr key={line.id}>
                <td>
                  <select
                    className="flow-input"
                    value={line.item_id}
                    onChange={(e) =>
                      updateLine(line.id, { item_id: e.target.value })
                    }
                  >
                    <option value="">Select item...</option>
                    {items.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="text-right tabular-nums">
                  {item ? `${item.quantity} ${item.unit}` : "-"}
                </td>
                <td>
                  <input
                    className="flow-input text-right"
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(line.id, { quantity: e.target.value })
                    }
                  />
                </td>
                {showCost && (
                  <td>
                    <input
                      className="flow-input text-right"
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unitCost}
                      onChange={(e) =>
                        updateLine(line.id, { unitCost: e.target.value })
                      }
                    />
                  </td>
                )}
                <td>
                  <input
                    className="flow-input"
                    value={line.remarks}
                    onChange={(e) =>
                      updateLine(line.id, { remarks: e.target.value })
                    }
                  />
                </td>
                <td className="text-right">
                  <button
                    className="flow-icon text-destructive"
                    onClick={() => removeLine(line.id)}
                    title="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={showCost ? 6 : 5}>
              <button
                className="flow-secondary"
                disabled={items.length === 0}
                onClick={() => onLines([...lines, blankLine()])}
              >
                <Plus className="h-4 w-4" /> Add Item
              </button>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function FlowSupportPanel({
  placement,
  stats,
  inventoryItems,
  transactions,
  reportMonth,
}: {
  placement: "side" | "bottom";
  stats: FlowStats;
  inventoryItems: Item[];
  transactions: Transaction[];
  reportMonth: string;
}) {
  const isBottom = placement === "bottom";
  const iarRows = transactions
    .filter((tx) => tx.type === "IN")
    .slice(-8)
    .reverse();
  const risRows = transactions
    .filter((tx) => tx.type === "OUT")
    .slice(-8)
    .reverse();

  return (
    <aside className="space-y-4">
      <div
        className={`grid grid-cols-2 gap-3 ${isBottom ? "xl:grid-cols-4" : ""}`}
      >
        <SupportCard label="Active Stage" value={stats.activeStage} />
        <SupportCard label="IAR Receipts" value={stats.iarReceipts} />
        <SupportCard label="RIS Issues" value={stats.risIssues} />
        <SupportCard label="Issued This Month" value={stats.issuedThisMonth} />
      </div>

      <div className={isBottom ? "grid gap-4 xl:grid-cols-2" : "space-y-4"}>
        <SupportTable
          title="Recent IAR Receipts"
          rows={iarRows}
          empty="No IAR receipts posted yet."
        />
        <SupportTable
          title="Recent RIS Issues"
          rows={risRows}
          empty="No RIS issues posted yet."
        />

        <section
          className={`rounded-lg border border-border bg-card ${isBottom ? "xl:col-span-2" : ""}`}
        >
          <div className="border-b border-border px-3 py-2 text-sm font-semibold">
            Inventory Items
          </div>
          <div className="flow-scroll border-0 rounded-none max-h-72">
            <table className="flow-table min-w-[560px] text-xs">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Unit</th>
                  <th className="text-right">Current Qty.</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {inventoryItems.slice(0, 12).map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.unit}</td>
                    <td className="text-right tabular-nums">{item.quantity}</td>
                    <td>{item.quantity > 0 ? "Available" : "Out"}</td>
                  </tr>
                ))}
                {inventoryItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-muted-foreground"
                    >
                      No inventory items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="sr-only">Report month: {reportMonth}</div>
    </aside>
  );
}

function SupportCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold tabular-nums">
        {value}
      </div>
    </div>
  );
}

function SupportTable({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: Transaction[];
  empty: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-3 py-2 text-sm font-semibold">
        {title}
      </div>
      <div className="flow-scroll border-0 rounded-none max-h-72">
        <table className="flow-table min-w-[560px] text-xs">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Item</th>
              <th className="text-right">Qty.</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{extractReference(row.remarks)}</td>
                <td>{row.item?.name || "-"}</td>
                <td className="text-right tabular-nums">{row.quantity}</td>
                <td>{format(new Date(row.created_at), "MMM d, yyyy")}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PaperHeader({
  title,
  formNo,
  editable,
  onFormNo,
}: {
  title: string;
  formNo: string;
  editable?: boolean;
  onFormNo?: (value: string) => void;
}) {
  return (
    <>
      <div className="paper-header">
        <div className="logo-box">LOGO</div>
        <div className="org-box">
          <div className="org-name">Government Stock Manager</div>
          <div className="org-address">Supplies and Materials Management</div>
        </div>
        <div className="form-no-box">
          <div className="small-label">Form No.</div>
          <div>
            {editable && onFormNo ? (
              <input
                className="paper-meta-control"
                value={formNo}
                onChange={(event) => onFormNo(event.target.value)}
              />
            ) : (
              formNo
            )}
          </div>
        </div>
      </div>
      <div className="paper-title-dark">{title}</div>
    </>
  );
}

function PaperMeta({
  label,
  value,
  editable,
  type = "text",
  onChange,
}: {
  label: string;
  value?: string;
  editable?: boolean;
  type?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="paper-meta-cell">
      <span>{label}:</span>{" "}
      {editable && onChange ? (
        <input
          className="paper-meta-control"
          type={type}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        value || ""
      )}
    </div>
  );
}

function SignatureBlock({
  labels,
  values,
}: {
  labels: string[];
  values: string[];
}) {
  return (
    <div
      className="signature-block"
      style={{
        gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))`,
      }}
    >
      {labels.map((label, index) => (
        <div key={label}>
          <div className="signature-line">{values[index] || ""}</div>
          <div className="signature-label">{label}</div>
        </div>
      ))}
    </div>
  );
}

function FormTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-border px-4 py-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function FlowField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function FlowActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end gap-2 border-t border-border pt-4">
      {children}
    </div>
  );
}

function blankLine(): Line {
  return {
    id: createId(),
    item_id: "",
    quantity: "1",
    unitCost: "",
    remarks: "",
  };
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getPreviewLines(items: Item[], lines: Line[]) {
  return lines
    .map((line) => ({
      ...line,
      item: items.find((item) => item.id === line.item_id),
    }))
    .filter((line) => line.item && Number(line.quantity) > 0);
}

type PreviewLine = Line & { item?: Item };

function getPreviewLine(
  items: Item[],
  line: Line | null | undefined,
): PreviewLine | null {
  if (!line) return null;
  return { ...line, item: items.find((item) => item.id === line.item_id) };
}

function getStockRows(
  item: Item | undefined,
  transactions: Transaction[],
): StockRow[] {
  if (!item) return [];
  const itemTransactions = transactions.filter((tx) => tx.item_id === item.id);
  const netMovement = itemTransactions.reduce(
    (sum, tx) => sum + (tx.type === "IN" ? tx.quantity : -tx.quantity),
    0,
  );
  let balance = item.quantity - netMovement;
  return itemTransactions.map((tx) => {
    balance += tx.type === "IN" ? tx.quantity : -tx.quantity;
    return { ...tx, balance };
  });
}

function getAcceptedStockItems(items: Item[], transactions: Transaction[]) {
  const acceptedItemIds = new Set(
    transactions
      .filter((tx) => tx.type === "IN" && isIarTransaction(tx))
      .map((tx) => tx.item_id),
  );

  return items.filter(
    (item) => acceptedItemIds.has(item.id) && Number(item.quantity) > 0,
  );
}

function getStockCardItems(items: Item[], transactions: Transaction[]) {
  const transactionItemIds = new Set(transactions.map((tx) => tx.item_id));
  const transactionItems = items.filter((item) => transactionItemIds.has(item.id));
  return transactionItems.length > 0 ? transactionItems : items;
}

function isIarTransaction(transaction: Transaction) {
  const source = (transaction as any).source_form_type;
  return source === "IAR" || extractReference(transaction.remarks).startsWith("IAR ");
}

type RsmiRow = {
  id: string;
  risNo: string;
  responsibilityCenterCode: string;
  stockNo: string;
  item: string;
  unit: string;
  quantity: number;
  unitCost: number;
  amount: number;
};

type RsmiRecapRow = {
  stockNo: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  uacsObjectCode: string;
};

type FlowStats = {
  activeStage: string;
  iarReceipts: number;
  risIssues: number;
  issuedThisMonth: number;
};

function getFlowStats(
  transactions: Transaction[],
  reportMonth: string,
  tab: FlowTab,
): FlowStats {
  return {
    activeStage: activeStageLabel(tab),
    iarReceipts: transactions.filter((tx) => tx.type === "IN").length,
    risIssues: transactions.filter((tx) => tx.type === "OUT").length,
    issuedThisMonth: transactions
      .filter(
        (tx) => tx.type === "OUT" && tx.created_at.slice(0, 7) === reportMonth,
      )
      .reduce((sum, tx) => sum + tx.quantity, 0),
  };
}

function activeStageLabel(tab: FlowTab) {
  if (tab === "iar") return "IAR";
  if (tab === "stock-card") return "Stock Card";
  if (tab === "ris") return "RIS";
  return "RSMI";
}

function getRsmiRows(
  transactions: Transaction[],
  reportMonth: string,
): RsmiRow[] {
  return transactions
    .filter(
      (tx) => tx.type === "OUT" && tx.created_at.slice(0, 7) === reportMonth,
    )
    .map((tx) => {
      const unitCost =
        extractUnitCost(tx.remarks) || findLatestReceiptCost(transactions, tx);
      return {
        id: tx.id,
        risNo: extractReference(tx.remarks),
        responsibilityCenterCode: extractResponsibilityCenter(tx.remarks),
        stockNo: tx.item_id.slice(0, 8),
        item: tx.item?.name || "Unknown item",
        unit: tx.item?.unit || "",
        quantity: tx.quantity,
        unitCost,
        amount: tx.quantity * unitCost,
      };
    });
}

async function createAccountabilityDocuments({
  risId,
  risNo,
  office,
  custodian,
  userId,
  userName,
  lines,
}: {
  risId: string;
  risNo: string;
  office: string;
  custodian: string;
  userId?: string;
  userName: string;
  lines: Array<Line & { item?: Item }>;
}) {
  const semiExpendable = lines.filter(
    (line) =>
      line.item?.inventory_classification === "semi_expendable_property",
  );
  const ppe = lines.filter(
    (line) => line.item?.inventory_classification === "ppe",
  );

  if (semiExpendable.length > 0) {
    const { data: ics, error } = await supabase
      .from("ics_forms")
      .insert({
        ics_no: `ICS-${risNo}`,
        ris_id: risId,
        custodian_name: custodian,
        office,
        created_by: userId,
        created_by_name: userName,
      })
      .select("id")
      .single();

    if (error) return error.message;

    const { error: itemError } = await supabase.from("ics_items").insert(
      semiExpendable.map((line) => ({
        ics_id: ics.id,
        item_id: line.item_id,
        quantity: Number(line.quantity),
        unit_cost: Number(line.item?.acquisition_cost || 0),
        remarks: line.remarks || null,
      })),
    );

    if (itemError) return itemError.message;
  }

  if (ppe.length > 0) {
    const { data: par, error } = await supabase
      .from("par_forms")
      .insert({
        par_no: `PAR-${risNo}`,
        ris_id: risId,
        accountable_person: custodian,
        office,
        created_by: userId,
        created_by_name: userName,
      })
      .select("id")
      .single();

    if (error) return error.message;

    const { error: itemError } = await supabase.from("par_items").insert(
      ppe.map((line) => ({
        par_id: par.id,
        item_id: line.item_id,
        quantity: Number(line.quantity),
        unit_cost: Number(line.item?.acquisition_cost || 0),
        remarks: line.remarks || null,
      })),
    );

    if (itemError) return itemError.message;
  }

  return null;
}

function findLatestReceiptCost(
  transactions: Transaction[],
  issue: Transaction,
) {
  const issueDate = new Date(issue.created_at).getTime();
  const receipt = transactions
    .filter(
      (tx) =>
        tx.type === "IN" &&
        tx.item_id === issue.item_id &&
        new Date(tx.created_at).getTime() <= issueDate,
    )
    .reverse()
    .find((tx) => extractUnitCost(tx.remarks) > 0);
  return extractUnitCost(receipt?.remarks);
}

function getRsmiRecapRows(rows: RsmiRow[]): RsmiRecapRow[] {
  const groups = new Map<string, RsmiRecapRow>();
  rows.forEach((row) => {
    const key = `${row.stockNo}-${row.unitCost}`;
    const group = groups.get(key) ?? {
      stockNo: row.stockNo,
      quantity: 0,
      unitCost: row.unitCost,
      totalCost: 0,
      uacsObjectCode: "",
    };
    group.quantity += row.quantity;
    group.totalCost += row.amount;
    groups.set(key, group);
  });
  return Array.from(groups.values());
}

function padRows<T>(rows: T[], count: number): Array<T | null> {
  return [
    ...rows,
    ...Array.from({ length: Math.max(0, count - rows.length) }, () => null),
  ];
}

function extractReference(remarks?: string | null) {
  if (!remarks) return "";
  return remarks.split("|")[0]?.trim() || "";
}

function extractOffice(remarks?: string | null) {
  if (!remarks) return "";
  const office = remarks
    .split("|")
    .find((part) => part.trim().startsWith("Office:"));
  return office?.replace("Office:", "").trim() || "";
}

function extractResponsibilityCenter(remarks?: string | null) {
  if (!remarks) return "16 009 03 0001 07";
  const center = remarks
    .split("|")
    .find((part) => part.trim().startsWith("Responsibility Center:"));
  return (
    center?.replace("Responsibility Center:", "").trim() || "16 009 03 0001 07"
  );
}

function extractUnitCost(remarks?: string | null) {
  if (!remarks) return 0;
  const cost = remarks
    .split("|")
    .find((part) => part.trim().startsWith("Unit Cost:"));
  const rawValue = cost?.replace("Unit Cost:", "").replace(/[^\d.]/g, "");
  return Number(rawValue || 0);
}

function peso(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value || 0);
}

const flowStyles = `
.flow-header-btn,.flow-header-primary{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;border-radius:6px;padding:.48rem .75rem;font-size:.875rem;font-weight:600;line-height:1;border:1px solid var(--color-input)}
.flow-header-btn{background:var(--color-card);color:var(--color-foreground)}
.flow-header-btn:hover{background:var(--color-accent)}
.flow-header-btn:disabled,.flow-header-primary:disabled{opacity:.55;cursor:not-allowed}
.flow-header-primary{background:var(--color-primary);color:var(--color-primary-foreground);border-color:var(--color-primary)}
.flow-input{width:100%;border:1px solid var(--color-input);background:var(--color-card);border-radius:6px;padding:.48rem .62rem;font-size:.875rem;outline:none}
.flow-input:focus{border-color:var(--color-ring);box-shadow:0 0 0 3px color-mix(in oklab,var(--color-ring) 20%,transparent)}
.flow-scroll{overflow:auto;border:1px solid var(--color-border);border-radius:8px}
.flow-table{width:100%;border-collapse:collapse;font-size:.875rem}
.flow-table th{background:var(--color-muted);color:var(--color-muted-foreground);font-size:.75rem;text-transform:uppercase;font-weight:700}
.flow-table th,.flow-table td{border-bottom:1px solid var(--color-border);padding:.6rem .7rem;text-align:left;vertical-align:middle}
.flow-table tfoot td{border-bottom:0;background:color-mix(in oklab,var(--color-muted) 55%,transparent)}
.flow-primary,.flow-secondary{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;border-radius:6px;padding:.55rem .85rem;font-size:.875rem;font-weight:600}
.flow-primary{background:var(--color-primary);color:var(--color-primary-foreground)}
.flow-primary:disabled{opacity:.55;cursor:not-allowed}
.flow-secondary{border:1px solid var(--color-input);background:var(--color-card);color:var(--color-foreground)}
.flow-icon{display:inline-grid;place-items:center;border-radius:5px;padding:.3rem}
.flow-icon:hover,.flow-secondary:hover{background:var(--color-accent)}
.line-editor-table th:first-child,.line-editor-table td:first-child{min-width:300px}
.line-editor-table th:nth-child(3),.line-editor-table td:nth-child(3){width:92px}
.line-editor-table th:nth-child(4),.line-editor-table td:nth-child(4){width:105px}
.flow-preview-shell{border:1px solid var(--color-border);border-radius:8px;background:var(--color-card);overflow:hidden}
.flow-preview-bg{overflow:auto;background:#e5e7eb;padding:16px}
.flow-preview-zoom{transform-origin:top center;margin:0 auto}
.flow-paper{width:min(100%,8.5in);min-height:auto;aspect-ratio:8.5 / 13;margin:0 auto;background:white;color:#111;border:2px solid #111;padding:18px;font-family:Arial,sans-serif;font-size:11px}
.flow-paper.landscape{width:min(100%,13in);aspect-ratio:13 / 8.5}
.paper-header{display:grid;grid-template-columns:90px minmax(0,1fr) 135px;border:1px solid #111}
.logo-box{display:grid;place-items:center;min-height:70px;border-right:1px solid #111;font-weight:800}
.org-box{border-right:1px solid #111;padding:9px;text-align:center}
.org-name{font-size:15px;font-weight:800;text-transform:uppercase}
.org-address{font-size:11px;margin-top:3px}
.form-no-box{background:#e6f6ff;padding:8px;font-weight:700}
.small-label{font-size:9px;text-transform:uppercase}
.paper-title-dark{margin:10px 0;background:#0f2348;color:#fff;text-align:center;text-transform:uppercase;font-weight:800;letter-spacing:.04em;padding:7px;font-size:12px}
.paper-meta{display:grid;border:1px solid #111;border-bottom:0}
.paper-meta.two{grid-template-columns:1fr 1fr}
.paper-meta.three{grid-template-columns:1fr 1fr 1fr}
.paper-meta-cell{min-height:27px;border-bottom:1px solid #111;padding:6px}
.paper-meta-cell:not(:last-child){border-right:1px solid #111}
.paper-meta-cell span{font-weight:800}
.paper-grid{width:100%;border-collapse:collapse;font-size:10px}
.paper-grid th,.paper-grid td{border:1px solid #111;padding:5px;vertical-align:middle}
.paper-grid th{background:#eef2f7;text-transform:uppercase;font-size:9px}
.paper-grid td{height:24px}
.stock-no-col{width:58px}
.qty-col{width:68px}
.cost-col{width:86px}
.action-col{width:32px}
.item-col{min-width:230px}
.paper-cell-control,.paper-meta-control,.paper-inline-control{width:100%;border:0;background:transparent;color:#111;font:inherit;outline:none}
.paper-cell-control{height:22px;padding:1px 2px}
.paper-meta-control{padding:0 2px;font-weight:400}
.paper-inline-control{display:inline-block;width:calc(100% - 60px);padding:0 2px}
.paper-cell-control:focus,.paper-meta-control:focus,.paper-inline-control:focus{box-shadow:inset 0 -1px 0 #0f2348;background:#f8fafc}
.right{text-align:right}
.center{text-align:center}
.paper-purpose{min-height:45px;border:1px solid #111;border-top:0;padding:7px}
.signature-block{display:grid;gap:20px;margin-top:54px}
.signature-line{border-bottom:1px solid #111;min-height:24px;text-align:center}
.signature-label{text-align:center;text-transform:uppercase;font-size:9px;font-weight:800;margin-top:4px}
.signature-table{width:100%;border-collapse:collapse;font-size:10px}
.signature-table td{border:1px solid #111;padding:5px;text-align:center;height:30px}
.signature-table td:first-child{width:110px;text-align:left;font-weight:800}
@media (max-width: 760px){
  .flow-preview-bg{padding:8px}
  .flow-paper{padding:10px}
  .paper-header{grid-template-columns:70px minmax(0,1fr)}
  .form-no-box{grid-column:1 / -1;border-top:1px solid #111}
  .paper-meta.two,.paper-meta.three{grid-template-columns:1fr}
  .paper-meta-cell:not(:last-child){border-right:0}
}
`;
