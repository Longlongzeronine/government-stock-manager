import { r as reactExports, W as jsxRuntimeExports } from "./server-DkTiwXTO.js";
import { u as useQuery } from "./useQuery-CPGv4dSv.js";
import { u as useAuth, b as useQueryClient, t as toast, s as supabase } from "./router-CfAHfNkT.js";
import { c as createLucideIcon, P as PageHeader, X, S as Send } from "./AppShell-a1FTjCXc.js";
import { P as Printer, S as Save, F as FileText, L as LayoutPanelLeft, Z as ZoomOut, a as ZoomIn } from "./zoom-out-C2yTVP5y.js";
import { T as Trash2 } from "./trash-2-Cb4F0EVf.js";
import { P as Plus } from "./plus-RZNd2DyP.js";
import { f as format } from "./format-PJEwTTZm.js";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-onWpx3op.js";
import "./use-mobile-BiTvKiC1.js";
const __iconNode$2 = [
  [
    "path",
    {
      d: "M10.5 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v6",
      key: "g5mvt7"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
  ["path", { d: "m14 20 2 2 4-4", key: "15kota" }]
];
const FileCheckCorner = createLucideIcon("file-check-corner", __iconNode$2);
const __iconNode$1 = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "1oefj6"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
  ["path", { d: "M8 13h2", key: "yr2amv" }],
  ["path", { d: "M14 13h2", key: "un5t4a" }],
  ["path", { d: "M8 17h2", key: "2yhykz" }],
  ["path", { d: "M14 17h2", key: "10kma7" }]
];
const FileSpreadsheet = createLucideIcon("file-spreadsheet", __iconNode$1);
const __iconNode = [
  ["path", { d: "m16 16 2 2 4-4", key: "gfu2re" }],
  [
    "path",
    {
      d: "M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14",
      key: "e7tb2h"
    }
  ],
  ["path", { d: "m7.5 4.27 9 5.15", key: "1c824w" }],
  ["polyline", { points: "3.29 7 12 12 20.71 7", key: "ousv84" }],
  ["line", { x1: "12", x2: "12", y1: "22", y2: "12", key: "a4e8g8" }]
];
const PackageCheck = createLucideIcon("package-check", __iconNode);
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
  accountingDesignation: "Administrative Officer IV"
};
function FormsFlow() {
  const {
    canWrite,
    user
  } = useAuth();
  const queryClient = useQueryClient();
  const userName = user?.user_metadata?.full_name || user?.email || "";
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const [tab, setTab] = reactExports.useState("iar");
  const [viewMode, setViewMode] = reactExports.useState("split");
  const [orientation, setOrientation] = reactExports.useState("portrait");
  const [zoom, setZoom] = reactExports.useState(1);
  const [selectedItemId, setSelectedItemId] = reactExports.useState("");
  const [reportMonth, setReportMonth] = reactExports.useState(today.slice(0, 7));
  const [iar, setIar] = reactExports.useState({
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
    acceptedBy: FORM_DEFAULTS.custodian
  });
  const [iarLines, setIarLines] = reactExports.useState(Array.from({
    length: 4
  }, blankLine));
  const [ris, setRis] = reactExports.useState({
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
    receivedDate: today
  });
  const [risLines, setRisLines] = reactExports.useState([blankLine()]);
  const [saving, setSaving] = reactExports.useState(false);
  const {
    data: items = []
  } = useQuery({
    queryKey: ["items"],
    queryFn: async () => (await supabase.from("items").select("id,name,quantity,unit,acquisition_cost,inventory_classification,semi_expendable_tier").order("name")).data ?? []
  });
  const {
    data: transactions = []
  } = useQuery({
    queryKey: ["transactions", "forms-flow"],
    queryFn: async () => (await supabase.from("transactions").select("*, item:items(id,name,quantity,unit,acquisition_cost,inventory_classification,semi_expendable_tier)").order("created_at", {
      ascending: true
    })).data ?? []
  });
  const acceptedStockItems = reactExports.useMemo(() => getAcceptedStockItems(items, transactions), [items, transactions]);
  const stockCardItems = reactExports.useMemo(() => getStockCardItems(items, transactions), [items, transactions]);
  const selectedItem = stockCardItems.find((item) => item.id === (selectedItemId || stockCardItems[0]?.id));
  const stockRows = reactExports.useMemo(() => getStockRows(selectedItem, transactions), [selectedItem, transactions]);
  const rsmiRows = reactExports.useMemo(() => getRsmiRows(transactions, reportMonth), [transactions, reportMonth]);
  const flowStats = reactExports.useMemo(() => getFlowStats(transactions, reportMonth, tab), [transactions, reportMonth, tab]);
  function refreshFlow() {
    queryClient.invalidateQueries({
      queryKey: ["items"]
    });
    queryClient.invalidateQueries({
      queryKey: ["transactions"]
    });
    queryClient.invalidateQueries({
      queryKey: ["transactions", "forms-flow"]
    });
  }
  async function saveIar() {
    const validLines = iarLines.filter((line) => line.item_id && Number(line.quantity) > 0);
    if (!iar.iarNo.trim()) return toast.error("IAR number is required.");
    if (validLines.length === 0) return toast.error("Add at least one accepted item.");
    setSaving(true);
    const {
      data: iarRecord,
      error: iarError
    } = await supabase.from("iar_forms").insert({
      iar_no: iar.iarNo,
      supplier: iar.supplier || null,
      invoice_no: iar.invoiceNo || null,
      accepted_by: iar.acceptedBy || null,
      created_by: user?.id,
      created_by_name: userName
    }).select("id").single();
    if (iarError) {
      if (isUniqueViolation(iarError)) {
        const nextIarNo = makeFormNumber("IAR", today);
        setIar({
          ...iar,
          iarNo: nextIarNo
        });
        setSaving(false);
        return toast.error(`IAR No. ${iar.iarNo} already exists. I prepared ${nextIarNo}; try posting again.`);
      }
      setSaving(false);
      return toast.error(iarError.message);
    }
    for (const line of validLines) {
      const {
        data: tx,
        error: txError
      } = await supabase.from("transactions").insert({
        item_id: line.item_id,
        type: "IN",
        quantity: Number(line.quantity),
        staff_id: user?.id,
        staff_name: userName,
        source_form_type: "IAR",
        source_form_id: iarRecord.id,
        remarks: [`IAR ${iar.iarNo}`, iar.supplier ? `Supplier: ${iar.supplier}` : "", iar.invoiceNo ? `Invoice: ${iar.invoiceNo}` : "", line.unitCost ? `Unit Cost: ${peso(Number(line.unitCost))}` : "", line.remarks].filter(Boolean).join(" | ")
      }).select("id").single();
      if (txError) {
        setSaving(false);
        return toast.error(txError.message);
      }
      const {
        error: lineError
      } = await supabase.from("iar_items").insert({
        iar_id: iarRecord.id,
        item_id: line.item_id,
        quantity: Number(line.quantity),
        unit_cost: Number(line.unitCost || 0),
        remarks: line.remarks || null,
        transaction_id: tx.id
      });
      if (lineError) {
        setSaving(false);
        return toast.error(lineError.message);
      }
    }
    setSaving(false);
    toast.success("IAR posted. Stock card receipts were added.");
    refreshFlow();
    setSelectedItemId(validLines[0]?.item_id || "");
    setIar({
      ...iar,
      iarNo: makeFormNumber("IAR", today),
      supplier: "",
      poNoDate: "",
      invoiceNo: ""
    });
    setIarLines(Array.from({
      length: 4
    }, blankLine));
    setTab("stock-card");
  }
  async function saveRis() {
    const validLines = risLines.filter((line) => line.item_id && Number(line.quantity) > 0);
    if (!ris.risNo.trim()) return toast.error("RIS number is required.");
    if (!ris.office.trim()) return toast.error("Requesting office is required.");
    if (validLines.length === 0) return toast.error("Add at least one item to issue.");
    for (const line of validLines) {
      const item = acceptedStockItems.find((candidate) => candidate.id === line.item_id);
      if (!item) {
        return toast.error("RIS can only issue items that were accepted through IAR and still have stock.");
      }
      if (item && Number(line.quantity) > item.quantity) {
        return toast.error(`${item.name} has only ${item.quantity} ${item.unit} available.`);
      }
    }
    setSaving(true);
    const {
      data: risRecord,
      error: risError
    } = await supabase.from("ris_forms").insert({
      ris_no: ris.risNo,
      office: ris.office,
      purpose: ris.purpose || null,
      requested_by: ris.requestedBy || null,
      approved_by: ris.approvedBy || null,
      issued_by: ris.issuedBy || null,
      received_by: ris.receivedBy || null,
      created_by: user?.id,
      created_by_name: userName
    }).select("id").single();
    if (risError) {
      if (isUniqueViolation(risError)) {
        const nextRisNo = makeFormNumber("RIS", today);
        setRis({
          ...ris,
          risNo: nextRisNo
        });
        setSaving(false);
        return toast.error(`RIS No. ${ris.risNo} already exists. I prepared ${nextRisNo}; try saving again.`);
      }
      setSaving(false);
      return toast.error(risError.message);
    }
    const issuedLines = [];
    for (const line of validLines) {
      const item = acceptedStockItems.find((candidate) => candidate.id === line.item_id) ?? items.find((candidate) => candidate.id === line.item_id);
      const {
        data: tx,
        error: txError
      } = await supabase.from("transactions").insert({
        item_id: line.item_id,
        type: "OUT",
        quantity: Number(line.quantity),
        staff_id: user?.id,
        staff_name: userName,
        source_form_type: "RIS",
        source_form_id: risRecord.id,
        remarks: [`RIS ${ris.risNo}`, `Office: ${ris.office}`, "Responsibility Center: 16 009 03 0001 07", ris.purpose ? `Purpose: ${ris.purpose}` : "", line.remarks].filter(Boolean).join(" | ")
      }).select("id").single();
      if (txError) {
        setSaving(false);
        return toast.error(txError.message);
      }
      const {
        error: lineError
      } = await supabase.from("ris_items").insert({
        ris_id: risRecord.id,
        item_id: line.item_id,
        quantity: Number(line.quantity),
        remarks: line.remarks || null,
        transaction_id: tx.id
      });
      if (lineError) {
        setSaving(false);
        return toast.error(lineError.message);
      }
      issuedLines.push({
        ...line,
        item
      });
    }
    const accountabilityError = await createAccountabilityDocuments({
      risId: risRecord.id,
      risNo: ris.risNo,
      office: ris.office,
      custodian: ris.receivedBy || ris.requestedBy || userName,
      userId: user?.id,
      userName,
      lines: issuedLines
    });
    if (accountabilityError) {
      setSaving(false);
      return toast.error(accountabilityError);
    }
    setSaving(false);
    toast.success("RIS issued. Stock balances were deducted.");
    refreshFlow();
    setRis({
      ...ris,
      risNo: makeFormNumber("RIS", today),
      purpose: ""
    });
    setRisLines([blankLine()]);
    setTab("rsmi");
  }
  function resetActiveForm() {
    if (!window.confirm(`Clear the current ${activeStageLabel(tab)} input?`)) return;
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
        acceptedBy: FORM_DEFAULTS.custodian
      });
      setIarLines(Array.from({
        length: 4
      }, blankLine));
    } else if (tab === "ris") {
      setRis({
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
        receivedDate: today
      });
      setRisLines([blankLine()]);
    }
  }
  function saveActiveStage() {
    if (tab === "iar") return saveIar();
    if (tab === "ris") return saveRis();
    toast.info(`${activeStageLabel(tab)} is generated from saved transactions.`);
  }
  function printActiveForm() {
    const paper = document.querySelector(".flow-paper");
    if (!paper) return toast.error("No form preview available to print.");
    document.querySelector(".forms-print-root")?.remove();
    const printRoot = document.createElement("div");
    printRoot.className = "forms-print-root";
    const printPaper = paper.cloneNode(true);
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
    window.setTimeout(cleanupPrint, 1e3);
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Forms Flow", subtitle: "Preview and encode IAR, Stock Card, RIS, and RSMI", actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: printActiveForm, className: "flow-header-btn", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "h-4 w-4" }),
        " Print Form"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: resetActiveForm, disabled: tab === "stock-card" || tab === "rsmi", className: "flow-header-btn", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }),
        " Cancel"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: saveActiveStage, disabled: !canWrite || saving || tab === "stock-card" || tab === "rsmi", className: "flow-header-primary", children: [
        tab === "ris" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-4 w-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "h-4 w-4" }),
        saving ? "Saving..." : tab === "ris" ? "Issue RIS" : tab === "iar" ? "Post IAR" : "Generated"
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 p-4 sm:p-6 lg:p-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(WorkflowStepper, { active: tab, onChange: setTab }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex flex-col gap-3 lg:flex-row lg:items-center ${viewMode === "split" ? "lg:justify-between" : "lg:justify-start"}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 overflow-hidden rounded-md border border-border bg-card p-1 sm:inline-flex", children: [{
          value: "preview",
          label: "Form Preview",
          icon: FileText
        }, {
          value: "split",
          label: "Split View",
          icon: LayoutPanelLeft
        }].map((option) => {
          const Icon = option.icon;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setViewMode(option.value), className: `flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium ${viewMode === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-4 w-4" }),
            option.label
          ] }, option.value);
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 overflow-hidden rounded-md border border-border bg-card p-1 sm:inline-flex", children: ["portrait", "landscape"].map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setOrientation(option), className: `rounded px-3 py-2 text-sm font-medium capitalize ${orientation === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`, children: option }, option)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-flex items-center gap-1 rounded-md border border-border bg-card p-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "flow-icon", title: "Zoom out", onClick: () => setZoom(Math.max(0.6, Number((zoom - 0.1).toFixed(1)))), children: /* @__PURE__ */ jsxRuntimeExports.jsx(ZoomOut, { className: "h-4 w-4" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "w-12 text-center text-xs font-semibold tabular-nums", children: [
              Math.round(zoom * 100),
              "%"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "flow-icon", title: "Zoom in", onClick: () => setZoom(Math.min(1.4, Number((zoom + 0.1).toFixed(1)))), children: /* @__PURE__ */ jsxRuntimeExports.jsx(ZoomIn, { className: "h-4 w-4" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "rounded px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent", onClick: () => setZoom(1), children: "Reset" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: viewMode === "split" ? "space-y-4" : "grid gap-4 xl:grid-cols-[minmax(0,1040px)_minmax(380px,1fr)] xl:items-start", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "min-w-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: viewMode === "split" ? "grid gap-4 xl:grid-cols-[minmax(430px,0.85fr)_minmax(560px,1.15fr)]" : "", children: [
          viewMode === "split" && /* @__PURE__ */ jsxRuntimeExports.jsx(EntryPanel, { tab, inventoryItems: items, risItems: acceptedStockItems, stockCardItems, canWrite, saving, iar, setIar, iarLines, setIarLines, ris, setRis, risLines, setRisLines, selectedItemId: selectedItem?.id || "", setSelectedItemId, reportMonth, setReportMonth, onSaveIar: saveIar, onSaveRis: saveRis }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(PaperPreview, { tab, orientation, zoom, editable: true, inventoryItems: items, risItems: acceptedStockItems, stockCardItems, iar, setIar, iarLines, setIarLines, ris, setRis, risLines, setRisLines, selectedItem, selectedItemId: selectedItem?.id || "", setSelectedItemId, stockRows, reportMonth, setReportMonth, rsmiRows })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FlowSupportPanel, { placement: viewMode === "split" ? "bottom" : "side", stats: flowStats, inventoryItems: items, transactions, reportMonth })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: flowStyles })
  ] });
}
function WorkflowStepper({
  active,
  onChange
}) {
  const steps = [{
    value: "iar",
    label: "IAR",
    detail: "Acceptance report",
    icon: PackageCheck
  }, {
    value: "stock-card",
    label: "Stock Card",
    detail: "Item ledger",
    icon: FileSpreadsheet
  }, {
    value: "ris",
    label: "RIS",
    detail: "Issue slip",
    icon: Send
  }, {
    value: "rsmi",
    label: "RSMI",
    detail: "Monthly report",
    icon: FileCheckCorner
  }];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-2 rounded-lg border border-border bg-card p-2 md:grid-cols-4", children: steps.map((step) => {
    const Icon = step.icon;
    const isActive = active === step.value;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => onChange(step.value), className: `flex min-w-0 items-center gap-3 rounded-md px-3 py-3 text-left ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `grid h-8 w-8 shrink-0 place-items-center rounded-md ${isActive ? "bg-white/15" : "bg-muted"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-sm font-semibold", children: step.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `block truncate text-xs ${isActive ? "text-primary-foreground/75" : "text-muted-foreground"}`, children: step.detail })
      ] })
    ] }, step.value);
  }) });
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
  onSaveRis
}) {
  if (tab === "iar") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-lg border border-border bg-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(FormTitle, { title: "IAR Input", subtitle: "Accepted deliveries become Stock Card receipt entries." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FlowField, { label: "IAR No.", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "flow-input", placeholder: "e.g. IAR-2026-07-10-143005123", value: iar.iarNo, onChange: (e) => setIar({
            ...iar,
            iarNo: e.target.value
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(FlowField, { label: "Supplier", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "flow-input", placeholder: "e.g. Davao Citihardware Inc.", value: iar.supplier, onChange: (e) => setIar({
            ...iar,
            supplier: e.target.value
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(FlowField, { label: "Invoice / DR No.", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "flow-input", placeholder: "e.g. 250876 / DR-0001", value: iar.invoiceNo, onChange: (e) => setIar({
            ...iar,
            invoiceNo: e.target.value
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(FlowField, { label: "Accepted By", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "flow-input", placeholder: FORM_DEFAULTS.custodian, value: iar.acceptedBy, onChange: (e) => setIar({
            ...iar,
            acceptedBy: e.target.value
          }) }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(LineEditor, { items: inventoryItems, lines: iarLines, onLines: setIarLines, showCost: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FlowActions, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { disabled: !canWrite || saving, onClick: onSaveIar, className: "flow-primary", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "h-4 w-4" }),
          " ",
          saving ? "Posting..." : "Post IAR"
        ] }) })
      ] })
    ] });
  }
  if (tab === "ris") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-lg border border-border bg-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(FormTitle, { title: "RIS Input", subtitle: "Issued items become Stock Card issue entries and RSMI rows." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FlowField, { label: "RIS No.", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "flow-input", placeholder: "e.g. RIS-2026-07-10-143005123", value: ris.risNo, onChange: (e) => setRis({
            ...ris,
            risNo: e.target.value
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(FlowField, { label: "Requesting Office", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "flow-input", placeholder: "e.g. Training and Assessment", value: ris.office, onChange: (e) => setRis({
            ...ris,
            office: e.target.value
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(FlowField, { label: "Requested By", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "flow-input", placeholder: FORM_DEFAULTS.requestedBy, value: ris.requestedBy, onChange: (e) => setRis({
            ...ris,
            requestedBy: e.target.value
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(FlowField, { label: "Purpose", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "flow-input", placeholder: "e.g. For official supplies and maintenance", value: ris.purpose, onChange: (e) => setRis({
            ...ris,
            purpose: e.target.value
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(FlowField, { label: "Approved By", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "flow-input", placeholder: FORM_DEFAULTS.approvedBy, value: ris.approvedBy, onChange: (e) => setRis({
            ...ris,
            approvedBy: e.target.value
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(FlowField, { label: "Issued By", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "flow-input", placeholder: FORM_DEFAULTS.issuedBy, value: ris.issuedBy, onChange: (e) => setRis({
            ...ris,
            issuedBy: e.target.value
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(FlowField, { label: "Received By", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "flow-input", placeholder: FORM_DEFAULTS.receivedBy, value: ris.receivedBy, onChange: (e) => setRis({
            ...ris,
            receivedBy: e.target.value
          }) }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(LineEditor, { items: risItems, lines: risLines, onLines: setRisLines, emptyMessage: "Post an IAR receipt first before issuing items through RIS." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FlowActions, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { disabled: !canWrite || saving, onClick: onSaveRis, className: "flow-primary", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-4 w-4" }),
          " ",
          saving ? "Issuing..." : "Issue RIS"
        ] }) })
      ] })
    ] });
  }
  if (tab === "stock-card") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-lg border border-border bg-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(FormTitle, { title: "Stock Card Options", subtitle: "Select an item to preview its ledger." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FlowField, { label: "Item", children: /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: "flow-input", value: selectedItemId, onChange: (e) => setSelectedItemId(e.target.value), children: stockCardItems.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: item.id, children: item.name }, item.id)) }) }) })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-lg border border-border bg-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(FormTitle, { title: "RSMI Options", subtitle: "Select month to generate the report." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FlowField, { label: "Report Month", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "flow-input", type: "month", value: reportMonth, onChange: (e) => setReportMonth(e.target.value) }) }) })
  ] });
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
  rsmiRows
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "flow-preview-shell", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flow-preview-bg", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flow-preview-zoom", style: {
    transform: `scale(${zoom})`,
    width: `${100 / zoom}%`
  }, children: [
    tab === "iar" && /* @__PURE__ */ jsxRuntimeExports.jsx(IarPaper, { orientation, items: inventoryItems, form: iar, onForm: setIar, lines: iarLines, onLines: setIarLines, editable }),
    tab === "stock-card" && /* @__PURE__ */ jsxRuntimeExports.jsx(StockCardPaper, { orientation, items: stockCardItems, item: selectedItem, selectedItemId, onSelectedItemId: setSelectedItemId, rows: stockRows, editable }),
    tab === "ris" && /* @__PURE__ */ jsxRuntimeExports.jsx(RisPaper, { orientation, items: risItems, form: ris, onForm: setRis, lines: risLines, onLines: setRisLines, editable }),
    tab === "rsmi" && /* @__PURE__ */ jsxRuntimeExports.jsx(RsmiPaper, { orientation, reportMonth, onReportMonth: setReportMonth, rows: rsmiRows, editable })
  ] }) }) });
}
function IarPaper({
  orientation,
  items,
  form,
  onForm,
  lines,
  onLines,
  editable
}) {
  const validLines = getPreviewLines(items, lines);
  const displayCount = Math.max(6, lines.length);
  const displayLines = editable ? Array.from({
    length: displayCount
  }, (_, index) => lines[index] ?? null) : padRows(validLines, 6);
  function updateLineAt(index, patch) {
    const nextLines = [...lines];
    while (nextLines.length <= index) nextLines.push(blankLine());
    nextLines[index] = {
      ...nextLines[index],
      ...patch
    };
    onLines(nextLines);
  }
  function addLine() {
    onLines([...lines, blankLine()]);
  }
  function removeLine(id) {
    onLines(lines.length > 1 ? lines.filter((line) => line.id !== id) : lines);
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flow-paper ${orientation} iar-paper`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "iar-title", children: "Inspection and Acceptance Report" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("table", { className: "paper-grid iar-meta-grid", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { colSpan: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Entity Name :" }),
          " ",
          editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-inline-control strong", placeholder: FORM_DEFAULTS.entityName, value: form.entityName, onChange: (event) => onForm({
            ...form,
            entityName: event.target.value
          }) }) : form.entityName
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Fund Cluster :" }),
          " ",
          editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-inline-control strong", placeholder: FORM_DEFAULTS.fundCluster, value: form.fundCluster, onChange: (event) => onForm({
            ...form,
            fundCluster: event.target.value
          }) }) : form.fundCluster
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Supplier :" }),
          " ",
          editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-inline-control strong", placeholder: "e.g. DAVAO CITIHARDWARE INC.", value: form.supplier, onChange: (event) => onForm({
            ...form,
            supplier: event.target.value
          }) }) : form.supplier
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "IAR No. :" }),
          " ",
          editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-inline-control strong", placeholder: "e.g. IAR-2026-07-10-143005123", value: form.iarNo, onChange: (event) => onForm({
            ...form,
            iarNo: event.target.value
          }) }) : form.iarNo
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Date :" }),
          " ",
          editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-inline-control strong", type: "date", value: form.iarDate, onChange: (event) => onForm({
            ...form,
            iarDate: event.target.value
          }) }) : shortDate(form.iarDate)
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "PO No. / Date :" }),
          " ",
          editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-inline-control strong", placeholder: "e.g. 2025-02-0006 / 02/14/2025", value: form.poNoDate, onChange: (event) => onForm({
            ...form,
            poNoDate: event.target.value
          }) }) : form.poNoDate
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Invoice No. :" }),
          " ",
          editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-inline-control strong", placeholder: "e.g. 250876", value: form.invoiceNo, onChange: (event) => onForm({
            ...form,
            invoiceNo: event.target.value
          }) }) : form.invoiceNo
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Date :" }),
          " ",
          editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-inline-control strong", type: "date", value: form.invoiceDate, onChange: (event) => onForm({
            ...form,
            invoiceDate: event.target.value
          }) }) : shortDate(form.invoiceDate)
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Requisitioning Office/Dept. :" }),
          " ",
          editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-inline-control strong", placeholder: "e.g. Training and Assessment", value: form.requisitioningOffice, onChange: (event) => onForm({
            ...form,
            requisitioningOffice: event.target.value
          }) }) : form.requisitioningOffice
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { colSpan: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Responsibility Center Code :" }),
          " ",
          editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-inline-control strong", placeholder: FORM_DEFAULTS.responsibilityCenter, value: form.responsibilityCenter, onChange: (event) => onForm({
            ...form,
            responsibilityCenter: event.target.value
          }) }) : form.responsibilityCenter
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "paper-grid iar-items-grid", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("th", { className: "stock-no-col", children: [
          "Stock/",
          /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
          "Property No."
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "item-col", children: "Description" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Unit" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "qty-col", children: "Quantity" }),
        editable && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "action-col print-hidden" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: displayLines.map((line, index) => {
        const sourceLine = editable ? line : null;
        const previewLine = editable ? getPreviewLine(items, sourceLine) : line;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: String(index + 1).padStart(3, "0") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: editable ? /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "paper-cell-control", value: sourceLine?.item_id || "", onChange: (e) => updateLineAt(index, {
            item_id: e.target.value
          }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Select item..." }),
            items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: item.id, children: item.name }, item.id))
          ] }) : previewLine?.item?.name || "" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: previewLine?.item?.unit || "" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "right", children: editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-cell-control right", type: "number", min: 1, placeholder: "Qty.", value: sourceLine?.quantity || "", onChange: (e) => updateLineAt(index, {
            quantity: e.target.value
          }) }) : previewLine?.quantity || "" }),
          editable && /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "center print-hidden", children: sourceLine && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "flow-icon text-destructive", onClick: () => removeLine(sourceLine.id), title: "Remove row", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" }) }) })
        ] }, sourceLine?.id || previewLine?.id || index);
      }) })
    ] }),
    editable && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "flow-secondary mt-3", onClick: addLine, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
      " Add Row"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("table", { className: "paper-grid iar-signoff-grid", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Inspection" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Acceptance" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Date Inspected :" }),
          " ",
          editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-inline-control strong", type: "date", value: form.dateInspected, onChange: (event) => onForm({
            ...form,
            dateInspected: event.target.value
          }) }) : shortDate(form.dateInspected),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "iar-checkbox-line", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "paper-checkbox" }),
            " Inspected, verified and found in order as to quantity and specifications"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Date Received :" }),
          " ",
          editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-inline-control strong", type: "date", value: form.dateReceived, onChange: (event) => onForm({
            ...form,
            dateReceived: event.target.value
          }) }) : shortDate(form.dateReceived),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "iar-checkbox-line", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "paper-checkbox" }),
            " Complete"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "iar-checkbox-line", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "paper-checkbox" }),
            " Partial (pls. specify quantity)"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "center strong", children: [
          editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-cell-control center strong", placeholder: FORM_DEFAULTS.inspectionOfficer, value: form.inspectionOfficer, onChange: (event) => onForm({
            ...form,
            inspectionOfficer: event.target.value
          }) }) : form.inspectionOfficer,
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "signature-label normal-case", children: "Inspection Officer/Inspection Committee" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "center strong", children: [
          editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-cell-control center strong", placeholder: FORM_DEFAULTS.custodian, value: form.acceptedBy, onChange: (event) => onForm({
            ...form,
            acceptedBy: event.target.value
          }) }) : form.acceptedBy,
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "signature-label normal-case", children: "Supply and/or Property Custodian" })
        ] })
      ] })
    ] }) })
  ] });
}
function StockCardPaper({
  orientation,
  items,
  item,
  selectedItemId,
  onSelectedItemId,
  rows,
  editable
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flow-paper ${orientation} stock-paper`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "paper-title-dark", children: "Stock Card" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("table", { className: "paper-grid official-meta-grid stock-meta-grid", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { colSpan: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Entity Name :" }),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "strong", children: "PROVINCIAL TRAINING CENTER - DAVAO DEL NORTE" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Fund Cluster :" }),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "strong", children: "06-SSP" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Item :" }),
          " ",
          editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: "paper-inline-control strong", value: selectedItemId, onChange: (event) => onSelectedItemId(event.target.value), children: items.map((candidate) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: candidate.id, children: candidate.name }, candidate.id)) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "strong", children: item?.name || "" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Stock No. :" }),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "strong", children: item ? item.id.slice(0, 8) : "" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Re-order Point :" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { colSpan: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Description :" }),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "strong", children: item?.name || "" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Unit of Measurement :" }),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "strong", children: item?.unit || "" })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "paper-grid stock-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("thead", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { rowSpan: 2, children: "Date" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { rowSpan: 2, children: "Reference" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Receipt" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { colSpan: 2, children: "Issue" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Balance" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { rowSpan: 2, children: "No. of Days to Consume" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Qty." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Quantity" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Office" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Qty." })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: padRows(rows, 24).map((row, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: row ? format(new Date(row.created_at), "MM/dd/yyyy") : "" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: extractReference(row?.remarks) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "right", children: row?.type === "IN" ? row.quantity : "" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "right", children: row?.type === "OUT" ? row.quantity : "" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: extractOffice(row?.remarks) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "right", children: row?.balance ?? "" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", {})
      ] }, row?.id || index)) })
    ] })
  ] });
}
function RisPaper({
  orientation,
  items,
  form,
  onForm,
  lines,
  onLines,
  editable
}) {
  const validLines = getPreviewLines(items, lines);
  const displayLines = editable ? padRows(lines, Math.max(10, lines.length)) : padRows(validLines, 10);
  function updateLine(id, patch) {
    onLines(lines.map((line) => line.id === id ? {
      ...line,
      ...patch
    } : line));
  }
  function addLine() {
    onLines([...lines, blankLine()]);
  }
  function removeLine(id) {
    onLines(lines.length > 1 ? lines.filter((line) => line.id !== id) : lines);
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flow-paper ${orientation} ris-paper official-paper`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "paper-title-dark", children: "Requisition and Issue Slip" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("table", { className: "paper-grid official-meta-grid", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { colSpan: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Entity Name :" }),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "strong", children: "PROVINCIAL TRAINING CENTER - DAVAO DEL NORTE" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Fund Cluster :" }),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "strong", children: "06-SSP" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Division :" }),
          " ",
          editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-inline-control strong", placeholder: "e.g. Training and Assessment", value: form.office, onChange: (event) => onForm({
            ...form,
            office: event.target.value
          }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "strong", children: form.office })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Responsibility Center Code :" }),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "strong", children: FORM_DEFAULTS.risResponsibilityCenter })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "RIS No. :" }),
          " ",
          editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-inline-control strong", placeholder: "e.g. RIS-2026-07-10-143005123", value: form.risNo, onChange: (event) => onForm({
            ...form,
            risNo: event.target.value
          }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "strong", children: form.risNo })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { colSpan: 3, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Office :" }),
        " ",
        editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-inline-control strong", placeholder: "e.g. Supplies and Materials Management", value: form.office || "Supplies and Materials Management", onChange: (event) => onForm({
          ...form,
          office: event.target.value
        }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "strong", children: form.office || "Supplies and Materials Management" })
      ] }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "paper-grid ris-grid", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("thead", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { colSpan: 4, children: "Requisition" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { colSpan: 2, children: "Stock Available?" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { colSpan: 2, children: "Issue" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "stock-no-col", children: "Stock No." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Unit" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "item-col", children: "Description" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "qty-col", children: "Qty." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Yes" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "No" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "qty-col", children: "Qty." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Remarks" }),
          editable && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "action-col print-hidden" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: displayLines.map((line, index) => {
        const sourceLine = editable ? line : null;
        const previewLine = editable ? getPreviewLine(items, sourceLine) : line;
        const requested = Number(previewLine?.quantity || 0);
        const available = previewLine?.item ? previewLine.item.quantity >= requested : false;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: String(index + 1).padStart(3, "0") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: previewLine?.item?.unit || "" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: editable && sourceLine ? /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "paper-cell-control", value: sourceLine.item_id, onChange: (e) => updateLine(sourceLine.id, {
            item_id: e.target.value
          }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Select item..." }),
            items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: item.id, children: item.name }, item.id))
          ] }) : previewLine?.item?.name || "" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "right", children: editable && sourceLine ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-cell-control right", type: "number", min: 1, placeholder: "Qty.", value: sourceLine.quantity, onChange: (e) => updateLine(sourceLine.id, {
            quantity: e.target.value
          }) }) : previewLine?.quantity || "" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "center", children: previewLine ? available ? "/" : "" : "" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "center", children: previewLine ? !available ? "/" : "" : "" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "right", children: available ? previewLine?.quantity : "" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: editable && sourceLine ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-cell-control", value: sourceLine.remarks, onChange: (e) => updateLine(sourceLine.id, {
            remarks: e.target.value
          }) }) : previewLine?.remarks || (previewLine ? "For issuance" : "") }),
          editable && /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "center print-hidden", children: sourceLine && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "flow-icon text-destructive", onClick: () => removeLine(sourceLine.id), title: "Remove row", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" }) }) })
        ] }, sourceLine?.id || previewLine?.id || index);
      }) })
    ] }),
    editable && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "flow-secondary mt-3", onClick: addLine, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
      " Add Row"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "paper-purpose", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Purpose:" }),
      " ",
      editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-inline-control", placeholder: "e.g. For official supplies, maintenance, or project use", value: form.purpose, onChange: (event) => onForm({
        ...form,
        purpose: event.target.value
      }) }) : form.purpose
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("table", { className: "signature-table", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: "Signature" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: "Requested by:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: "Approved by:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: "Issued by:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: "Received by:" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: "Printed Name" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-cell-control center", placeholder: FORM_DEFAULTS.requestedBy, value: form.requestedBy, onChange: (e) => onForm({
          ...form,
          requestedBy: e.target.value
        }) }) : form.requestedBy }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-cell-control center", placeholder: FORM_DEFAULTS.approvedBy, value: form.approvedBy, onChange: (e) => onForm({
          ...form,
          approvedBy: e.target.value
        }) }) : form.approvedBy }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-cell-control center", placeholder: FORM_DEFAULTS.issuedBy, value: form.issuedBy, onChange: (e) => onForm({
          ...form,
          issuedBy: e.target.value
        }) }) : form.issuedBy }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-cell-control center", placeholder: FORM_DEFAULTS.receivedBy, value: form.receivedBy, onChange: (e) => onForm({
          ...form,
          receivedBy: e.target.value
        }) }) : form.receivedBy })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: "Designation" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-cell-control center", placeholder: FORM_DEFAULTS.requestedDesignation, value: form.requestedDesignation, onChange: (e) => onForm({
          ...form,
          requestedDesignation: e.target.value
        }) }) : form.requestedDesignation }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-cell-control center", placeholder: FORM_DEFAULTS.approvedDesignation, value: form.approvedDesignation, onChange: (e) => onForm({
          ...form,
          approvedDesignation: e.target.value
        }) }) : form.approvedDesignation }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-cell-control center", placeholder: FORM_DEFAULTS.issuedDesignation, value: form.issuedDesignation, onChange: (e) => onForm({
          ...form,
          issuedDesignation: e.target.value
        }) }) : form.issuedDesignation }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-cell-control center", placeholder: FORM_DEFAULTS.receivedDesignation, value: form.receivedDesignation, onChange: (e) => onForm({
          ...form,
          receivedDesignation: e.target.value
        }) }) : form.receivedDesignation })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: "Date" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-cell-control center", type: "date", value: form.requestedDate, onChange: (e) => onForm({
          ...form,
          requestedDate: e.target.value
        }) }) : shortDate(form.requestedDate) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-cell-control center", type: "date", value: form.approvedDate, onChange: (e) => onForm({
          ...form,
          approvedDate: e.target.value
        }) }) : shortDate(form.approvedDate) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-cell-control center", type: "date", value: form.issuedDate, onChange: (e) => onForm({
          ...form,
          issuedDate: e.target.value
        }) }) : shortDate(form.issuedDate) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-cell-control center", type: "date", value: form.receivedDate, onChange: (e) => onForm({
          ...form,
          receivedDate: e.target.value
        }) }) : shortDate(form.receivedDate) })
      ] })
    ] }) })
  ] });
}
function RsmiPaper({
  orientation,
  reportMonth,
  onReportMonth,
  rows,
  editable
}) {
  const recapRows = getRsmiRecapRows(rows);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flow-paper ${orientation} rsmi-paper official-paper`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "paper-title-dark", children: "Report of Supplies and Materials Issued" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("table", { className: "paper-grid official-meta-grid", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { colSpan: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Entity Name :" }),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "strong", children: "PROVINCIAL TRAINING CENTER - DAVAO DEL NORTE" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Fund Cluster :" }),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "strong", children: "06-SSP" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Report Month :" }),
          " ",
          editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "paper-inline-control strong", type: "month", value: reportMonth, onChange: (event) => onReportMonth(event.target.value) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "strong", children: reportMonth })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { colSpan: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Prepared By :" }),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "strong", children: "Supply and Property Division Unit" })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "paper-grid", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("thead", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { colSpan: 6, children: "To be filled up by the Supply and/or Property Division Unit" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { colSpan: 2, children: "To be filled up by the Accounting Division Unit" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "RIS No." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Responsibility Center Code" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Stock No." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Item" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Unit" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Quantity Issued" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Unit Cost" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Amount" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: padRows(rows, 12).map((row, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: row?.risNo || "" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: row?.responsibilityCenterCode || "" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: row?.stockNo || "" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: row?.item || "" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: row?.unit || "" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "right", children: row?.quantity || "" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "right", children: row?.unitCost ? peso(row.unitCost) : "" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "right", children: row?.amount ? peso(row.amount) : "" })
      ] }, row?.id || index)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "paper-grid rsmi-recap", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("thead", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { colSpan: 2, children: "Recapitulation" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { colSpan: 3, children: "Recapitulation" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Stock No." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Quantity" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Unit Cost" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Total Cost" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "UACS Object Code" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: padRows(recapRows, 8).map((row, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: row?.stockNo || "" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "right", children: row?.quantity || "" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "right", children: row?.unitCost ? peso(row.unitCost) : "" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "right", children: row?.totalCost ? peso(row.totalCost) : "" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: row?.uacsObjectCode || "" })
      ] }, row?.stockNo || index)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SignatureBlock, { labels: ["Certified Correct", "Posted By"], values: [`${FORM_DEFAULTS.custodian}
TESD Specialist II`, `${FORM_DEFAULTS.accountingStaff}
${FORM_DEFAULTS.accountingDesignation}`] })
  ] });
}
function LineEditor({
  items,
  lines,
  onLines,
  showCost = false,
  emptyMessage = "No items available."
}) {
  function updateLine(id, patch) {
    onLines(lines.map((line) => line.id === id ? {
      ...line,
      ...patch
    } : line));
  }
  function removeLine(id) {
    onLines(lines.length > 1 ? lines.filter((line) => line.id !== id) : lines);
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flow-scroll", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "flow-table line-editor-table min-w-[720px]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Item" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right", children: "Available" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right", children: "Quantity" }),
      showCost && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right", children: "Unit Cost" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Remarks" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
      items.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: showCost ? 6 : 5, className: "px-3 py-6 text-center text-muted-foreground", children: emptyMessage }) }),
      lines.map((line) => {
        const item = items.find((candidate) => candidate.id === line.item_id);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "flow-input", value: line.item_id, onChange: (e) => updateLine(line.id, {
            item_id: e.target.value
          }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Select item..." }),
            items.map((candidate) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: candidate.id, children: candidate.name }, candidate.id))
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-right tabular-nums", children: item ? `${item.quantity} ${item.unit}` : "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "flow-input text-right", type: "number", min: 1, placeholder: "Qty.", value: line.quantity, onChange: (e) => updateLine(line.id, {
            quantity: e.target.value
          }) }) }),
          showCost && /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "flow-input text-right", type: "number", min: 0, step: "0.01", placeholder: "0.00", value: line.unitCost, onChange: (e) => updateLine(line.id, {
            unitCost: e.target.value
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "flow-input", placeholder: "Optional remarks", value: line.remarks, onChange: (e) => updateLine(line.id, {
            remarks: e.target.value
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "flow-icon text-destructive", onClick: () => removeLine(line.id), title: "Remove line", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-4 w-4" }) }) })
        ] }, line.id);
      })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tfoot", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: showCost ? 6 : 5, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "flow-secondary", disabled: items.length === 0, onClick: () => onLines([...lines, blankLine()]), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
      " Add Item"
    ] }) }) }) })
  ] }) });
}
function FlowSupportPanel({
  placement,
  stats,
  inventoryItems,
  transactions,
  reportMonth
}) {
  const isBottom = placement === "bottom";
  const iarRows = transactions.filter((tx) => tx.type === "IN" && isIarTransaction(tx)).slice(-8).reverse();
  const risRows = transactions.filter((tx) => tx.type === "OUT" && isRisTransaction(tx)).slice(-8).reverse();
  const PAGE_SIZE = 10;
  const [invPage, setInvPage] = reactExports.useState(0);
  const totalInvPages = Math.max(1, Math.ceil(inventoryItems.length / PAGE_SIZE));
  const paginatedItems = inventoryItems.slice(invPage * PAGE_SIZE, (invPage + 1) * PAGE_SIZE);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `grid grid-cols-2 gap-3 ${isBottom ? "xl:grid-cols-4" : ""}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SupportCard, { label: "Active Stage", value: stats.activeStage }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SupportCard, { label: "IAR Receipts", value: stats.iarReceipts }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SupportCard, { label: "RIS Issues", value: stats.risIssues }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SupportCard, { label: "Issued This Month", value: stats.issuedThisMonth })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: isBottom ? "grid gap-4 xl:grid-cols-2" : "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SupportTable, { title: "Recent IAR Receipts", rows: iarRows, empty: "No IAR receipts posted yet." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SupportTable, { title: "Recent RIS Issues", rows: risRows, empty: "No RIS issues posted yet." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: `rounded-lg border border-border bg-card ${isBottom ? "xl:col-span-2" : ""}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-b border-border px-3 py-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold", children: "Inventory Items" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(PaginationNav, { page: invPage, totalPages: totalInvPages, onPrev: () => setInvPage(Math.max(0, invPage - 1)), onNext: () => setInvPage(Math.min(totalInvPages - 1, invPage + 1)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flow-scroll border-0 rounded-none max-h-72", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "flow-table min-w-[560px] text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Item" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Unit" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right", children: "Current Qty." }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Status" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
            paginatedItems.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: item.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: item.unit }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-right tabular-nums", children: item.quantity }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: item.quantity > 0 ? "Available" : "Out" })
            ] }, item.id)),
            inventoryItems.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, className: "px-3 py-6 text-center text-muted-foreground", children: "No inventory items found." }) })
          ] })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sr-only", children: [
      "Report month: ",
      reportMonth
    ] })
  ] });
}
function SupportCard({
  label,
  value
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border bg-card p-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 truncate text-lg font-semibold tabular-nums", children: value })
  ] });
}
function SupportTable({
  title,
  rows,
  empty
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-lg border border-border bg-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-b border-border px-3 py-2 text-sm font-semibold", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flow-scroll border-0 rounded-none max-h-72", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "flow-table min-w-[560px] text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Reference" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Item" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right", children: "Qty." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Date" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: extractReference(row.remarks) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: row.item?.name || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-right tabular-nums", children: row.quantity }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: format(new Date(row.created_at), "MMM d, yyyy") })
        ] }, row.id)),
        rows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, className: "px-3 py-6 text-center text-muted-foreground", children: empty }) })
      ] })
    ] }) })
  ] });
}
function SignatureBlock({
  labels,
  values
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "signature-block", style: {
    gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))`
  }, children: labels.map((label, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "signature-line", children: values[index] || "" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "signature-label", children: label })
  ] }, label)) });
}
function FormTitle({
  title,
  subtitle
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-border px-4 py-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: subtitle })
  ] });
}
function FlowField({
  label,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold uppercase tracking-wide text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1", children })
  ] });
}
function FlowActions({
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end gap-2 border-t border-border pt-4", children });
}
function normalizePrintControls(root) {
  root.querySelectorAll("select").forEach((select) => {
    const selectedText = select.value ? select.options[select.selectedIndex]?.textContent?.trim() || "" : "";
    replaceControlWithText(select, selectedText);
  });
  root.querySelectorAll("input").forEach((input) => {
    const value = input.type === "date" && input.value ? shortDate(input.value) : input.value;
    replaceControlWithText(input, value || "");
  });
}
function replaceControlWithText(control, value) {
  const span = document.createElement("span");
  span.className = `${control.className} paper-print-value`;
  span.textContent = value;
  control.replaceWith(span);
}
function blankLine() {
  return {
    id: createId(),
    item_id: "",
    quantity: "1",
    unitCost: "",
    remarks: ""
  };
}
function makeFormNumber(prefix, date) {
  const now = /* @__PURE__ */ new Date();
  const timePart = [now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()].map((part, index) => String(part).padStart(index === 3 ? 3 : 2, "0")).join("");
  return `${prefix}-${date}-${timePart}`;
}
function isUniqueViolation(error) {
  return error.code === "23505" || error.message?.toLowerCase().includes("duplicate key value");
}
function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
function shortDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "M/d/yyyy");
}
function getPreviewLines(items, lines) {
  return lines.map((line) => ({
    ...line,
    item: items.find((item) => item.id === line.item_id)
  })).filter((line) => line.item && Number(line.quantity) > 0);
}
function getPreviewLine(items, line) {
  if (!line) return null;
  return {
    ...line,
    item: items.find((item) => item.id === line.item_id)
  };
}
function getStockRows(item, transactions) {
  if (!item) return [];
  const itemTransactions = transactions.filter((tx) => tx.item_id === item.id && (isIarTransaction(tx) || isRisTransaction(tx)));
  const netMovement = itemTransactions.reduce((sum, tx) => sum + (tx.type === "IN" ? tx.quantity : -tx.quantity), 0);
  let balance = item.quantity - netMovement;
  return itemTransactions.map((tx) => {
    balance += tx.type === "IN" ? tx.quantity : -tx.quantity;
    return {
      ...tx,
      balance
    };
  });
}
function getAcceptedStockItems(items, transactions) {
  const acceptedItemIds = new Set(transactions.filter((tx) => tx.type === "IN" && isIarTransaction(tx)).map((tx) => tx.item_id));
  return items.filter((item) => acceptedItemIds.has(item.id) && Number(item.quantity) > 0);
}
function getStockCardItems(items, transactions) {
  const transactionItemIds = new Set(transactions.filter((tx) => isIarTransaction(tx) || isRisTransaction(tx)).map((tx) => tx.item_id));
  const transactionItems = items.filter((item) => transactionItemIds.has(item.id));
  return transactionItems.length > 0 ? transactionItems : items;
}
function isIarTransaction(transaction) {
  const source = transaction.source_form_type;
  return source === "IAR" || extractReference(transaction.remarks).startsWith("IAR ");
}
function isRisTransaction(transaction) {
  const source = transaction.source_form_type;
  return source === "RIS" || extractReference(transaction.remarks).startsWith("RIS ");
}
function getFlowStats(transactions, reportMonth, tab) {
  return {
    activeStage: activeStageLabel(tab),
    iarReceipts: transactions.filter((tx) => tx.type === "IN" && isIarTransaction(tx)).length,
    risIssues: transactions.filter((tx) => tx.type === "OUT" && isRisTransaction(tx)).length,
    issuedThisMonth: transactions.filter((tx) => tx.type === "OUT" && isRisTransaction(tx) && tx.created_at.slice(0, 7) === reportMonth).reduce((sum, tx) => sum + tx.quantity, 0)
  };
}
function activeStageLabel(tab) {
  if (tab === "iar") return "IAR";
  if (tab === "stock-card") return "Stock Card";
  if (tab === "ris") return "RIS";
  return "RSMI";
}
function getRsmiRows(transactions, reportMonth) {
  return transactions.filter((tx) => tx.type === "OUT" && isRisTransaction(tx) && tx.created_at.slice(0, 7) === reportMonth).map((tx) => {
    const unitCost = extractUnitCost(tx.remarks) || findLatestReceiptCost(transactions, tx);
    return {
      id: tx.id,
      risNo: extractReference(tx.remarks),
      responsibilityCenterCode: extractResponsibilityCenter(tx.remarks),
      stockNo: tx.item_id.slice(0, 8),
      item: tx.item?.name || "Unknown item",
      unit: tx.item?.unit || "",
      quantity: tx.quantity,
      unitCost,
      amount: tx.quantity * unitCost
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
  lines
}) {
  const semiExpendable = lines.filter((line) => line.item?.inventory_classification === "semi_expendable_property");
  const ppe = lines.filter((line) => line.item?.inventory_classification === "ppe");
  if (semiExpendable.length > 0) {
    const {
      data: ics,
      error
    } = await supabase.from("ics_forms").insert({
      ics_no: `ICS-${risNo}`,
      ris_id: risId,
      custodian_name: custodian,
      office,
      created_by: userId,
      created_by_name: userName
    }).select("id").single();
    if (error) return error.message;
    const {
      error: itemError
    } = await supabase.from("ics_items").insert(semiExpendable.map((line) => ({
      ics_id: ics.id,
      item_id: line.item_id,
      quantity: Number(line.quantity),
      unit_cost: Number(line.item?.acquisition_cost || 0),
      remarks: line.remarks || null
    })));
    if (itemError) return itemError.message;
  }
  if (ppe.length > 0) {
    const {
      data: par,
      error
    } = await supabase.from("par_forms").insert({
      par_no: `PAR-${risNo}`,
      ris_id: risId,
      accountable_person: custodian,
      office,
      created_by: userId,
      created_by_name: userName
    }).select("id").single();
    if (error) return error.message;
    const {
      error: itemError
    } = await supabase.from("par_items").insert(ppe.map((line) => ({
      par_id: par.id,
      item_id: line.item_id,
      quantity: Number(line.quantity),
      unit_cost: Number(line.item?.acquisition_cost || 0),
      remarks: line.remarks || null
    })));
    if (itemError) return itemError.message;
  }
  return null;
}
function findLatestReceiptCost(transactions, issue) {
  const issueDate = new Date(issue.created_at).getTime();
  const receipt = transactions.filter((tx) => tx.type === "IN" && tx.item_id === issue.item_id && new Date(tx.created_at).getTime() <= issueDate).reverse().find((tx) => extractUnitCost(tx.remarks) > 0);
  return extractUnitCost(receipt?.remarks);
}
function getRsmiRecapRows(rows) {
  const groups = /* @__PURE__ */ new Map();
  rows.forEach((row) => {
    const key = `${row.stockNo}-${row.unitCost}`;
    const group = groups.get(key) ?? {
      stockNo: row.stockNo,
      quantity: 0,
      unitCost: row.unitCost,
      totalCost: 0,
      uacsObjectCode: ""
    };
    group.quantity += row.quantity;
    group.totalCost += row.amount;
    groups.set(key, group);
  });
  return Array.from(groups.values());
}
function padRows(rows, count) {
  return [...rows, ...Array.from({
    length: Math.max(0, count - rows.length)
  }, () => null)];
}
function extractReference(remarks) {
  if (!remarks) return "";
  return remarks.split("|")[0]?.trim() || "";
}
function extractOffice(remarks) {
  if (!remarks) return "";
  const office = remarks.split("|").find((part) => part.trim().startsWith("Office:"));
  return office?.replace("Office:", "").trim() || "";
}
function extractResponsibilityCenter(remarks) {
  if (!remarks) return "16 009 03 0001 07";
  const center = remarks.split("|").find((part) => part.trim().startsWith("Responsibility Center:"));
  return center?.replace("Responsibility Center:", "").trim() || "16 009 03 0001 07";
}
function extractUnitCost(remarks) {
  if (!remarks) return 0;
  const cost = remarks.split("|").find((part) => part.trim().startsWith("Unit Cost:"));
  const rawValue = cost?.replace("Unit Cost:", "").replace(/[^\d.]/g, "");
  return Number(rawValue || 0);
}
function peso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
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
export {
  FormsFlow as component
};
