import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Boxes,
  Building2,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  LayoutPanelLeft,
  PackageCheck,
  Plus,
  Printer,
  Save,
  Send,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { PageHeader } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import {
  createIarForm,
  createIarItem,
  createIcsForm,
  createIcsItem,
  createParForm,
  createParItem,
  createRisForm,
  createRisItem,
  createTransaction,
  listFormPersonnelMemory,
  listItems,
  listTransactionsAsc,
  rememberFormPersonnel,
  reserveNextFormNumber,
} from "@/lib/data.functions";

export const Route = createFileRoute("/_app/forms")({
  head: () => ({ meta: [{ title: "Forms Flow - Supplify" }] }),
  component: FormsFlow,
});

type FlowTab = "iar" | "stock-card" | "ris" | "rsmi" | "rpci";
type PropertyFlow = "supplies" | "semi-expendable" | "ppe";
type ViewMode = "preview" | "split";
type Orientation = "portrait" | "landscape";

type Item = {
  id: string;
  name: string;
  description?: string | null;
  item_type?: "supply" | "material";
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
  source_form_type?: "IAR" | "RIS" | string | null;
  source_form_id?: string | null;
  source_line_id?: string | null;
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
  entityName: string;
  fundCluster: string;
  supplier: string;
  poNoDate: string;
  requisitioningOffice: string;
  responsibilityCenter: string;
  invoiceNo: string;
  iarDate: string;
  invoiceDate: string;
  dateInspected: string;
  dateReceived: string;
  inspectionOfficer: string;
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
  requestedDesignation: string;
  approvedDesignation: string;
  issuedDesignation: string;
  receivedDesignation: string;
  requestedDate: string;
  approvedDate: string;
  issuedDate: string;
  receivedDate: string;
  verificationToken: string;
  verificationCode: string;
  verificationStatus: "draft" | "issued" | "verified";
  issuedAt: string;
};

type PersonnelRole =
  | "iar_accepted_by"
  | "ris_requested_by"
  | "ris_approved_by"
  | "ris_issued_by"
  | "ris_received_by";

type PersonnelMemory = {
  role: PersonnelRole;
  person_name: string;
  last_used_at: string;
};

type RpciEntry = { onHand: string; remarks: string };

type RpciRow = {
  id: string;
  article: string;
  description: string;
  stockNo: string;
  unit: string;
  unitValue: number;
  cardBalance: number;
  onHand: number;
  varianceQuantity: number;
  varianceValue: number;
  remarks: string;
};

const FORM_DEFAULTS = {
  entityName: "PROVINCIAL TRAINING CENTER - DAVAO DEL NORTE",
  fundCluster: "06-SSP",
  responsibilityCenter: "16 009 3 00011 07",
  risResponsibilityCenter: "16 009 03 0001 07",
  inspectionOfficer: "JOHN EARVIN C. GONZALES",
  custodian: "ENGR. JENY E. BUSCANO",
  requestedBy: "JOHN EARVIN C. GONZALES",
  requestedDesignation: "TESD Specialist II",
  approvedBy: "ENGR. ALBERT N. MANINGO",
  approvedDesignation: "Head of Procuring Entity / Center Administrator",
  issuedBy: "ENGR. JENY E. BUSCANO",
  issuedDesignation: "Sr. TESDS / Supply Officer",
  receivedBy: "JOHN EARVIN C. GONZALES",
  receivedDesignation: "TESD Specialist II",
  accountingStaff: "MAYSHEENA S. MANILA",
  accountingDesignation: "Administrative Officer IV",
};

function FormsFlow() {
  const { canWrite, user } = useAuth();
  const queryClient = useQueryClient();
  const userName = user?.user_metadata?.full_name || user?.email || "";
  const today = new Date().toISOString().slice(0, 10);
  const initialVerification = useRef(createVerificationIdentity());

  const [propertyFlow, setPropertyFlow] = useState<PropertyFlow>("supplies");
  const [tab, setTab] = useState<FlowTab>("iar");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [zoom, setZoom] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [reportMonth, setReportMonth] = useState(today.slice(0, 7));
  const [reportYear, setReportYear] = useState(today.slice(0, 4));
  const [rpciFundCluster, setRpciFundCluster] = useState(FORM_DEFAULTS.fundCluster);
  const [rpciEntries, setRpciEntries] = useState<Record<string, RpciEntry>>({});
  const [iar, setIar] = useState<IarState>({
    iarNo: makeFormNumber("IAR", today),
    entityName: FORM_DEFAULTS.entityName,
    fundCluster: FORM_DEFAULTS.fundCluster,
    supplier: "",
    poNoDate: "",
    requisitioningOffice: "",
    responsibilityCenter: FORM_DEFAULTS.responsibilityCenter,
    invoiceNo: "",
    iarDate: today,
    invoiceDate: today,
    dateInspected: today,
    dateReceived: today,
    inspectionOfficer: FORM_DEFAULTS.inspectionOfficer,
    acceptedBy: FORM_DEFAULTS.custodian,
  });
  const [iarLines, setIarLines] = useState<Line[]>(
    Array.from({ length: 4 }, blankLine),
  );
  const [ris, setRis] = useState<RisState>({
    risNo: makeFormNumber("RIS", today),
    office: "",
    purpose: "",
    requestedBy: FORM_DEFAULTS.requestedBy,
    approvedBy: FORM_DEFAULTS.approvedBy,
    issuedBy: FORM_DEFAULTS.issuedBy,
    receivedBy: FORM_DEFAULTS.receivedBy,
    requestedDesignation: FORM_DEFAULTS.requestedDesignation,
    approvedDesignation: FORM_DEFAULTS.approvedDesignation,
    issuedDesignation: FORM_DEFAULTS.issuedDesignation,
    receivedDesignation: FORM_DEFAULTS.receivedDesignation,
    requestedDate: today,
    approvedDate: today,
    issuedDate: today,
    receivedDate: today,
    verificationToken: initialVerification.current.token,
    verificationCode: initialVerification.current.code,
    verificationStatus: "draft",
    issuedAt: "",
  });
  const [risLines, setRisLines] = useState<Line[]>([blankLine()]);
  const [saving, setSaving] = useState(false);
  const initializedPersonnel = useRef(false);
  const initializedRisNumber = useRef(false);

  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: () => listItems() as Promise<Item[]>,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", "forms-flow"],
    queryFn: () => listTransactionsAsc() as Promise<Transaction[]>,
  });

  const { data: personnelMemory = [] } = useQuery({
    queryKey: ["form-personnel-memory"],
    queryFn: () =>
      listFormPersonnelMemory() as Promise<PersonnelMemory[]>,
  });

  const personnelOptions = useMemo(
    () => groupPersonnelMemory(personnelMemory as PersonnelMemory[]),
    [personnelMemory],
  );

  useEffect(() => {
    if (initializedPersonnel.current || personnelMemory.length === 0) return;
    initializedPersonnel.current = true;
    const latest = groupPersonnelMemory(personnelMemory as PersonnelMemory[]);
    setIar((current) => ({
      ...current,
      acceptedBy: latest.iar_accepted_by?.[0] || current.acceptedBy,
    }));
    setRis((current) => ({
      ...current,
      requestedBy: latest.ris_requested_by?.[0] || current.requestedBy,
      approvedBy: latest.ris_approved_by?.[0] || current.approvedBy,
      issuedBy: latest.ris_issued_by?.[0] || current.issuedBy,
      receivedBy: latest.ris_received_by?.[0] || current.receivedBy,
    }));
  }, [personnelMemory]);

  useEffect(() => {
    if (initializedRisNumber.current) return;
    initializedRisNumber.current = true;
    void reserveNextRisNumber(today).then((risNo) => {
      if (risNo) setRis((current) => ({ ...current, risNo }));
    });
  }, [today]);

  const flowItems = useMemo(
    () => items.filter((item) => itemMatchesPropertyFlow(item, propertyFlow)),
    [items, propertyFlow],
  );
  const acceptedStockItems = useMemo(
    () => getAcceptedStockItems(flowItems, transactions),
    [flowItems, transactions],
  );
  const stockCardItems = useMemo(
    () => getStockCardItems(flowItems, transactions),
    [flowItems, transactions],
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
  const rpciRows = useMemo(
    () => getRpciRows(items, transactions, reportYear, rpciEntries),
    [items, transactions, reportYear, rpciEntries],
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
    try {
      const iarRecord = await createIarForm({ data: {
        iar_no: iar.iarNo,
        supplier: iar.supplier || null,
        invoice_no: iar.invoiceNo || null,
        accepted_by: iar.acceptedBy || null,
        created_by: user?.id,
        created_by_name: userName,
      } });

      for (const line of validLines) {
        const tx = await createTransaction({ data: {
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
        } });

        await createIarItem({ data: {
        iar_id: iarRecord.id,
        item_id: line.item_id,
        quantity: Number(line.quantity),
        unit_cost: Number(line.unitCost || 0),
        amount: Number(line.quantity) * Number(line.unitCost || 0),
        remarks: line.remarks || null,
        transaction_id: tx.id,
        } });
      }
    } catch (error) {
      if (isUniqueViolation(error as { code?: string; message?: string })) {
        const nextIarNo = makeFormNumber("IAR", today);
        setIar({ ...iar, iarNo: nextIarNo });
        setSaving(false);
        return toast.error(
          `IAR No. ${iar.iarNo} already exists. I prepared ${nextIarNo}; try posting again.`,
        );
      }
      setSaving(false);
      return toast.error(errorMessage(error));
    }

    await rememberPersonnel("iar_accepted_by", iar.acceptedBy);
    setSaving(false);
    toast.success("IAR posted. Stock card receipts were added.");
    refreshFlow();
    setSelectedItemId(validLines[0]?.item_id || "");
    setIar({
      ...iar,
      iarNo: makeFormNumber("IAR", today),
      supplier: "",
      poNoDate: "",
      invoiceNo: "",
    });
    setIarLines(Array.from({ length: 4 }, blankLine));
    setTab(propertyFlow === "supplies" ? "stock-card" : "iar");
  }

  async function saveRis() {
    if (ris.verificationStatus === "verified")
      return toast.info("This RIS is already issued and verified. Reset to start a new RIS.");
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
    let risRecord: any;
    try {
      risRecord = await createRisForm({ data: {
        ris_no: ris.risNo,
        office: ris.office,
        purpose: ris.purpose || null,
        requested_by: ris.requestedBy || null,
        approved_by: ris.approvedBy || null,
        issued_by: ris.issuedBy || null,
        received_by: ris.receivedBy || null,
        approved_date: ris.approvedDate || null,
        issued_date: ris.issuedDate || null,
        verification_token: ris.verificationToken,
        verification_code: ris.verificationCode,
        document_version: 1,
        verification_status: "issued",
        verification_published_at: new Date().toISOString(),
        created_by: user?.id,
        created_by_name: userName,
      } });
    } catch (error) {
      if (isUniqueViolation(error as { code?: string; message?: string })) {
        const nextRisNo =
          (await reserveNextRisNumber(today)) || makeFormNumber("RIS", today);
        setRis({ ...ris, risNo: nextRisNo });
        setSaving(false);
        return toast.error(
          `RIS No. ${ris.risNo} already exists. I prepared ${nextRisNo}; try saving again.`,
        );
      }
      setSaving(false);
      return toast.error(errorMessage(error));
    }

    const issuedLines: Array<Line & { item?: Item }> = [];

    for (const line of validLines) {
      const item =
        acceptedStockItems.find(
          (candidate: Item) => candidate.id === line.item_id,
        ) ?? items.find((candidate: Item) => candidate.id === line.item_id);
      try {
        const tx = await createTransaction({ data: {
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
        } });

        await createRisItem({ data: {
        ris_id: risRecord.id,
        item_id: line.item_id,
        quantity: Number(line.quantity),
        remarks: line.remarks || null,
        transaction_id: tx.id,
        } });
      } catch (error) {
        setSaving(false);
        return toast.error(errorMessage(error));
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

    await Promise.all([
      rememberPersonnel("ris_requested_by", ris.requestedBy),
      rememberPersonnel("ris_approved_by", ris.approvedBy),
      rememberPersonnel("ris_issued_by", ris.issuedBy),
      rememberPersonnel("ris_received_by", ris.receivedBy),
    ]);
    setSaving(false);
    toast.success("RIS issued. Authenticated QR verification is active.");
    refreshFlow();
    setRis({
      ...ris,
      verificationStatus: "verified",
      issuedAt: new Date().toISOString(),
    });
    setTab("ris");
  }

  async function resetActiveForm() {
    if (!window.confirm(`Clear the current ${activeStageLabel(tab)} input?`))
      return;
    if (tab === "iar") {
      setIar({
        iarNo: makeFormNumber("IAR", today),
        entityName: FORM_DEFAULTS.entityName,
        fundCluster: FORM_DEFAULTS.fundCluster,
        supplier: "",
        poNoDate: "",
        requisitioningOffice: "",
        responsibilityCenter: FORM_DEFAULTS.responsibilityCenter,
        invoiceNo: "",
        iarDate: today,
        invoiceDate: today,
        dateInspected: today,
        dateReceived: today,
        inspectionOfficer: FORM_DEFAULTS.inspectionOfficer,
        acceptedBy: FORM_DEFAULTS.custodian,
      });
      setIarLines(Array.from({ length: 4 }, blankLine));
    } else if (tab === "ris") {
      const verification = createVerificationIdentity();
      const nextRisNo =
        (await reserveNextRisNumber(today)) || makeFormNumber("RIS", today);
      setRis({
        risNo: nextRisNo,
        office: "",
        purpose: "",
        requestedBy: FORM_DEFAULTS.requestedBy,
        approvedBy: FORM_DEFAULTS.approvedBy,
        issuedBy: FORM_DEFAULTS.issuedBy,
        receivedBy: FORM_DEFAULTS.receivedBy,
        requestedDesignation: FORM_DEFAULTS.requestedDesignation,
        approvedDesignation: FORM_DEFAULTS.approvedDesignation,
        issuedDesignation: FORM_DEFAULTS.issuedDesignation,
        receivedDesignation: FORM_DEFAULTS.receivedDesignation,
        requestedDate: today,
        approvedDate: today,
        issuedDate: today,
        receivedDate: today,
        verificationToken: verification.token,
        verificationCode: verification.code,
        verificationStatus: "draft",
        issuedAt: "",
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

  function printActiveForm() {
    const paper = document.querySelector(".flow-paper");
    if (!paper) return toast.error("No form preview available to print.");

    document.querySelector(".forms-print-root")?.remove();
    const printRoot = document.createElement("div");
    printRoot.className = "forms-print-root";
    const printPaper = paper.cloneNode(true) as HTMLElement;
    normalizePrintControls(printPaper);
    printRoot.appendChild(printPaper);
    document.body.appendChild(printRoot);
    document.body.classList.add("printing-form");

    const cleanupPrint = () => {
      document.body.classList.remove("printing-form");
      printRoot.remove();
      window.removeEventListener("afterprint", cleanupPrint);
    };

    window.addEventListener("afterprint", cleanupPrint);
    window.print();
    window.setTimeout(cleanupPrint, 1000);
  }

  return (
    <div>
      <PageHeader
        title="Forms Flow"
        subtitle="Manage forms by inventory and property classification"
        actions={
          <>
            <button
              onClick={printActiveForm}
              className="flow-header-btn"
            >
              <Printer className="h-4 w-4" /> Print Form
            </button>
            <button
              onClick={resetActiveForm}
              disabled={
                tab === "stock-card" ||
                tab === "rsmi" ||
                tab === "rpci"
              }
              className="flow-header-btn"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
            <button
              onClick={saveActiveStage}
              disabled={
                !canWrite || saving || tab === "stock-card" || tab === "rsmi" || tab === "rpci"
                || (tab === "ris" && ris.verificationStatus === "verified")
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
                  ? ris.verificationStatus === "verified"
                    ? "RIS Verified"
                    : ris.verificationStatus === "issued"
                      ? "Verify RIS"
                      : "Issue RIS"
                  : tab === "iar"
                    ? "Post IAR"
                    : "Generated"}
            </button>
          </>
        }
      />

      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <PropertyFlowSwitcher
          active={propertyFlow}
          onChange={(nextFlow) => {
            setPropertyFlow(nextFlow);
            setTab("iar");
            setSelectedItemId("");
          }}
        />

        {propertyFlow === "supplies" ? (
          <WorkflowStepper active={tab} onChange={setTab} />
        ) : (
          <FoundationStepper
            propertyFlow={propertyFlow}
            active={tab === "ris" ? "ris" : "iar"}
            onChange={setTab}
          />
        )}

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
                  inventoryItems={flowItems}
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
                  reportYear={reportYear}
                  setReportYear={setReportYear}
                  rpciFundCluster={rpciFundCluster}
                  setRpciFundCluster={setRpciFundCluster}
                  onSaveIar={saveIar}
                  onSaveRis={saveRis}
                  personnelOptions={personnelOptions}
                />
              )}

              <PaperPreview
                tab={tab}
                orientation={orientation}
                zoom={zoom}
                editable
                inventoryItems={flowItems}
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
                reportYear={reportYear}
                setReportYear={setReportYear}
                rpciFundCluster={rpciFundCluster}
                setRpciFundCluster={setRpciFundCluster}
                rpciRows={rpciRows}
                rpciEntries={rpciEntries}
                setRpciEntries={setRpciEntries}
                personnelOptions={personnelOptions}
              />
            </div>
          </main>

          <FlowSupportPanel
            placement={viewMode === "split" ? "bottom" : "side"}
            stats={flowStats}
            inventoryItems={flowItems}
            transactions={transactions}
            reportMonth={reportMonth}
          />
        </div>
      </div>
      <style>{flowStyles}</style>
    </div>
  );
}

const PROPERTY_FLOWS: {
  value: PropertyFlow;
  label: string;
  shortLabel: string;
  detail: string;
  icon: any;
}[] = [
  {
    value: "supplies",
    label: "Supplies & Materials",
    shortLabel: "Supplies",
    detail: "Consumable and expendable inventory",
    icon: Boxes,
  },
  {
    value: "semi-expendable",
    label: "Semi-Expendable Property",
    shortLabel: "Semi-Expendable",
    detail: "Property below the PPE capitalization threshold",
    icon: PackageCheck,
  },
  {
    value: "ppe",
    label: "Property, Plant & Equipment",
    shortLabel: "PPE",
    detail: "Capitalized property and equipment",
    icon: Building2,
  },
];

function PropertyFlowSwitcher({
  active,
  onChange,
}: {
  active: PropertyFlow;
  onChange: (flow: PropertyFlow) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-2 shadow-sm">
      <div className="grid gap-2 lg:grid-cols-3">
        {PROPERTY_FLOWS.map((flow) => {
          const Icon = flow.icon;
          const isActive = active === flow.value;
          return (
            <button
              key={flow.value}
              type="button"
              onClick={() => onChange(flow.value)}
              aria-pressed={isActive}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-transparent hover:border-border hover:bg-accent"
              }`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                  isActive ? "bg-white/15" : "bg-muted text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold sm:hidden">
                  {flow.shortLabel}
                </span>
                <span className="hidden text-sm font-semibold sm:block">
                  {flow.label}
                </span>
                <span
                  className={`mt-0.5 block truncate text-xs ${
                    isActive
                      ? "text-primary-foreground/75"
                      : "text-muted-foreground"
                  }`}
                >
                  {flow.detail}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function FoundationStepper({
  propertyFlow,
  active,
  onChange,
}: {
  propertyFlow: Exclude<PropertyFlow, "supplies">;
  active: "iar" | "ris";
  onChange: (tab: FlowTab) => void;
}) {
  const isSemiExpendable = propertyFlow === "semi-expendable";
  const title = isSemiExpendable
    ? "Semi-Expendable Property"
    : "Property, Plant & Equipment";
  const stages = isSemiExpendable
    ? [
        { label: "IAR", detail: "Inspection and acceptance", tab: "iar" as const },
        { label: "Semi-Expendable Property Card", detail: "Individual property ledger" },
        { label: "RIS", detail: "Property issuance request", tab: "ris" as const },
        { label: "ICS", detail: "Inventory Custodian Slip" },
        { label: "Registry & Reports", detail: "Semi-expendable monitoring" },
      ]
    : [
        { label: "IAR", detail: "Inspection and acceptance", tab: "iar" as const },
        { label: "Property Card", detail: "Individual property ledger" },
        { label: "RIS", detail: "Property issuance request", tab: "ris" as const },
        { label: "PAR", detail: "Property Acknowledgment Receipt" },
        { label: "RCPPE", detail: "Annual physical count report" },
      ];

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/35 px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">{title} Flow</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              IAR and RIS are active. Remaining documents are prepared for future development.
            </p>
          </div>
          <span className="w-fit rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            2 active forms
          </span>
        </div>
      </div>

      <div className="p-2">
        <div className="grid gap-2 lg:grid-cols-5">
          {stages.map((stage, index) => {
            const enabled = Boolean(stage.tab);
            const isActive = stage.tab === active;
            return (
            <button
              key={stage.label}
              type="button"
              disabled={!enabled}
              onClick={() => stage.tab && onChange(stage.tab)}
              className={`relative rounded-lg border p-3 text-left transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : enabled
                    ? "border-border bg-background hover:bg-accent"
                    : "cursor-not-allowed border-dashed border-border bg-muted/30 opacity-65"
              }`}
            >
              <span className={`mb-2 grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                isActive ? "bg-white/15" : "bg-muted text-foreground"
              }`}>
                {index + 1}
              </span>
              <h3 className="text-sm font-semibold">{stage.label}</h3>
              <p className={`mt-1 text-xs leading-5 ${
                isActive ? "text-primary-foreground/75" : "text-muted-foreground"
              }`}>
                {stage.detail}
              </p>
              {!enabled && (
                <span className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Coming next
                </span>
              )}
              {index < stages.length - 1 && (
                <span className="absolute -right-2.5 top-1/2 z-10 hidden h-5 w-5 place-items-center rounded-full border border-border bg-card text-xs text-muted-foreground lg:grid">
                  →
                </span>
              )}
            </button>
          )})}
        </div>
      </div>
    </section>
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
      {
        value: "rpci",
        label: "RPCI",
        detail: "Annual physical count",
        icon: FileSpreadsheet,
      },
    ];

  return (
    <div className="grid gap-2 rounded-lg border border-border bg-card p-2 md:grid-cols-5">
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
  reportYear,
  setReportYear,
  rpciFundCluster,
  setRpciFundCluster,
  onSaveIar,
  onSaveRis,
  personnelOptions,
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
  reportYear: string;
  setReportYear: (year: string) => void;
  rpciFundCluster: string;
  setRpciFundCluster: (value: string) => void;
  onSaveIar: () => void;
  onSaveRis: () => void;
  personnelOptions: Partial<Record<PersonnelRole, string[]>>;
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
                placeholder="e.g. IAR-2026-07-10-143005123"
                value={iar.iarNo}
                onChange={(e) => setIar({ ...iar, iarNo: e.target.value })}
              />
            </FlowField>
            <FlowField label="Supplier">
              <input
                className="flow-input"
                placeholder="e.g. Davao Citihardware Inc."
                value={iar.supplier}
                onChange={(e) => setIar({ ...iar, supplier: e.target.value })}
              />
            </FlowField>
            <FlowField label="Invoice / DR No.">
              <input
                className="flow-input"
                placeholder="e.g. 250876 / DR-0001"
                value={iar.invoiceNo}
                onChange={(e) => setIar({ ...iar, invoiceNo: e.target.value })}
              />
            </FlowField>
            <FlowField label="Accepted By">
              <PersonnelInput
                className="flow-input"
                placeholder={FORM_DEFAULTS.custodian}
                value={iar.acceptedBy}
                options={personnelOptions.iar_accepted_by}
                onChange={(value) => setIar({ ...iar, acceptedBy: value })}
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
              disabled={!canWrite || saving || ris.verificationStatus === "verified"}
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
                placeholder="e.g. RIS-2026-07-10-143005123"
                value={ris.risNo}
                onChange={(e) => setRis({ ...ris, risNo: e.target.value })}
              />
            </FlowField>
            <FlowField label="Requesting Office">
              <input
                className="flow-input"
                placeholder="e.g. Training and Assessment"
                value={ris.office}
                onChange={(e) => setRis({ ...ris, office: e.target.value })}
              />
            </FlowField>
            <FlowField label="Requested By">
              <PersonnelInput
                className="flow-input"
                placeholder={FORM_DEFAULTS.requestedBy}
                value={ris.requestedBy}
                options={personnelOptions.ris_requested_by}
                onChange={(value) => setRis({ ...ris, requestedBy: value })}
              />
            </FlowField>
            <FlowField label="Purpose">
              <input
                className="flow-input"
                placeholder="e.g. For official supplies and maintenance"
                value={ris.purpose}
                onChange={(e) => setRis({ ...ris, purpose: e.target.value })}
              />
            </FlowField>
            <FlowField label="Approved By">
              <PersonnelInput
                className="flow-input"
                placeholder={FORM_DEFAULTS.approvedBy}
                value={ris.approvedBy}
                options={personnelOptions.ris_approved_by}
                onChange={(value) => setRis({ ...ris, approvedBy: value })}
              />
            </FlowField>
            <FlowField label="Issued By">
              <PersonnelInput
                className="flow-input"
                placeholder={FORM_DEFAULTS.issuedBy}
                value={ris.issuedBy}
                options={personnelOptions.ris_issued_by}
                onChange={(value) => setRis({ ...ris, issuedBy: value })}
              />
            </FlowField>
            <FlowField label="Received By">
              <PersonnelInput
                className="flow-input"
                placeholder={FORM_DEFAULTS.receivedBy}
                value={ris.receivedBy}
                options={personnelOptions.ris_received_by}
                onChange={(value) => setRis({ ...ris, receivedBy: value })}
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
              <Send className="h-4 w-4" />{" "}
              {saving
                ? "Issuing..."
                : ris.verificationStatus === "verified"
                  ? "RIS Verified"
                  : ris.verificationStatus === "issued"
                    ? "Verify RIS"
                    : "Issue RIS"}
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
            <ItemLookup
              items={stockCardItems}
              value={selectedItemId}
              onChange={setSelectedItemId}
              className="flow-input"
              placeholder="Type any word from the item name or description"
            />
          </FlowField>
        </div>
      </section>
    );
  }

  if (tab === "rsmi") return (
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

  return (
    <section className="rounded-lg border border-border bg-card">
      <FormTitle
        title="RPCI Options"
        subtitle="Generate the annual Appendix 66 physical count for supplies."
      />
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <FlowField label="Report Year">
          <input
            className="flow-input"
            type="number"
            min="2000"
            max="2100"
            value={reportYear}
            onChange={(event) => setReportYear(event.target.value)}
          />
        </FlowField>
        <FlowField label="Fund Cluster">
          <input
            className="flow-input"
            value={rpciFundCluster}
            placeholder="e.g. 06-SSP or 01-MOOE"
            onChange={(event) => setRpciFundCluster(event.target.value)}
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
  reportYear,
  setReportYear,
  rpciFundCluster,
  setRpciFundCluster,
  rpciRows,
  rpciEntries,
  setRpciEntries,
  personnelOptions,
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
  reportYear: string;
  setReportYear: (year: string) => void;
  rpciFundCluster: string;
  setRpciFundCluster: (value: string) => void;
  rpciRows: RpciRow[];
  rpciEntries: Record<string, RpciEntry>;
  setRpciEntries: (entries: Record<string, RpciEntry>) => void;
  personnelOptions: Partial<Record<PersonnelRole, string[]>>;
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
              personnelOptions={personnelOptions}
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
              personnelOptions={personnelOptions}
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
          {tab === "rpci" && (
            <RpciPaper
              orientation={orientation}
              reportYear={reportYear}
              onReportYear={setReportYear}
              fundCluster={rpciFundCluster}
              onFundCluster={setRpciFundCluster}
              rows={rpciRows}
              entries={rpciEntries}
              onEntries={setRpciEntries}
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
  personnelOptions,
}: {
  orientation: Orientation;
  items: Item[];
  form: IarState;
  onForm: (form: IarState) => void;
  lines: Line[];
  onLines: (lines: Line[]) => void;
  editable: boolean;
  personnelOptions: Partial<Record<PersonnelRole, string[]>>;
}) {
  const validLines = getPreviewLines(items, lines);
  const displayCount = Math.max(6, lines.length);
  const displayLines = editable
    ? Array.from({ length: displayCount }, (_, index) => lines[index] ?? null)
    : padRows(validLines, 6);

  function updateLineAt(index: number, patch: Partial<Line>) {
    const nextLines = [...lines];
    while (nextLines.length <= index) nextLines.push(blankLine());
    nextLines[index] = { ...nextLines[index], ...patch };
    onLines(nextLines);
  }

  function addLine() {
    onLines([...lines, blankLine()]);
  }

  function removeLine(id: string) {
    onLines(lines.length > 1 ? lines.filter((line) => line.id !== id) : lines);
  }

  return (
    <div className={`flow-paper ${orientation} iar-paper`}>
      <div className="iar-title">Inspection and Acceptance Report</div>
      <table className="paper-grid iar-meta-grid">
        <tbody>
          <tr>
            <td colSpan={2}>
              <strong>Entity Name :</strong>{" "}
              {editable ? (
                <input
                  className="paper-inline-control strong"
                  placeholder={FORM_DEFAULTS.entityName}
                  value={form.entityName}
                  onChange={(event) =>
                    onForm({ ...form, entityName: event.target.value })
                  }
                />
              ) : (
                form.entityName
              )}
            </td>
            <td>
              <strong>Fund Cluster :</strong>{" "}
              {editable ? (
                <input
                  className="paper-inline-control strong"
                  placeholder={FORM_DEFAULTS.fundCluster}
                  value={form.fundCluster}
                  onChange={(event) =>
                    onForm({ ...form, fundCluster: event.target.value })
                  }
                />
              ) : (
                form.fundCluster
              )}
            </td>
          </tr>
          <tr>
            <td>
              <strong>Supplier :</strong>{" "}
              {editable ? (
                <input
                  className="paper-inline-control strong"
                  placeholder="e.g. DAVAO CITIHARDWARE INC."
                  value={form.supplier}
                  onChange={(event) =>
                    onForm({ ...form, supplier: event.target.value })
                  }
                />
              ) : (
                form.supplier
              )}
            </td>
            <td>
              <strong>IAR No. :</strong>{" "}
              {editable ? (
                <input
                  className="paper-inline-control strong"
                  placeholder="e.g. IAR-2026-07-10-143005123"
                  value={form.iarNo}
                  onChange={(event) =>
                    onForm({ ...form, iarNo: event.target.value })
                  }
                />
              ) : (
                form.iarNo
              )}
            </td>
            <td>
              <strong>Date :</strong>{" "}
              {editable ? (
                <input
                  className="paper-inline-control strong"
                  type="date"
                  value={form.iarDate}
                  onChange={(event) =>
                    onForm({ ...form, iarDate: event.target.value })
                  }
                />
              ) : (
                shortDate(form.iarDate)
              )}
            </td>
          </tr>
          <tr>
            <td>
              <strong>PO No. / Date :</strong>{" "}
              {editable ? (
                <input
                  className="paper-inline-control strong"
                  placeholder="e.g. 2025-02-0006 / 02/14/2025"
                  value={form.poNoDate}
                  onChange={(event) =>
                    onForm({ ...form, poNoDate: event.target.value })
                  }
                />
              ) : (
                form.poNoDate
              )}
            </td>
            <td>
              <strong>Invoice No. :</strong>{" "}
              {editable ? (
                <input
                  className="paper-inline-control strong"
                  placeholder="e.g. 250876"
                  value={form.invoiceNo}
                  onChange={(event) =>
                    onForm({ ...form, invoiceNo: event.target.value })
                  }
                />
              ) : (
                form.invoiceNo
              )}
            </td>
            <td>
              <strong>Date :</strong>{" "}
              {editable ? (
                <input
                  className="paper-inline-control strong"
                  type="date"
                  value={form.invoiceDate}
                  onChange={(event) =>
                    onForm({ ...form, invoiceDate: event.target.value })
                  }
                />
              ) : (
                shortDate(form.invoiceDate)
              )}
            </td>
          </tr>
          <tr>
            <td>
              <strong>Requisitioning Office/Dept. :</strong>{" "}
              {editable ? (
                <input
                  className="paper-inline-control strong"
                  placeholder="e.g. Training and Assessment"
                  value={form.requisitioningOffice}
                  onChange={(event) =>
                    onForm({
                      ...form,
                      requisitioningOffice: event.target.value,
                    })
                  }
                />
              ) : (
                form.requisitioningOffice
              )}
            </td>
            <td colSpan={2}>
              <strong>Responsibility Center Code :</strong>{" "}
              {editable ? (
                <input
                  className="paper-inline-control strong"
                  placeholder={FORM_DEFAULTS.responsibilityCenter}
                  value={form.responsibilityCenter}
                  onChange={(event) =>
                    onForm({ ...form, responsibilityCenter: event.target.value })
                  }
                />
              ) : (
                form.responsibilityCenter
              )}
            </td>
          </tr>
        </tbody>
      </table>
      <table className="paper-grid iar-items-grid">
        <thead>
          <tr>
            <th className="stock-no-col">Stock/<br />Property No.</th>
            <th className="item-col">Description</th>
            <th>Unit</th>
            <th className="qty-col">Quantity</th>
            {editable && <th className="action-col print-hidden"></th>}
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
                  {editable ? (
                    <ItemLookup
                      items={items}
                      className="paper-cell-control"
                      value={sourceLine?.item_id || ""}
                      onChange={(itemId) =>
                        updateLineAt(index, { item_id: itemId })
                      }
                    />
                  ) : (
                    itemDescription(previewLine?.item)
                  )}
                </td>
                <td>{previewLine?.item?.unit || ""}</td>
                <td className="right">
                  {editable ? (
                    <input
                      className="paper-cell-control right"
                      type="number"
                      min={1}
                      placeholder="Qty."
                      value={sourceLine?.quantity || ""}
                      onChange={(e) =>
                        updateLineAt(index, { quantity: e.target.value })
                      }
                    />
                  ) : (
                    previewLine?.quantity || ""
                  )}
                </td>
                {editable && (
                  <td className="center print-hidden">
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
      <table className="paper-grid iar-signoff-grid">
        <tbody>
          <tr>
            <th>Inspection</th>
            <th>Acceptance</th>
          </tr>
          <tr>
            <td>
              <strong>Date Inspected :</strong>{" "}
              {editable ? (
                <input
                  className="paper-inline-control strong"
                  type="date"
                  value={form.dateInspected}
                  onChange={(event) =>
                    onForm({ ...form, dateInspected: event.target.value })
                  }
                />
              ) : (
                shortDate(form.dateInspected)
              )}
              <div className="iar-checkbox-line">
                <span className="paper-checkbox" /> Inspected, verified and
                found in order as to quantity and specifications
              </div>
            </td>
            <td>
              <strong>Date Received :</strong>{" "}
              {editable ? (
                <input
                  className="paper-inline-control strong"
                  type="date"
                  value={form.dateReceived}
                  onChange={(event) =>
                    onForm({ ...form, dateReceived: event.target.value })
                  }
                />
              ) : (
                shortDate(form.dateReceived)
              )}
              <div className="iar-checkbox-line">
                <span className="paper-checkbox" /> Complete
              </div>
              <div className="iar-checkbox-line">
                <span className="paper-checkbox" /> Partial (pls. specify
                quantity)
              </div>
            </td>
          </tr>
          <tr>
            <td className="center strong">
              {editable ? (
                <input
                  className="paper-cell-control center strong"
                  placeholder={FORM_DEFAULTS.inspectionOfficer}
                  value={form.inspectionOfficer}
                  onChange={(event) =>
                    onForm({ ...form, inspectionOfficer: event.target.value })
                  }
                />
              ) : (
                form.inspectionOfficer
              )}
              <div className="signature-label normal-case">
                Inspection Officer/Inspection Committee
              </div>
            </td>
            <td className="center strong">
              {editable ? (
                <PersonnelInput
                  className="paper-cell-control center strong"
                  placeholder={FORM_DEFAULTS.custodian}
                  value={form.acceptedBy}
                  options={personnelOptions.iar_accepted_by}
                  onChange={(value) =>
                    onForm({ ...form, acceptedBy: value })
                  }
                />
              ) : (
                form.acceptedBy
              )}
              <div className="signature-label normal-case">
                Supply and/or Property Custodian
              </div>
            </td>
          </tr>
        </tbody>
      </table>
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
    <div className={`flow-paper ${orientation} stock-paper`}>
      <div className="paper-title-dark">Stock Card</div>
      <table className="paper-grid official-meta-grid stock-meta-grid">
        <tbody>
          <tr>
            <td colSpan={2}>
              <strong>Entity Name :</strong>{" "}
              <span className="strong">
                PROVINCIAL TRAINING CENTER - DAVAO DEL NORTE
              </span>
            </td>
            <td>
              <strong>Fund Cluster :</strong>{" "}
              <span className="strong">06-SSP</span>
            </td>
          </tr>
          <tr>
            <td>
              <strong>Item :</strong>{" "}
              {editable ? (
                <ItemLookup
                  items={items}
                  className="paper-inline-control strong"
                  value={selectedItemId}
                  onChange={onSelectedItemId}
                />
              ) : (
                <span className="strong">{item?.name || ""}</span>
              )}
            </td>
            <td>
              <strong>Stock No. :</strong>{" "}
              <span className="strong">{item ? item.id.slice(0, 8) : ""}</span>
            </td>
            <td>
              <strong>Re-order Point :</strong>
            </td>
          </tr>
          <tr>
            <td colSpan={2}>
              <strong>Description :</strong>{" "}
              <span className="strong">{itemDescription(item)}</span>
            </td>
            <td>
              <strong>Unit of Measurement :</strong>{" "}
              <span className="strong">{item?.unit || ""}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <table className="paper-grid stock-card">
        <thead>
          <tr>
            <th rowSpan={2}>Date</th>
            <th rowSpan={2}>Reference</th>
            <th>Receipt</th>
            <th colSpan={2}>Issue</th>
            <th>Balance</th>
            <th rowSpan={2}>No. of Days to Consume</th>
          </tr>
          <tr>
            <th>Qty.</th>
            <th>Quantity</th>
            <th>Office</th>
            <th>Qty.</th>
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
              <td></td>
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
  personnelOptions,
}: {
  orientation: Orientation;
  items: Item[];
  form: RisState;
  onForm: (form: RisState) => void;
  lines: Line[];
  onLines: (lines: Line[]) => void;
  editable: boolean;
  personnelOptions: Partial<Record<PersonnelRole, string[]>>;
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
    <div className={`flow-paper ${orientation} ris-paper official-paper`}>
      <div className="paper-title-dark">Requisition and Issue Slip</div>
      <table className="paper-grid official-meta-grid">
        <tbody>
          <tr>
            <td colSpan={2}>
              <strong>Entity Name :</strong>{" "}
              <span className="strong">
                PROVINCIAL TRAINING CENTER - DAVAO DEL NORTE
              </span>
            </td>
            <td>
              <strong>Fund Cluster :</strong>{" "}
              <span className="strong">06-SSP</span>
            </td>
          </tr>
          <tr>
            <td>
              <strong>Division :</strong>{" "}
              {editable ? (
                <input
                  className="paper-inline-control strong"
                  placeholder="e.g. Training and Assessment"
                  value={form.office}
                  onChange={(event) =>
                    onForm({ ...form, office: event.target.value })
                  }
                />
              ) : (
                <span className="strong">{form.office}</span>
              )}
            </td>
            <td>
              <strong>Responsibility Center Code :</strong>{" "}
              <span className="strong">{FORM_DEFAULTS.risResponsibilityCenter}</span>
            </td>
            <td>
              <strong>RIS No. :</strong>{" "}
              {editable ? (
                <input
                  className="paper-inline-control strong"
                  placeholder="e.g. RIS-2026-07-10-143005123"
                  value={form.risNo}
                  onChange={(event) =>
                    onForm({ ...form, risNo: event.target.value })
                  }
                />
              ) : (
                <span className="strong">{form.risNo}</span>
              )}
            </td>
          </tr>
          <tr>
            <td colSpan={3}>
              <strong>Office :</strong>{" "}
              {editable ? (
                <input
                  className="paper-inline-control strong"
                  placeholder="e.g. Supplies and Materials Management"
                  value={form.office || "Supplies and Materials Management"}
                  onChange={(event) =>
                    onForm({ ...form, office: event.target.value })
                  }
                />
              ) : (
                <span className="strong">
                  {form.office || "Supplies and Materials Management"}
                </span>
              )}
            </td>
          </tr>
        </tbody>
      </table>
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
            {editable && <th className="action-col print-hidden"></th>}
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
                    <ItemLookup
                      items={items}
                      className="paper-cell-control"
                      value={sourceLine.item_id}
                      onChange={(itemId) =>
                        updateLine(sourceLine.id, { item_id: itemId })
                      }
                    />
                  ) : (
                    itemDescription(previewLine?.item)
                  )}
                </td>
                <td className="right">
                  {editable && sourceLine ? (
                    <input
                      className="paper-cell-control right"
                      type="number"
                      min={1}
                      placeholder="Qty."
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
                  <td className="center print-hidden">
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
            placeholder="e.g. For official supplies, maintenance, or project use"
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
                <PersonnelInput
                  className="paper-cell-control center"
                  placeholder={FORM_DEFAULTS.requestedBy}
                  value={form.requestedBy}
                  options={personnelOptions.ris_requested_by}
                  onChange={(value) =>
                    onForm({ ...form, requestedBy: value })
                  }
                />
              ) : (
                form.requestedBy
              )}
            </td>
            <td>
              {editable ? (
                <PersonnelInput
                  className="paper-cell-control center"
                  placeholder={FORM_DEFAULTS.approvedBy}
                  value={form.approvedBy}
                  options={personnelOptions.ris_approved_by}
                  onChange={(value) =>
                    onForm({ ...form, approvedBy: value })
                  }
                />
              ) : (
                form.approvedBy
              )}
            </td>
            <td>
              {editable ? (
                <PersonnelInput
                  className="paper-cell-control center"
                  placeholder={FORM_DEFAULTS.issuedBy}
                  value={form.issuedBy}
                  options={personnelOptions.ris_issued_by}
                  onChange={(value) =>
                    onForm({ ...form, issuedBy: value })
                  }
                />
              ) : (
                form.issuedBy
              )}
            </td>
            <td>
              {editable ? (
                <PersonnelInput
                  className="paper-cell-control center"
                  placeholder={FORM_DEFAULTS.receivedBy}
                  value={form.receivedBy}
                  options={personnelOptions.ris_received_by}
                  onChange={(value) =>
                    onForm({ ...form, receivedBy: value })
                  }
                />
              ) : (
                form.receivedBy
              )}
            </td>
          </tr>
          <tr>
            <td>Designation</td>
            <td>
              {editable ? (
                <input
                  className="paper-cell-control center"
                  placeholder={FORM_DEFAULTS.requestedDesignation}
                  value={form.requestedDesignation}
                  onChange={(e) =>
                    onForm({ ...form, requestedDesignation: e.target.value })
                  }
                />
              ) : (
                form.requestedDesignation
              )}
            </td>
            <td>
              {editable ? (
                <input
                  className="paper-cell-control center"
                  placeholder={FORM_DEFAULTS.approvedDesignation}
                  value={form.approvedDesignation}
                  onChange={(e) =>
                    onForm({ ...form, approvedDesignation: e.target.value })
                  }
                />
              ) : (
                form.approvedDesignation
              )}
            </td>
            <td>
              {editable ? (
                <input
                  className="paper-cell-control center"
                  placeholder={FORM_DEFAULTS.issuedDesignation}
                  value={form.issuedDesignation}
                  onChange={(e) =>
                    onForm({ ...form, issuedDesignation: e.target.value })
                  }
                />
              ) : (
                form.issuedDesignation
              )}
            </td>
            <td>
              {editable ? (
                <input
                  className="paper-cell-control center"
                  placeholder={FORM_DEFAULTS.receivedDesignation}
                  value={form.receivedDesignation}
                  onChange={(e) =>
                    onForm({ ...form, receivedDesignation: e.target.value })
                  }
                />
              ) : (
                form.receivedDesignation
              )}
            </td>
          </tr>
          <tr>
            <td>Date</td>
            <td>
              {editable ? (
                <input
                  className="paper-cell-control center"
                  type="date"
                  value={form.requestedDate}
                  onChange={(e) =>
                    onForm({ ...form, requestedDate: e.target.value })
                  }
                />
              ) : (
                shortDate(form.requestedDate)
              )}
            </td>
            <td>
              {editable ? (
                <input
                  className="paper-cell-control center"
                  type="date"
                  value={form.approvedDate}
                  onChange={(e) =>
                    onForm({ ...form, approvedDate: e.target.value })
                  }
                />
              ) : (
                shortDate(form.approvedDate)
              )}
            </td>
            <td>
              {editable ? (
                <input
                  className="paper-cell-control center"
                  type="date"
                  value={form.issuedDate}
                  onChange={(e) =>
                    onForm({ ...form, issuedDate: e.target.value })
                  }
                />
              ) : (
                shortDate(form.issuedDate)
              )}
            </td>
            <td>
              {editable ? (
                <input
                  className="paper-cell-control center"
                  type="date"
                  value={form.receivedDate}
                  onChange={(e) =>
                    onForm({ ...form, receivedDate: e.target.value })
                  }
                />
              ) : (
                shortDate(form.receivedDate)
              )}
            </td>
          </tr>
        </tbody>
      </table>
      <RisVerificationReceipt form={form} />
    </div>
  );
}

function RisVerificationReceipt({ form }: { form: RisState }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const url = verificationUrl(form.verificationToken);

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(url, {
      width: 180,
      margin: 1,
      errorCorrectionLevel: "M",
    }).then((dataUrl) => {
      if (active) setQrDataUrl(dataUrl);
    });
    return () => {
      active = false;
    };
  }, [url]);

  return (
    <div className="ris-verification-receipt">
      <div className="ris-verification-copy">
        <div className="strong">
          {form.verificationStatus === "verified"
            ? "PUBLIC VERIFICATION ACTIVE"
            : "VERIFICATION ACTIVATES WHEN ISSUED"}
        </div>
        <div>
          Scan this QR code to confirm this RIS through the official Supplify
          verification page. An authorized account is required.
        </div>
        <div className="strong">
          Verification Code: {form.verificationCode}
        </div>
        <div>Document Version: 1</div>
      </div>
      {qrDataUrl && (
        <img
          className="ris-verification-qr"
          src={qrDataUrl}
          alt={`Verification QR for ${form.risNo}`}
        />
      )}
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
    <div className={`flow-paper ${orientation} rsmi-paper official-paper`}>
      <div className="paper-title-dark">
        Report of Supplies and Materials Issued
      </div>
      <table className="paper-grid official-meta-grid">
        <tbody>
          <tr>
            <td colSpan={2}>
              <strong>Entity Name :</strong>{" "}
              <span className="strong">
                PROVINCIAL TRAINING CENTER - DAVAO DEL NORTE
              </span>
            </td>
            <td>
              <strong>Fund Cluster :</strong>{" "}
              <span className="strong">06-SSP</span>
            </td>
          </tr>
          <tr>
            <td>
              <strong>Report Month :</strong>{" "}
              {editable ? (
                <input
                  className="paper-inline-control strong"
                  type="month"
                  value={reportMonth}
                  onChange={(event) => onReportMonth(event.target.value)}
                />
              ) : (
                <span className="strong">{reportMonth}</span>
              )}
            </td>
            <td colSpan={2}>
              <strong>Prepared By :</strong>{" "}
              <span className="strong">Supply and Property Division Unit</span>
            </td>
          </tr>
        </tbody>
      </table>
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
        values={[
          `${FORM_DEFAULTS.custodian}\nTESD Specialist II`,
          `${FORM_DEFAULTS.accountingStaff}\n${FORM_DEFAULTS.accountingDesignation}`,
        ]}
      />
    </div>
  );
}

function RpciPaper({
  orientation,
  reportYear,
  onReportYear,
  fundCluster,
  onFundCluster,
  rows,
  entries,
  onEntries,
  editable,
}: {
  orientation: Orientation;
  reportYear: string;
  onReportYear: (year: string) => void;
  fundCluster: string;
  onFundCluster: (value: string) => void;
  rows: RpciRow[];
  entries: Record<string, RpciEntry>;
  onEntries: (entries: Record<string, RpciEntry>) => void;
  editable: boolean;
}) {
  function updateEntry(id: string, patch: Partial<RpciEntry>) {
    onEntries({
      ...entries,
      [id]: {
        onHand: entries[id]?.onHand ?? "",
        remarks: entries[id]?.remarks ?? "",
        ...patch,
      },
    });
  }

  return (
    <div className={`flow-paper ${orientation} rpci-paper official-paper`}>
      <div className="center strong text-[15px]">REPORT ON THE PHYSICAL COUNT OF INVENTORIES</div>
      <div className="center strong mt-1">Common-use Supplies and Equipment</div>
      <div className="center text-[9px]">(Type of Inventory Item)</div>
      <div className="center strong mt-1">
        As at December 31,{" "}
        {editable ? (
          <input className="paper-inline-control strong center" type="number" value={reportYear} onChange={(event) => onReportYear(event.target.value)} />
        ) : reportYear}
      </div>
      <div className="mt-3 text-[10px]">
        Fund Cluster:{" "}
        {editable ? (
          <input className="paper-inline-control strong" value={fundCluster} onChange={(event) => onFundCluster(event.target.value)} />
        ) : <span className="strong">{fundCluster}</span>}
      </div>
      <div className="mt-2 text-[9px]">
        For which <span className="strong">{FORM_DEFAULTS.custodian}</span>, Provincial Training Center - Davao del Norte, is accountable.
      </div>

      <table className="paper-grid rpci-grid mt-3">
        <thead>
          <tr>
            <th rowSpan={2}>Article</th>
            <th rowSpan={2}>Description</th>
            <th rowSpan={2}>Stock Number</th>
            <th rowSpan={2}>Unit of Measure</th>
            <th rowSpan={2}>Unit Value</th>
            <th rowSpan={2}>Balance Per Card<br />(Quantity)</th>
            <th rowSpan={2}>On Hand Per Count<br />(Quantity)</th>
            <th colSpan={2}>Shortage / Overage</th>
            <th rowSpan={2}>Remarks</th>
          </tr>
          <tr><th>Quantity</th><th>Value</th></tr>
        </thead>
        <tbody>
          {padRows(rows, 18).map((row, index) => (
            <tr key={row?.id || index}>
              <td>{row?.article || ""}</td>
              <td>{row?.description || ""}</td>
              <td className="center">{row?.stockNo || ""}</td>
              <td className="center">{row?.unit || ""}</td>
              <td className="right">{row ? peso(row.unitValue) : ""}</td>
              <td className="right">{row?.cardBalance ?? ""}</td>
              <td className="right">
                {row && editable ? (
                  <input
                    className="paper-cell-control right"
                    type="number"
                    min="0"
                    value={entries[row.id]?.onHand ?? String(row.cardBalance)}
                    onChange={(event) => updateEntry(row.id, { onHand: event.target.value })}
                  />
                ) : row?.onHand ?? ""}
              </td>
              <td className="right">{row && row.varianceQuantity !== 0 ? row.varianceQuantity : ""}</td>
              <td className="right">{row && row.varianceValue !== 0 ? peso(row.varianceValue) : ""}</td>
              <td>
                {row && editable ? (
                  <input className="paper-cell-control" value={entries[row.id]?.remarks ?? ""} onChange={(event) => updateEntry(row.id, { remarks: event.target.value })} />
                ) : row?.remarks || ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rpci-signatures">
        <RpcSignatory label="Certified Correct by:" name={FORM_DEFAULTS.custodian} detail="Inventory Committee Chair and Members" />
        <RpcSignatory label="Approved by:" name={FORM_DEFAULTS.approvedBy} detail="Head of Agency/Authorized Representative" />
        <RpcSignatory label="Verified by:" name="" detail="COA Representative" />
      </div>
    </div>
  );
}

function RpcSignatory({ label, name, detail }: { label: string; name: string; detail: string }) {
  return (
    <div>
      <div className="text-left text-[9px]">{label}</div>
      <div className="mt-8 border-b border-black pb-1 center strong">{name}</div>
      <div className="mt-1 center text-[8px]">{detail}</div>
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
                  <ItemLookup
                    items={items}
                    className="flow-input"
                    value={line.item_id}
                    onChange={(itemId) =>
                      updateLine(line.id, { item_id: itemId })
                    }
                    placeholder="Type item name or description"
                  />
                </td>
                <td className="text-right tabular-nums">
                  {item ? `${item.quantity} ${item.unit}` : "-"}
                </td>
                <td>
                  <input
                    className="flow-input text-right"
                    type="number"
                    min={1}
                    placeholder="Qty."
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
                      placeholder="0.00"
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
                    placeholder="Optional remarks"
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
    .filter((tx) => tx.type === "IN" && isIarTransaction(tx))
    .slice(-8)
    .reverse();
  const risRows = transactions
    .filter((tx) => tx.type === "OUT" && isRisTransaction(tx))
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
          placeholder={`Enter ${label.toLowerCase()}`}
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

function ItemLookup({
  items,
  value,
  onChange,
  className,
  placeholder = "Type item name or description",
}: {
  items: Item[];
  value: string;
  onChange: (itemId: string) => void;
  className: string;
  placeholder?: string;
}) {
  const listId = useRef(`item-lookup-${createId()}`).current;
  const selected = items.find((item) => item.id === value);
  const [text, setText] = useState(() => itemLabel(selected));

  useEffect(() => {
    setText(itemLabel(items.find((item) => item.id === value)));
  }, [items, value]);

  function handleText(next: string) {
    setText(next);
    const normalized = next.trim().toLocaleLowerCase();
    const exact = items.find(
      (item) =>
        itemLabel(item).toLocaleLowerCase() === normalized ||
        item.name.toLocaleLowerCase() === normalized,
    );
    if (exact) onChange(exact.id);
    else if (!normalized) onChange("");
  }

  const words = text
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const matches = items.filter((item) => {
    const searchable = `${item.name} ${item.description || ""}`.toLocaleLowerCase();
    return words.length === 0 || words.every((word) => searchable.includes(word));
  });

  return (
    <>
      <input
        className={className}
        list={listId}
        value={text}
        placeholder={placeholder}
        onChange={(event) => handleText(event.target.value)}
        autoComplete="off"
      />
      <datalist id={listId}>
        {matches.map((item) => (
          <option key={item.id} value={itemLabel(item)} />
        ))}
      </datalist>
    </>
  );
}

function PersonnelInput({
  value,
  onChange,
  options = [],
  className,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options?: string[];
  className: string;
  placeholder: string;
}) {
  const listId = useRef(`personnel-${createId()}`).current;
  return (
    <>
      <input
        className={className}
        list={listId}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      />
      <datalist id={listId}>
        {options.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </>
  );
}

function normalizePrintControls(root: HTMLElement) {
  root.querySelectorAll("select").forEach((select) => {
    const selectedText = select.value
      ? select.options[select.selectedIndex]?.textContent?.trim() || ""
      : "";
    replaceControlWithText(select, selectedText);
  });

  root.querySelectorAll("input").forEach((input) => {
    const value =
      input.type === "date" && input.value ? shortDate(input.value) : input.value;
    replaceControlWithText(input, value || "");
  });
}

function replaceControlWithText(control: HTMLElement, value: string) {
  const span = document.createElement("span");
  span.className = `${control.className} paper-print-value`;
  span.textContent = value;
  control.replaceWith(span);
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

function makeFormNumber(prefix: "IAR" | "RIS", date: string) {
  if (prefix === "RIS") return `${date}-0000001`;
  const now = new Date();
  const timePart = [
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  ]
    .map((part, index) => String(part).padStart(index === 3 ? 3 : 2, "0"))
    .join("");
  return `${prefix}-${date}-${timePart}`;
}

async function reserveNextRisNumber(date: string) {
  try {
    return await reserveNextFormNumber({
      data: { prefix: "RIS", date },
    });
  } catch (error) {
    console.error("Unable to reserve RIS number:", errorMessage(error));
    return "";
  }
}

async function rememberPersonnel(role: PersonnelRole, personName: string) {
  const person_name = personName.trim();
  if (!person_name) return;
  try {
    await rememberFormPersonnel({ data: { role, person_name } });
  } catch (error) {
    console.error("Unable to remember form personnel:", errorMessage(error));
  }
}

function createVerificationIdentity() {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined") crypto.getRandomValues(bytes);
  else
    for (let index = 0; index < bytes.length; index += 1)
      bytes[index] = Math.floor(Math.random() * 256);
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const code = token.slice(0, 8).toUpperCase().match(/.{1,4}/g)?.join("-") || "";
  return { token, code };
}

function verificationUrl(token: string) {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";
  return `${origin}/verify/ris/${encodeURIComponent(token)}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Database operation failed.";
}

function dateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 7);
}

function groupPersonnelMemory(rows: PersonnelMemory[]) {
  const grouped: Partial<Record<PersonnelRole, string[]>> = {};
  for (const row of rows) {
    const names = grouped[row.role] || [];
    if (!names.includes(row.person_name)) names.push(row.person_name);
    grouped[row.role] = names;
  }
  return grouped;
}

function itemDescription(item?: Item | null) {
  return item?.description?.trim() || item?.name || "";
}

function itemLabel(item?: Item | null) {
  if (!item) return "";
  return item.description?.trim()
    ? `${item.name} — ${item.description.trim()}`
    : item.name;
}

function isUniqueViolation(error: { code?: string; message?: string }) {
  return (
    error.code === "23505" ||
    error.message?.toLowerCase().includes("duplicate key value")
  );
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function shortDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "M/d/yyyy");
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
  const itemTransactions = transactions.filter(
    (tx) =>
      tx.item_id === item.id && (isIarTransaction(tx) || isRisTransaction(tx)),
  );
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
  const transactionItemIds = new Set(
    transactions
      .filter((tx) => isIarTransaction(tx) || isRisTransaction(tx))
      .map((tx) => tx.item_id),
  );
  const transactionItems = items.filter((item) => transactionItemIds.has(item.id));
  return transactionItems.length > 0 ? transactionItems : items;
}

function isIarTransaction(transaction: Transaction) {
  const source = transaction.source_form_type;
  return source === "IAR" || extractReference(transaction.remarks).startsWith("IAR ");
}

function isRisTransaction(transaction: Transaction) {
  const source = transaction.source_form_type;
  return source === "RIS" || extractReference(transaction.remarks).startsWith("RIS ");
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
    iarReceipts: transactions.filter(
      (tx) => tx.type === "IN" && isIarTransaction(tx),
    ).length,
    risIssues: transactions.filter(
      (tx) => tx.type === "OUT" && isRisTransaction(tx),
    ).length,
    issuedThisMonth: transactions
      .filter(
        (tx) =>
          tx.type === "OUT" &&
          isRisTransaction(tx) &&
          dateKey(tx.created_at) === reportMonth,
      )
      .reduce((sum, tx) => sum + tx.quantity, 0),
  };
}

function activeStageLabel(tab: FlowTab) {
  if (tab === "iar") return "IAR";
  if (tab === "stock-card") return "Stock Card";
  if (tab === "ris") return "RIS";
  if (tab === "rpci") return "RPCI";
  return "RSMI";
}

function itemMatchesPropertyFlow(item: Item, flow: PropertyFlow) {
  if (flow === "semi-expendable") {
    return item.inventory_classification === "semi_expendable_property";
  }
  if (flow === "ppe") {
    return item.inventory_classification === "ppe";
  }
  return (
    !item.inventory_classification ||
    item.inventory_classification === "expendable_supply"
  );
}

function getRsmiRows(
  transactions: Transaction[],
  reportMonth: string,
): RsmiRow[] {
  return transactions
    .filter(
      (tx) =>
        tx.type === "OUT" &&
        isRisTransaction(tx) &&
        dateKey(tx.created_at) === reportMonth,
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

function getRpciRows(
  items: Item[],
  transactions: Transaction[],
  reportYear: string,
  entries: Record<string, RpciEntry>,
): RpciRow[] {
  const year = Number(reportYear);
  const yearEnd = new Date(`${year || new Date().getFullYear()}-12-31T23:59:59.999`);
  return items
    .filter(
      (item) =>
        item.item_type === "supply" ||
        item.inventory_classification === "expendable_supply",
    )
    .map((item) => {
      const movementsAfterYear = transactions
        .filter(
          (transaction) =>
            transaction.item_id === item.id &&
            new Date(transaction.created_at).getTime() > yearEnd.getTime(),
        )
        .reduce(
          (sum, transaction) =>
            sum +
            (transaction.type === "IN"
              ? Number(transaction.quantity)
              : -Number(transaction.quantity)),
          0,
        );
      const cardBalance = Number(item.quantity) - movementsAfterYear;
      const entry = entries[item.id];
      const onHand =
        entry?.onHand === undefined || entry.onHand === ""
          ? cardBalance
          : Number(entry.onHand);
      const varianceQuantity = onHand - cardBalance;
      const receiptCost = [...transactions]
        .reverse()
        .find(
          (transaction) =>
            transaction.item_id === item.id &&
            transaction.type === "IN" &&
            new Date(transaction.created_at).getTime() <= yearEnd.getTime() &&
            extractUnitCost(transaction.remarks) > 0,
        );
      const unitValue =
        (receiptCost ? extractUnitCost(receiptCost.remarks) : 0) ||
        Number(item.acquisition_cost || 0);
      return {
        id: item.id,
        article: item.name,
        description: item.description || "",
        stockNo: item.id.slice(0, 8).toUpperCase(),
        unit: item.unit.toUpperCase(),
        unitValue,
        cardBalance,
        onHand,
        varianceQuantity,
        varianceValue: varianceQuantity * unitValue,
        remarks: entry?.remarks || "",
      };
    })
    .filter((row) => row.cardBalance !== 0 || row.onHand !== 0)
    .sort((a, b) => a.article.localeCompare(b.article));
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
    try {
      const ics = await createIcsForm({ data: {
        ics_no: `ICS-${risNo}`,
        ris_id: risId,
        custodian_name: custodian,
        office,
        created_by: userId,
        created_by_name: userName,
      } });
      for (const line of semiExpendable) {
        await createIcsItem({ data: {
          ics_id: ics.id,
          item_id: line.item_id,
          quantity: Number(line.quantity),
          unit_cost: Number(line.item?.acquisition_cost || 0),
          remarks: line.remarks || null,
        } });
      }
    } catch (error) {
      return errorMessage(error);
    }
  }

  if (ppe.length > 0) {
    try {
      const par = await createParForm({ data: {
        par_no: `PAR-${risNo}`,
        ris_id: risId,
        accountable_person: custodian,
        office,
        created_by: userId,
        created_by_name: userName,
      } });
      for (const line of ppe) {
        await createParItem({ data: {
          par_id: par.id,
          item_id: line.item_id,
          quantity: Number(line.quantity),
          unit_cost: Number(line.item?.acquisition_cost || 0),
          remarks: line.remarks || null,
        } });
      }
    } catch (error) {
      return errorMessage(error);
    }
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
.forms-print-root{display:none}
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
.official-paper,.stock-paper{border:0;padding:14px 18px;font-family:"Times New Roman",Times,serif;font-size:12px}
.official-paper .paper-title-dark,.stock-paper .paper-title-dark{background:#fff;color:#111;letter-spacing:0;padding:0;margin:0 0 18px;font-size:18px;font-family:"Times New Roman",Times,serif}
.stock-paper .paper-title-dark{font-size:16px}
.official-paper .paper-meta,.stock-paper .paper-meta{border-color:#111}
.official-paper .paper-meta-cell,.stock-paper .paper-meta-cell{min-height:28px;padding:5px;border-color:#111}
.official-paper .paper-grid th,.stock-paper .paper-grid th{background:#fff;color:#111;font-size:11px;text-transform:none;font-style:italic}
.official-paper .paper-grid td,.stock-paper .paper-grid td{height:27px}
.official-meta-grid{border-top:0;margin-bottom:0}
.official-meta-grid td{height:26px;padding:4px}
.official-meta-grid tr:first-child td{border-top:0;border-left:0;border-right:0}
.official-meta-grid tr:first-child td:first-child{border-right:0}
.official-meta-grid .paper-inline-control{font-weight:800;text-decoration:underline;text-underline-offset:2px}
.stock-paper .paper-meta.two{grid-template-columns:1.5fr 1fr}
.stock-meta-grid td:first-child{width:50%}
.stock-paper .stock-card th{font-size:11px}
.stock-paper .stock-card th:first-child,.stock-paper .stock-card td:first-child{width:76px}
.stock-paper .stock-card th:nth-child(2),.stock-paper .stock-card td:nth-child(2){width:110px}
.stock-paper .stock-card th:last-child,.stock-paper .stock-card td:last-child{width:116px}
.ris-paper .paper-title-dark{margin-bottom:14px}
.ris-paper .ris-grid th{font-size:10px}
.ris-paper .signature-table td{height:31px}
.rsmi-paper .paper-title-dark{font-size:16px}
.rsmi-paper .rsmi-recap{margin-top:0}
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
.paper-print-value{display:inline-block;min-height:1em;white-space:pre-wrap}
.paper-cell-control{height:22px;padding:1px 2px}
.paper-meta-control{padding:0 2px;font-weight:400}
.paper-inline-control{display:inline-block;width:calc(100% - 60px);padding:0 2px}
.paper-inline-control.strong,.paper-cell-control.strong{font-weight:800;text-decoration:underline;text-underline-offset:2px}
.paper-cell-control:focus,.paper-meta-control:focus,.paper-inline-control:focus{box-shadow:inset 0 -1px 0 #0f2348;background:#f8fafc}
.iar-paper{border:0;padding:14px 18px;font-family:"Times New Roman",Times,serif;font-size:12px}
.iar-title{text-align:center;text-transform:uppercase;font-weight:800;font-size:18px;margin:0 0 22px}
.iar-meta-grid{border-top:0;margin-bottom:0}
.iar-meta-grid td{height:26px;padding:4px}
.iar-meta-grid tr:first-child td{border-top:0;border-left:0;border-right:0}
.iar-meta-grid tr:first-child td:first-child{border-right:0}
.iar-items-grid th{font-style:italic;font-size:12px;text-transform:none;background:#fff}
.iar-items-grid td{height:34px}
.iar-items-grid .stock-no-col{width:78px}
.iar-items-grid .qty-col{width:110px}
.iar-items-grid .item-col{min-width:330px}
.iar-signoff-grid{margin-top:0}
.iar-signoff-grid th{height:34px;background:#fff;font-style:italic;font-size:14px}
.iar-signoff-grid td{height:86px;vertical-align:top;padding:8px}
.iar-signoff-grid tr:last-child td{height:64px;vertical-align:bottom}
.iar-checkbox-line{display:flex;align-items:flex-start;gap:6px;margin-top:22px;line-height:1.25}
.paper-checkbox{display:inline-block;width:18px;height:18px;border:1px solid #111;background:#fff;flex:0 0 auto}
.strong{font-weight:800}
.right{text-align:right}
.center{text-align:center}
.paper-purpose{min-height:45px;border:1px solid #111;border-top:0;padding:7px}
.signature-block{display:grid;gap:20px;margin-top:54px}
.signature-line{border-bottom:1px solid #111;min-height:24px;text-align:center;white-space:pre-line}
.signature-label{text-align:center;text-transform:uppercase;font-size:9px;font-weight:800;margin-top:4px}
.signature-label.normal-case{text-transform:none}
.signature-table{width:100%;border-collapse:collapse;font-size:10px}
.signature-table td{border:1px solid #111;padding:5px;text-align:center;height:30px}
.signature-table td:first-child{width:110px;text-align:left;font-weight:800}
.ris-verification-receipt{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:12px;border:1.5px solid #111;padding:9px 12px;font-size:9px;line-height:1.45}
.ris-verification-copy{display:grid;gap:3px}
.ris-verification-qr{width:74px;height:74px;object-fit:contain;image-rendering:crisp-edges}
.rpci-paper{font-size:9px}
.rpci-grid{table-layout:fixed}
.rpci-grid th,.rpci-grid td{padding:3px;font-size:7.5px;line-height:1.2}
.rpci-grid th:nth-child(1){width:14%}
.rpci-grid th:nth-child(2){width:15%}
.rpci-grid th:nth-child(3){width:9%}
.rpci-grid th:nth-child(4){width:8%}
.rpci-grid th:nth-child(5){width:9%}
.rpci-grid th:nth-child(6),.rpci-grid th:nth-child(7){width:8%}
.rpci-grid th:nth-child(10){width:10%}
.rpci-signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:16px}
@media (max-width: 760px){
  .flow-preview-bg{padding:8px}
  .flow-paper{padding:10px}
  .paper-header{grid-template-columns:70px minmax(0,1fr)}
  .form-no-box{grid-column:1 / -1;border-top:1px solid #111}
  .paper-meta.two,.paper-meta.three{grid-template-columns:1fr}
  .paper-meta-cell:not(:last-child){border-right:0}
}
@media print{
  @page{size:auto;margin:12mm}
  html,body{width:100%!important;height:auto!important;margin:0!important;background:#fff!important;overflow:visible!important}
  body.printing-form > :not(.forms-print-root){display:none!important}
  body.printing-form .forms-print-root{display:block!important;width:100%!important;margin:0!important;padding:0!important;background:#fff!important}
  body.printing-form .forms-print-root .flow-paper{display:block!important;width:100%!important;max-width:none!important;min-height:auto!important;aspect-ratio:auto!important;margin:0!important;box-shadow:none!important}
  .flow-secondary,.flow-icon,.print-hidden,.action-col{display:none!important}
  .paper-cell-control,.paper-meta-control,.paper-inline-control{appearance:none!important}
}
`;
