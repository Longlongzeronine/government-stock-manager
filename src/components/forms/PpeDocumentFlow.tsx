import { useEffect, useMemo, useState } from "react";
import { Check, Clock3, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FundClusterControl } from "@/components/common/FundClusterControl";
import {
  approvePpeDocument,
  reserveNextFormNumber,
  savePpeDocument,
} from "@/lib/data.functions";

export type PpeDocumentType =
  | "ppe-ledger"
  | "par"
  | "ptr"
  | "rpcppe"
  | "iirup"
  | "rlsddp"
  | "rrpe";

type PpeItem = {
  id: string;
  name: string;
  description?: string | null;
  stock_number?: string | null;
  unit: string;
  quantity: number;
  acquisition_cost?: number;
  inventory_classification?: string | null;
  accountability_status?: string | null;
};

type PpeMovement = {
  id: string;
  item_id: string;
  type: "IN" | "OUT";
  quantity: number;
  remarks?: string | null;
  created_at: string;
  source_form_type?: string | null;
  source_form_id?: string | null;
  source_form_no?: string | null;
};

type PpeIarForm = {
  id: string;
  iar_no?: string | null;
  form_data?: { fund_cluster?: string | null } | null;
};

type PpeRow = {
  itemId: string;
  quantity: string;
  physicalCount: string;
  acquiredDate: string;
  propertyNo: string;
  unitCost: string;
  accumulatedDepreciation: string;
  impairmentLoss: string;
  remarks: string;
  disposalSale: string;
  disposalTransfer: string;
  disposalDestroy: string;
  disposalOther: string;
  appraisedValue: string;
  receiptNo: string;
  saleAmount: string;
  endUser: string;
  ledgerBalance?: string;
};

type PpeDocument = {
  id: string;
  document_type: PpeDocumentType;
  document_no: string;
  status: "draft" | "approved" | "cancelled";
  form_data: Record<string, any>;
  created_at: string;
};

type ParFormRecord = {
  id: string;
  par_no: string;
  accountable_person?: string | null;
  office?: string | null;
  status: string;
  created_at: string;
  lines: Array<{
    item_id: string;
    quantity: number | string;
    unit_cost: number | string;
    remarks?: string | null;
    item?: PpeItem | null;
  }>;
};

const TITLES: Record<
  PpeDocumentType,
  { title: string; appendix: string; orientation: "portrait" | "landscape" }
> = {
  "ppe-ledger": {
    title: "PROPERTY, PLANT AND EQUIPMENT LEDGER CARD",
    appendix: "Appendix 70",
    orientation: "landscape",
  },
  par: {
    title: "PROPERTY ACKNOWLEDGMENT RECEIPT",
    appendix: "Appendix 71",
    orientation: "portrait",
  },
  ptr: {
    title: "PROPERTY TRANSFER REPORT",
    appendix: "Appendix 76",
    orientation: "portrait",
  },
  rpcppe: {
    title: "REPORT ON THE PHYSICAL COUNT OF PROPERTY, PLANT AND EQUIPMENT",
    appendix: "Appendix 73",
    orientation: "landscape",
  },
  iirup: {
    title: "INVENTORY AND INSPECTION REPORT OF UNSERVICEABLE PROPERTY",
    appendix: "Appendix 74",
    orientation: "landscape",
  },
  rlsddp: {
    title: "REPORT OF LOST, STOLEN, DAMAGED OR DESTROYED PROPERTY",
    appendix: "Appendix 75",
    orientation: "portrait",
  },
  rrpe: {
    title: "RETURN AND RECEIPT OF PROPERTY/EQUIPMENT",
    appendix: "Annex 28",
    orientation: "portrait",
  },
};

const ENTITY = "PROVINCIAL TRAINING CENTER - DAVAO DEL NORTE";
function timestampValue(value: string | Date) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function dateValue(value: string | Date) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : "";
}

function normalizeFundCluster(value: unknown) {
  return String(value || "").trim().toUpperCase().replace(/M00E/g, "MOOE");
}

const today = () => new Date().toISOString().slice(0, 10);
const numberFor = (type: PpeDocumentType, date = today()) =>
  type === "ppe-ledger"
    ? `PPELC-${date}`
    : `0001-${date.slice(5, 7)}-${date.slice(0, 4)}`;
const blankRow = (itemId = ""): PpeRow => ({
  itemId,
  quantity: "1",
  physicalCount: "",
  acquiredDate: "",
  propertyNo: "",
  unitCost: "",
  accumulatedDepreciation: "",
  impairmentLoss: "",
  remarks: "",
  endUser: "",
  disposalSale: "",
  disposalTransfer: "",
  disposalDestroy: "",
  disposalOther: "",
  appraisedValue: "",
  receiptNo: "",
  saleAmount: "",
});

const FIELD_SETS: Record<
  PpeDocumentType,
  Array<{
    key: string;
    label: string;
    kind?: "date" | "select";
    options?: string[];
  }>
> = {
  "ppe-ledger": [
    { key: "fundCluster", label: "Fund cluster" },
    { key: "objectAccountCode", label: "Object account code" },
    { key: "usefulLife", label: "Estimated useful life (years)" },
    { key: "depreciationRate", label: "Monthly depreciation rate" },
    { key: "accumulatedDepreciation", label: "Accumulated depreciation" },
    { key: "impairmentLoss", label: "Accumulated impairment losses" },
    { key: "repairNature", label: "Repair history: nature" },
    { key: "repairAmount", label: "Repair history: amount" },
  ],
  par: [
    { key: "fundCluster", label: "Fund cluster" },
    { key: "office", label: "Office" },
    { key: "accountablePerson", label: "Received by / accountable person" },
    { key: "issuedBy", label: "Issued by" },
  ],
  ptr: [
    { key: "fundCluster", label: "Fund cluster" },
    {
      key: "fromAccountableOfficer",
      label: "From accountable officer / agency / fund cluster",
    },
    { key: "previousParNo", label: "Current PAR number" },
    {
      key: "toAccountableOfficer",
      label: "To accountable officer / agency / fund cluster",
    },
    { key: "toOffice", label: "Receiving office" },
    {
      key: "transferType",
      label: "Transfer type",
      kind: "select",
      options: ["Donation", "Relocate", "Reassignment", "Others"],
    },
    { key: "reasonForTransfer", label: "Reason for transfer" },
    { key: "approvedBy", label: "Approved by" },
    { key: "releasedBy", label: "Released / issued by" },
    { key: "receivedBy", label: "Received by" },
  ],
  rpcppe: [
    { key: "fundCluster", label: "Fund cluster" },
    { key: "ppeType", label: "Type of property, plant and equipment" },
    { key: "accountableOfficer", label: "Accountable officer" },
    { key: "designation", label: "Official designation" },
    { key: "station", label: "Station" },
    { key: "dateAssumption", label: "Date of assumption", kind: "date" },
    { key: "certifiedBy", label: "Certified correct by" },
    { key: "approvedBy", label: "Approved by" },
    { key: "verifiedBy", label: "Verified by (COA)" },
  ],
  iirup: [
    { key: "fundCluster", label: "Fund cluster" },
    { key: "accountableOfficer", label: "Accountable officer" },
    { key: "designation", label: "Designation" },
    { key: "station", label: "Station" },
    { key: "previousParNo", label: "Current PAR number" },
    { key: "inspectionOfficer", label: "Inspection officer" },
    { key: "approvedBy", label: "Approved by" },
    { key: "witness", label: "Disposition witnessed by" },
  ],
  rlsddp: [
    { key: "fundCluster", label: "Fund cluster" },
    { key: "departmentOffice", label: "Department / office" },
    { key: "accountableOfficer", label: "Accountable officer" },
    { key: "designation", label: "Designation" },
    { key: "parNo", label: "PAR number" },
    { key: "parDate", label: "PAR date", kind: "date" },
    {
      key: "policeNotified",
      label: "Police notified?",
      kind: "select",
      options: ["No", "Yes"],
    },
    { key: "policeStation", label: "Police station" },
    { key: "policeDate", label: "Police notification date", kind: "date" },
    {
      key: "propertyStatus",
      label: "Status of property",
      kind: "select",
      options: ["Lost", "Stolen", "Damaged", "Destroyed"],
    },
    { key: "circumstances", label: "Circumstances / incident details" },
    { key: "supervisor", label: "Noted by / immediate supervisor" },
    { key: "governmentId", label: "Government-issued ID" },
    { key: "idNumber", label: "ID number" },
    { key: "idDateIssued", label: "ID date issued", kind: "date" },
    { key: "notary", label: "Notary public" },
    { key: "docNo", label: "Notarial document number" },
  ],
  rrpe: [
    { key: "fundCluster", label: "Fund cluster" },
    { key: "parNo", label: "PAR number" },
    { key: "returnedBy", label: "Returned by / end user" },
    { key: "receivedBy", label: "Received by / property custodian" },
  ],
};

const COLUMNS: Record<
  PpeDocumentType,
  Array<{
    key:
      | keyof PpeRow
      | "item"
      | "amount"
      | "balance"
      | "reference"
      | "issues"
      | "repairNature"
      | "repairAmount"
      | "unit"
      | "article"
      | "description"
      | "disposalTotal"
      | "varianceValue";
    label: string;
  }>
> = {
  "ppe-ledger": [
    { key: "acquiredDate", label: "Date" },
    { key: "reference", label: "Reference" },
    { key: "quantity", label: "Receipt Qty." },
    { key: "unitCost", label: "Unit Cost" },
    { key: "amount", label: "Total Cost" },
    { key: "accumulatedDepreciation", label: "Accumulated Depreciation" },
    { key: "impairmentLoss", label: "Accumulated Impairment Losses" },
    { key: "issues", label: "Issues / Transfers / Adjustments" },
    { key: "balance", label: "Adjusted Cost" },
    { key: "repairNature", label: "Repair history" },
    { key: "repairAmount", label: "Repair amount" },
  ],
  par: [
    { key: "quantity", label: "Quantity" },
    { key: "unit", label: "Unit" },
    { key: "item", label: "Description" },
    { key: "propertyNo", label: "Property Number" },
    { key: "acquiredDate", label: "Date Acquired" },
    { key: "amount", label: "Amount" },
  ],
  ptr: [
    { key: "acquiredDate", label: "Date Acquired" },
    { key: "propertyNo", label: "Property Number" },
    { key: "item", label: "Description" },
    { key: "amount", label: "Amount" },
    { key: "remarks", label: "Condition of PPE" },
  ],
  rpcppe: [
    { key: "article", label: "Article" },
    { key: "description", label: "Description" },
    { key: "propertyNo", label: "Property Number" },
    { key: "unit", label: "Unit of Measure" },
    { key: "amount", label: "Unit Value" },
    { key: "quantity", label: "Per Property Card" },
    { key: "physicalCount", label: "Physical Count" },
    { key: "balance", label: "Shortage / Overage Qty." },
    { key: "varianceValue", label: "Shortage / Overage Value" },
    { key: "remarks", label: "Remarks" },
  ],
  iirup: [
    { key: "acquiredDate", label: "Date Acquired" },
    { key: "item", label: "Particulars / Articles" },
    { key: "propertyNo", label: "Property No." },
    { key: "quantity", label: "Qty." },
    { key: "unitCost", label: "Unit Cost" },
    { key: "amount", label: "Total Cost" },
    { key: "accumulatedDepreciation", label: "Accumulated Depreciation" },
    { key: "impairmentLoss", label: "Impairment Losses" },
    { key: "balance", label: "Carrying Amount" },
    { key: "remarks", label: "Remarks" },
    { key: "disposalSale", label: "Sale" },
    { key: "disposalTransfer", label: "Transfer" },
    { key: "disposalDestroy", label: "Destruction" },
    { key: "disposalOther", label: "Others" },
    { key: "disposalTotal", label: "Total Disposal" },
    { key: "appraisedValue", label: "Appraised Value" },
    { key: "receiptNo", label: "OR No." },
    { key: "saleAmount", label: "Sales Amount" },
  ],
  rlsddp: [
    { key: "propertyNo", label: "Property No." },
    { key: "item", label: "Property Description" },
    { key: "amount", label: "Acquisition Cost" },
  ],
  rrpe: [
    { key: "item", label: "Property / Equipment Description" },
    { key: "quantity", label: "Quantity" },
    { key: "propertyNo", label: "Property No." },
    { key: "endUser", label: "End-user" },
    { key: "remarks", label: "Remarks" },
  ],
};

const SIGNATURES: Record<PpeDocumentType, string[]> = {
  "ppe-ledger": ["Recorded by", "Reviewed by"],
  par: ["Received by", "Issued by"],
  ptr: ["Approved by", "Released / Issued by", "Received by"],
  rpcppe: ["Certified correct by", "Approved by", "Verified by"],
  iirup: ["Requested by", "Approved by", "Inspected by", "Witness"],
  rlsddp: [
    "Accountable officer",
    "Noted by / immediate supervisor",
    "Notary public",
  ],
  rrpe: ["Returned by", "Received by"],
};

function initialFields(type: PpeDocumentType, date: string) {
  const defaults: Record<string, string> = {
    entityName: ENTITY,
    date,
    fundCluster: "06-SSP",
  };
  if (type === "rpcppe") defaults.asAt = date;
  if (type === "iirup") defaults.asAt = date;
  if (type === "rrpe") defaults.date = date;
  return Object.fromEntries(
    FIELD_SETS[type].map(({ key }) => [key, defaults[key] || ""]),
  );
}

export function PpeDocumentFlow({
  type,
  orientation,
  zoom,
  items,
  movements = [],
  iarForms = [],
  fundClusterOptions,
  documents,
  parForms = [],
  canWrite,
  userId,
  userName,
  onRefresh,
}: {
  type: PpeDocumentType;
  orientation: "portrait" | "landscape";
  zoom: number;
  items: PpeItem[];
  movements?: PpeMovement[];
  iarForms?: PpeIarForm[];
  fundClusterOptions?: readonly string[];
  documents: PpeDocument[];
  parForms?: ParFormRecord[];
  canWrite: boolean;
  userId?: string;
  userName: string;
  onRefresh: () => void;
}) {
  const ppeItems = useMemo(
    () => items.filter((item) => item.inventory_classification === "ppe"),
    [items],
  );
  const [recordId, setRecordId] = useState("");
  const [docNo, setDocNo] = useState(() => numberFor(type));
  const [date, setDate] = useState(today());
  const [fields, setFields] = useState<Record<string, string>>(() =>
    initialFields(type, today()),
  );
  const itemFundClusters = useMemo(() => {
    const formsById = new Map(iarForms.map((form) => [form.id, form]));
    const clusters = new Map<string, Set<string>>();
    for (const movement of movements) {
      if (movement.type !== "IN" || (
        String(movement.source_form_type || "").toUpperCase() !== "IAR" &&
        !/^IAR\s/i.test(String(movement.remarks || ""))
      )) continue;
      const form = movement.source_form_id ? formsById.get(movement.source_form_id) : undefined;
      const reference = String(movement.remarks || "").match(/IAR\s+([^|]+)/i)?.[1]?.trim();
      const linkedForm = form || iarForms.find((entry) => entry.iar_no?.trim() === reference);
      const fundCluster = normalizeFundCluster(linkedForm?.form_data?.fund_cluster);
      if (!fundCluster) continue;
      const itemClusters = clusters.get(movement.item_id) || new Set<string>();
      itemClusters.add(fundCluster);
      clusters.set(movement.item_id, itemClusters);
    }
    return clusters;
  }, [iarForms, movements]);
  const selectableItems = useMemo(() => {
    if (type !== "par") return ppeItems;
    const fundCluster = normalizeFundCluster(fields.fundCluster);
    return ppeItems.filter((item) => itemFundClusters.get(item.id)?.has(fundCluster));
  }, [type, ppeItems, fields.fundCluster, itemFundClusters]);

  const [rows, setRows] = useState<PpeRow[]>(() =>
    type === "rpcppe"
      ? ppeItems.map((item) => ({
          ...blankRow(item.id),
          quantity: String(item.quantity),
          propertyNo: item.stock_number || "",
          unitCost: String(item.acquisition_cost || 0),
        }))
      : [blankRow((type === "par" ? selectableItems[0] : ppeItems[0])?.id || "")],
  );
  const [busy, setBusy] = useState(false);
  const [savedStatus, setSavedStatus] =
    useState<PpeDocument["status"]>("draft");
  const [reserveNonce, setReserveNonce] = useState(0);
  const matchingDocs = documents.filter((doc) => doc.document_type === type);
  const title = TITLES[type];
  const isReadOnly = savedStatus !== "draft" || !canWrite;

  useEffect(() => {
    if (type !== "par" || savedStatus === "approved" || savedStatus === "cancelled") return;
    const availableIds = new Set(selectableItems.map((item) => item.id));
    setRows((current) => {
      let changed = false;
      const next = current.map((row) => {
        if (!row.itemId || availableIds.has(row.itemId)) return row;
        changed = true;
        return blankRow();
      });
      return changed ? next : current;
    });
  }, [type, selectableItems, savedStatus]);

  useEffect(() => {
    if (recordId || ppeItems.length === 0) return;
    if (type === "rpcppe" && rows.length === 1 && !rows[0]?.itemId) {
      setRows(
        ppeItems.map((item) => ({
          ...blankRow(item.id),
          quantity: String(item.quantity),
          propertyNo: item.stock_number || "",
          unitCost: String(item.acquisition_cost || 0),
        })),
      );
    } else if (type === "ppe-ledger" && !rows[0]?.itemId) {
      setRows([blankRow(ppeItems[0].id)]);
    }
  }, [type, ppeItems, recordId, rows]);

  useEffect(() => {
    if (
      type === "ppe-ledger" ||
      recordId ||
      savedStatus === "approved" ||
      docNo !== numberFor(type, date)
    )
      return;
    let active = true;
    void reserveNextFormNumber({
      data: { prefix: `PPE-${type.toUpperCase()}`, date },
    })
      .then((reserved) => {
        const serial = reserved.match(/-(\d+)$/)?.[1];
        if (active && serial)
          setDocNo(
            `${serial.padStart(4, "0")}-${date.slice(5, 7)}-${date.slice(0, 4)}`,
          );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [type, date, recordId, savedStatus, docNo, reserveNonce]);

  function updateField(key: string, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  // Fund cluster controls which inventory items can be selected. Let users
  // change it freely; the effect below clears rows that no longer match.
  function updateFundCluster(value: string) {
    updateField("fundCluster", value);
  }
  function updateRow(index: number, patch: Partial<PpeRow>) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }
  function addRow() {
    setRows((current) => [...current, blankRow(selectableItems[0]?.id || "")]);
  }
  function removeRow(index: number) {
    setRows((current) =>
      current.length > 1 ? current.filter((_, i) => i !== index) : [blankRow()],
    );
  }

  function startNew() {
    const newDate = today();
    setRecordId("");
    setDocNo(numberFor(type, newDate));
    setDate(newDate);
    setFields(initialFields(type, newDate));
    setSavedStatus("draft");
    setReserveNonce((value) => value + 1);
    setRows(
      type === "rpcppe"
        ? ppeItems.map((item) => ({
            ...blankRow(item.id),
            quantity: String(item.quantity),
            propertyNo: item.stock_number || "",
            unitCost: String(item.acquisition_cost || 0),
          }))
        : [blankRow(ppeItems[0]?.id || "")],
    );
  }

  function loadDocument(id: string) {
    const doc = matchingDocs.find((entry) => entry.id === id);
    if (!doc) return;
    const data = doc.form_data || {};
    setRecordId(doc.id);
    setDocNo(doc.document_no);
    setDate(data.date || today());
    setSavedStatus(doc.status);
    const nextFields = initialFields(type, data.date || today());
    for (const key of Object.keys(nextFields))
      nextFields[key] = String(data[key] ?? nextFields[key] ?? "");
    setFields(nextFields);
    setRows(
      Array.isArray(data.items) && data.items.length
        ? data.items.map((row: any) => ({ ...blankRow(), ...row }))
        : [blankRow()],
    );
  }

  function loadParForm(id: string) {
    const par = parForms.find((entry) => entry.id === id);
    if (!par) return;
    const createdDate = String(par.created_at || today()).slice(0, 10);
    const nextFields = initialFields("par", createdDate);
    nextFields.accountablePerson = par.accountable_person || "";
    nextFields.office = par.office || "";
    setRecordId(`par:${par.id}`);
    setDocNo(par.par_no);
    setDate(createdDate);
    setFields(nextFields);
    setSavedStatus(par.status === "cancelled" ? "cancelled" : "approved");
    setRows(
      par.lines.map((line) => ({
        ...blankRow(line.item_id),
        quantity: String(line.quantity || 1),
        unitCost: String(line.unit_cost || line.item?.acquisition_cost || 0),
        propertyNo: line.item?.stock_number || "",
        remarks: line.remarks || "",
        acquiredDate: createdDate,
      })),
    );
  }

  async function save(approve = false) {
    if (!canWrite)
      return toast.error("You do not have permission to change forms.");
    if (!docNo.trim()) return toast.error("Enter form number before saving.");
    const filled = rows.filter((row) => row.itemId);
    if (
      ["par", "ptr", "iirup", "rlsddp", "rrpe"].includes(type) &&
      filled.length === 0
    )
      return toast.error("Select at least one PPE item.");
    if (type === "ppe-ledger" && !rows[0]?.itemId)
      return toast.error("Select PPE item for ledger card.");
    if (type === "par" && !fields.accountablePerson?.trim())
      return toast.error("Enter accountable person before issuing PAR.");
    if (type === "ptr" && !fields.toAccountableOfficer?.trim())
      return toast.error("Enter receiving accountable officer.");
    if (type === "ptr" && !fields.previousParNo?.trim())
      return toast.error("Enter current PAR number before transfer.");
    if (type === "ptr" && !fields.fromAccountableOfficer?.trim())
      return toast.error("Enter current accountable officer before transfer.");
    if (type === "rrpe" && !fields.receivedBy?.trim())
      return toast.error("Enter receiving custodian.");
    if (type === "rrpe" && !fields.returnedBy?.trim())
      return toast.error("Enter returning end user.");
    if (type === "rlsddp" && !fields.circumstances?.trim())
      return toast.error("Enter incident circumstances.");
    if (type === "rlsddp" && !fields.propertyStatus)
      return toast.error("Choose property status.");
    if (
      type === "rlsddp" &&
      fields.policeNotified === "Yes" &&
      (!fields.policeStation?.trim() || !fields.policeDate)
    )
      return toast.error("Enter police station and notification date.");
    if (
      type === "rpcppe" &&
      rows.some((row) => row.itemId && !row.physicalCount.trim())
    )
      return toast.error(
        "Enter physical count for each PPE item before approval.",
      );
    setBusy(true);
    try {
      const formData = {
        ...fields,
        date,
        items: type === "rpcppe" ? rows : filled,
      };
      const effectiveDocNo =
        type === "ppe-ledger"
          ? `PPELC-${rows[0]?.itemId || "UNSELECTED"}`
          : docNo;
      const saved = await savePpeDocument({
        data: {
          document_type: type,
          document_no: effectiveDocNo,
          form_data: formData,
          created_by: userId,
          created_by_name: userName,
        },
      });
      setDocNo(effectiveDocNo);
      setRecordId(saved.id);
      setSavedStatus(saved.status);
      if (approve) {
        const result = await approvePpeDocument({
          data: { id: saved.id, created_by: userId, created_by_name: userName },
        });
        setSavedStatus(result.status);
        toast.success("Form approved; property records updated.");
      } else toast.success("Draft saved.");
      onRefresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save form.",
      );
    } finally {
      setBusy(false);
    }
  }

  function itemFor(row: PpeRow) {
    return ppeItems.find((item) => item.id === row.itemId);
  }
  function displayCell(row: PpeRow, key: string) {
    const item = itemFor(row);
    if (key === "item")
      return [item?.name, item?.description].filter(Boolean).join(" — ");
    if (key === "article") return item?.name || "";
    if (key === "description") return item?.description || "";
    if (key === "unit") return item?.unit || "";
    if (key === "amount")
      return type === "rpcppe"
        ? Number(row.unitCost || item?.acquisition_cost || 0).toFixed(2)
        : (
            Number(row.quantity || 0) *
            Number(row.unitCost || item?.acquisition_cost || 0)
          ).toFixed(2);
    if (key === "varianceValue")
      return row.physicalCount
        ? (
            (Number(row.physicalCount) - Number(row.quantity || 0)) *
            Number(row.unitCost || item?.acquisition_cost || 0)
          ).toFixed(2)
        : "";
    if (key === "disposalTotal")
      return (
        Number(row.disposalSale || 0) +
        Number(row.disposalTransfer || 0) +
        Number(row.disposalDestroy || 0) +
        Number(row.disposalOther || 0)
      ).toFixed(2);
    if (key === "balance") {
      if (row.ledgerBalance !== undefined) return row.ledgerBalance;
      if (type === "rpcppe")
        return row.physicalCount
          ? String(Number(row.physicalCount) - Number(row.quantity || 0))
          : "";
      return (
        Number(row.quantity || 0) *
          Number(row.unitCost || item?.acquisition_cost || 0) -
        Number(row.accumulatedDepreciation || 0) -
        Number(row.impairmentLoss || 0)
      ).toFixed(2);
    }
    if (key === "reference") return (row.remarks || "").split("|")[0].trim();
    if (key === "issues") return row.disposalTransfer || "";
    if (key === "repairNature") return fields.repairNature || "";
    if (key === "repairAmount") return fields.repairAmount || "";
    if (key === "propertyNo") return row.propertyNo || item?.stock_number || "";
    return String(row[key as keyof PpeRow] ?? "");
  }

  const tableRows = type === "rpcppe" ? rows : rows.filter((row) => row.itemId);
  const ledgerItemId = rows[0]?.itemId || "";
  const ledgerItem = ppeItems.find((item) => item.id === ledgerItemId);
  const ledgerMoves = movements
    .filter((movement) => movement.item_id === ledgerItemId)
    .sort((a, b) => timestampValue(a.created_at) - timestampValue(b.created_at));
  let ledgerBalance = 0;
  const ledgerPaperRows = ledgerMoves.map((movement, index) => {
    const unitCost = Number(ledgerItem?.acquisition_cost || 0);
    const amount = Number(movement.quantity || 0) * unitCost;
    ledgerBalance += movement.type === "IN" ? amount : -amount;
    return {
      ...blankRow(ledgerItemId),
      acquiredDate: dateValue(movement.created_at),
      quantity: movement.type === "IN" ? String(movement.quantity) : "",
      unitCost: String(unitCost),
      remarks: movement.remarks || "",
      accumulatedDepreciation:
        index === ledgerMoves.length - 1
          ? fields.accumulatedDepreciation || ""
          : "",
      impairmentLoss:
        index === ledgerMoves.length - 1 ? fields.impairmentLoss || "" : "",
      disposalTransfer: movement.type === "OUT" ? amount.toFixed(2) : "",
      ledgerBalance: (
        ledgerBalance -
        (index === ledgerMoves.length - 1
          ? Number(fields.accumulatedDepreciation || 0) +
            Number(fields.impairmentLoss || 0)
          : 0)
      ).toFixed(2),
    };
  });
  const paperRows =
    type === "ppe-ledger"
      ? ledgerPaperRows
      : type === "rpcppe" && tableRows.length === 0
        ? ppeItems.map((item) => ({
            ...blankRow(item.id),
            quantity: String(item.quantity),
            propertyNo: item.stock_number || "",
            unitCost: String(item.acquisition_cost || 0),
            physicalCount: "",
          }))
        : tableRows;

  return (
    <div className="ppe-document-flow grid gap-4 xl:grid-cols-[minmax(310px,0.72fr)_minmax(0,1.28fr)]">
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">{title.title}</h2>
            <p className="text-xs text-muted-foreground">
              Fields follow {title.appendix} workbook and instruction sheet.
            </p>
          </div>
          <button className="flow-header-btn" type="button" onClick={startNew}>
            New form
          </button>
        </div>
        {(matchingDocs.length > 0 ||
          (type === "par" && parForms.length > 0)) && (
          <label className="mb-3 block text-xs font-medium">
            Saved forms
            <select
              className="ppe-field mt-1"
              value={recordId}
              onChange={(event) => {
                const id = event.target.value;
                if (!id) startNew();
                else if (id.startsWith("par:")) loadParForm(id.slice(4));
                else loadDocument(id);
              }}
            >
              <option value="">Start a new form</option>
              {type === "par" && (
                <optgroup label="Issued PARs">
                  {parForms.map((par) => (
                    <option key={`par:${par.id}`} value={`par:${par.id}`}>
                      {par.par_no} · {par.accountable_person || "Unassigned"} ·{" "}
                      {par.status}
                    </option>
                  ))}
                </optgroup>
              )}
              {matchingDocs.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.document_no} · {doc.status}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="ppe-label">
            Form number
            <input
              className="ppe-field"
              value={docNo}
              disabled={isReadOnly && Boolean(recordId)}
              onChange={(event) => setDocNo(event.target.value)}
            />
          </label>
          <label className="ppe-label">
            Date
            <input
              className="ppe-field"
              type="date"
              value={date}
              disabled={isReadOnly}
              onChange={(event) => {
                setDate(event.target.value);
                updateField("date", event.target.value);
              }}
            />
          </label>
          {FIELD_SETS[type].map((field) => (
            <label className="ppe-label" key={field.key}>
              {field.label}
              {field.key === "fundCluster" ? (
                <FundClusterControl
                  value={fields[field.key] || ""}
                  onChange={updateFundCluster}
                  editable={!isReadOnly}
                  options={fundClusterOptions}
                  className="ppe-field"
                />
              ) : field.kind === "select" ? (
                <select
                  className="ppe-field"
                  value={fields[field.key] || ""}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    updateField(field.key, event.target.value)
                  }
                >
                  <option value="">Select…</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="ppe-field"
                  type={field.kind === "date" ? "date" : "text"}
                  value={fields[field.key] || ""}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    updateField(field.key, event.target.value)
                  }
                />
              )}
            </label>
          ))}
        </div>

        {!["ppe-ledger"].includes(type) && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Property items</h3>
              {type !== "rpcppe" && (
                <button
                  className="flow-header-btn"
                  disabled={isReadOnly}
                  type="button"
                  onClick={addRow}
                >
                  <Plus className="h-4 w-4" /> Add item
                </button>
              )}
            </div>
            <div className="space-y-3">
              {rows.map((row, index) => (
                <div
                  className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-2"
                  key={`${row.itemId}-${index}`}
                >
                  {type !== "rpcppe" && (
                    <label className="ppe-label sm:col-span-2">
                      PPE item
                      <select
                        className="ppe-field"
                        value={row.itemId}
                        disabled={isReadOnly}
                        onChange={(event) => {
                          const item = ppeItems.find(
                            (entry) => entry.id === event.target.value,
                          );
                          updateRow(index, {
                            itemId: event.target.value,
                            propertyNo: item?.stock_number || "",
                            unitCost: String(item?.acquisition_cost || 0),
                            quantity: "1",
                          });
                        }}
                      >
                        <option value="">Select PPE…</option>
                        {selectableItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.stock_number ? `${item.stock_number} — ` : ""}
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {(type === "rpcppe"
                    ? [
                        {
                          key: "physicalCount",
                          label: "Physical count quantity",
                        },
                        {
                          key: "remarks",
                          label: "Whereabouts / condition / remarks",
                        },
                      ]
                    : type === "iirup"
                      ? [
                          { key: "quantity", label: "Unserviceable quantity" },
                          {
                            key: "acquiredDate",
                            label: "Date acquired",
                            kind: "date",
                          },
                          {
                            key: "accumulatedDepreciation",
                            label: "Accumulated depreciation",
                          },
                          {
                            key: "impairmentLoss",
                            label: "Accumulated impairment losses",
                          },
                          { key: "disposalSale", label: "Sale value" },
                          { key: "disposalTransfer", label: "Transfer value" },
                          {
                            key: "disposalDestroy",
                            label: "Destruction value",
                          },
                          { key: "disposalOther", label: "Other disposal" },
                          { key: "appraisedValue", label: "Appraised value" },
                          { key: "receiptNo", label: "Official receipt no." },
                          { key: "saleAmount", label: "Sales amount" },
                          { key: "remarks", label: "Condition / remarks" },
                        ]
                      : [
                          { key: "quantity", label: "Quantity" },
                          { key: "propertyNo", label: "Property number" },
                          {
                            key: "acquiredDate",
                            label: "Date acquired",
                            kind: "date",
                          },
                          { key: "unitCost", label: "Unit cost" },
                          ...(type === "rrpe"
                            ? [{ key: "endUser", label: "End-user" }]
                            : []),
                          {
                            key: "remarks",
                            label:
                              type === "ptr" ? "Condition of PPE" : "Remarks",
                          },
                        ]
                  ).map((field: any) => (
                    <label className="ppe-label" key={field.key}>
                      {field.label}
                      <input
                        className="ppe-field"
                        type={field.kind === "date" ? "date" : "text"}
                        value={(row as any)[field.key] || ""}
                        disabled={isReadOnly}
                        onChange={(event) =>
                          updateRow(index, { [field.key]: event.target.value })
                        }
                      />
                    </label>
                  ))}
                  {type !== "rpcppe" && !isReadOnly && (
                    <button
                      className="flow-header-btn justify-self-start"
                      type="button"
                      onClick={() => removeRow(index)}
                    >
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {type === "ppe-ledger" && (
          <label className="ppe-label mt-4">
            PPE item
            <select
              className="ppe-field"
              value={ledgerItemId}
              onChange={(event) =>
                setRows([{ ...blankRow(event.target.value) }])
              }
            >
              <option value="">Select PPE…</option>
              {ppeItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.stock_number ? `${item.stock_number} — ` : ""}
                  {item.name}
                </option>
              ))}
            </select>
            <span className="text-xs font-normal text-muted-foreground">
              Movement rows come from IAR receipts and RIS issues.
            </span>
          </label>
        )}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          <button
            className="flow-header-btn"
            disabled={busy || isReadOnly}
            type="button"
            onClick={() => save(false)}
          >
            <Save className="h-4 w-4" /> Save draft
          </button>
          <button
            className="flow-primary"
            disabled={busy || isReadOnly}
            type="button"
            onClick={() => save(true)}
          >
            <Check className="h-4 w-4" />{" "}
            {busy ? "Saving…" : "Approve and post"}
          </button>
          {savedStatus === "approved" && (
            <span className="inline-flex items-center gap-1 self-center text-xs font-medium text-emerald-700">
              <Check className="h-4 w-4" /> Approved
            </span>
          )}
        </div>
        {!canWrite && (
          <p className="mt-3 text-xs text-amber-700">
            Read-only: your role cannot edit forms.
          </p>
        )}
      </section>

      <section className="min-w-0 overflow-x-auto rounded-lg border border-border bg-muted/30 p-3 sm:p-5">
        <div
          className={`flow-paper ${orientation} ppe-document-paper ${type}`}
          style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
        >
          <div className="flex justify-between text-[10px]">
            <span>
              {type === "ppe-ledger" ? "171" : type === "par" ? "" : ""}
            </span>
            <span>{title.appendix}</span>
          </div>
          <h1>{title.title}</h1>
          {type === "rpcppe" && (
            <div className="text-center text-xs font-semibold">
              {fields.ppeType || "(Type of Property, Plant and Equipment)"}
            </div>
          )}
          <div className="ppe-paper-info">
            <div>
              <b>Entity Name:</b> {fields.entityName || ENTITY}
            </div>
            <div>
              <b>Fund Cluster:</b> {fields.fundCluster || ""}
            </div>
            <div>
              <b>
                {type === "iirup"
                  ? "As at:"
                  : type === "rpcppe"
                    ? "As of:"
                    : "Date:"}
              </b>{" "}
              {date}
            </div>
            {type === "ppe-ledger" && (
              <>
                <div>
                  <b>Property, Plant and Equipment:</b> {ledgerItem?.name || ""}
                </div>
                <div>
                  <b>Property Number:</b> {ledgerItem?.stock_number || ""}
                </div>
                <div>
                  <b>Object Account Code:</b> {fields.objectAccountCode}
                </div>
                <div>
                  <b>Estimated Useful Life:</b> {fields.usefulLife}
                </div>
                <div>
                  <b>Rate of Depreciation:</b> {fields.depreciationRate}
                </div>
                <div>
                  <b>Description:</b> {ledgerItem?.description || ""}
                </div>
              </>
            )}
            {type === "rpcppe" && (
              <div className="ppe-paper-wide">
                <b>Accountable officer:</b> {fields.accountableOfficer} &nbsp;{" "}
                <b>Designation:</b> {fields.designation} &nbsp; <b>Station:</b>{" "}
                {fields.station} &nbsp; <b>Date of assumption:</b>{" "}
                {fields.dateAssumption}
              </div>
            )}
            {type === "rlsddp" && (
              <div className="ppe-paper-wide">
                <b>Department / office:</b> {fields.departmentOffice} &nbsp;{" "}
                <b>Accountable officer:</b> {fields.accountableOfficer} &nbsp;{" "}
                <b>Designation:</b> {fields.designation} &nbsp;{" "}
                <b>PAR No./Date:</b> {fields.parNo} / {fields.parDate} &nbsp;{" "}
                <b>Police notified:</b> {fields.policeNotified} &nbsp;{" "}
                <b>Station / date:</b> {fields.policeStation} /{" "}
                {fields.policeDate} &nbsp; <b>Status:</b>{" "}
                {fields.propertyStatus}
              </div>
            )}
            {type === "ptr" && (
              <div className="ppe-paper-wide">
                <b>From accountable officer / agency / fund cluster:</b>{" "}
                {fields.fromAccountableOfficer}
                <br />
                <b>To accountable officer / agency / fund cluster:</b>{" "}
                {fields.toAccountableOfficer}
                <br />
                <b>Transfer type:</b> {fields.transferType} &nbsp;{" "}
                <b>Reason:</b> {fields.reasonForTransfer}
              </div>
            )}
            {type === "par" && (
              <div className="ppe-paper-wide">
                <b>PAR No.:</b> {docNo} &nbsp; <b>Received by:</b>{" "}
                {fields.accountablePerson} &nbsp; <b>Office:</b> {fields.office}
              </div>
            )}
            {type === "rrpe" && (
              <div className="ppe-paper-wide">
                This is to acknowledge receipt of Property/Equipment.
              </div>
            )}
            {type === "iirup" && (
              <div className="ppe-paper-wide">
                <b>Accountable officer:</b> {fields.accountableOfficer} &nbsp;{" "}
                <b>Designation:</b> {fields.designation} &nbsp; <b>Station:</b>{" "}
                {fields.station}
              </div>
            )}
          </div>
          {type === "rlsddp" && (
            <div className="ppe-paper-note">
              <b>Circumstances:</b> {fields.circumstances}
            </div>
          )}
          {type === "iirup" && (
            <div className="ppe-paper-band">
              <b>INVENTORY</b>
              <span />
              <b>INSPECTION AND DISPOSAL</b>
            </div>
          )}
          {type === "rpcppe" && (
            <div className="ppe-paper-band">
              <b>ARTICLE</b>
              <span />
              <b>DESCRIPTION</b>
            </div>
          )}
          <table className="paper-grid ppe-paper-table">
            <thead>
              {type === "ppe-ledger" ? (
                <>
                  <tr>
                    <th rowSpan={2}>Date</th>
                    <th rowSpan={2}>Reference</th>
                    <th colSpan={3}>Receipt</th>
                    <th rowSpan={2}>Accumulated Depreciation</th>
                    <th rowSpan={2}>Accumulated Impairment Losses</th>
                    <th rowSpan={2}>Issues / Transfers / Adjustments</th>
                    <th rowSpan={2}>Adjusted Cost</th>
                    <th colSpan={2}>Repair History</th>
                  </tr>
                  <tr>
                    <th>Qty.</th>
                    <th>Unit Cost</th>
                    <th>Total Cost</th>
                    <th>Nature of Repair</th>
                    <th>Amount</th>
                  </tr>
                </>
              ) : (
                <tr>
                  {COLUMNS[type].map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {padRows(
                paperRows,
                type === "iirup"
                  ? 18
                  : type === "par"
                    ? 35
                    : type === "rpcppe"
                      ? 20
                      : type === "ptr"
                        ? 27
                        : type === "rrpe"
                          ? 10
                          : type === "ppe-ledger"
                            ? 20
                            : 8,
              ).map((row, index) => (
                <tr key={`${row?.itemId || "blank"}-${index}`}>
                  {COLUMNS[type].map((column) => (
                    <td key={column.key}>
                      {row ? displayCell(row, String(column.key)) : ""}
                    </td>
                  ))}
                </tr>
              ))}
              {type === "iirup" && (
                <tr className="ppe-total-row">
                  {COLUMNS.iirup.map((column, index) => (
                    <td key={column.key}>
                      {index === 0
                        ? "TOTAL"
                        : column.key === "amount"
                          ? paperRows
                              .reduce(
                                (sum, row) =>
                                  sum +
                                  Number(row.quantity || 0) *
                                    Number(row.unitCost || 0),
                                0,
                              )
                              .toFixed(2)
                          : column.key === "disposalTotal"
                            ? paperRows
                                .reduce(
                                  (sum, row) =>
                                    sum +
                                    Number(row.disposalSale || 0) +
                                    Number(row.disposalTransfer || 0) +
                                    Number(row.disposalDestroy || 0) +
                                    Number(row.disposalOther || 0),
                                  0,
                                )
                                .toFixed(2)
                            : ""}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
          {type === "rrpe" && (
            <div className="ppe-paper-signatures">
              <div>
                <b>Returned by:</b>
                <br />
                {fields.returnedBy || "____________________________"}
                <br />
                End User
                <br />
                <br />
                Date: __________
              </div>
              <div>
                <b>Received by:</b>
                <br />
                {fields.receivedBy || "____________________________"}
                <br />
                Head, Property and/or Supply Division Unit
                <br />
                <br />
                Date: __________
              </div>
            </div>
          )}
          {type === "rlsddp" && (
            <div className="ppe-paper-note">
              I hereby certify that the item/s and circumstances stated above
              are true and correct.
              <br />
              <br />
              <b>Government-issued ID:</b> {fields.governmentId} &nbsp;{" "}
              <b>ID No.:</b> {fields.idNumber} &nbsp; <b>Date Issued:</b>{" "}
              {fields.idDateIssued}
            </div>
          )}
          {type === "ptr" && (
            <div className="ppe-paper-note">
              <b>Reason for Transfer:</b> {fields.reasonForTransfer}
            </div>
          )}
          <div className="ppe-paper-signatures">
            {SIGNATURES[type].map((signature) => (
              <div key={signature}>
                <b>{signature}:</b>
                <br />
                {fields[signatureKey(signature)] ||
                  "____________________________"}
                <br />
                <small>Signature over printed name / designation</small>
                <br />
                <br />
                Date: __________
              </div>
            ))}
          </div>
          <div className="ppe-paper-footer">
            {type === "rpcppe"
              ? "Submit to the Auditor and Accounting Division/Unit by January 31."
              : type === "iirup"
                ? "Submit after disposal is completed; original supports accounting adjustment."
                : ""}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock3 className="h-4 w-4" />
          {savedStatus === "approved"
            ? "Approved record"
            : recordId
              ? "Saved draft"
              : "Preview updates as you edit"}
        </div>
      </section>
      <style>{PPE_PAPER_STYLES}</style>
    </div>
  );
}

function signatureKey(label: string) {
  return (
    (
      {
        "Received by": "receivedBy",
        "Issued by": "issuedBy",
        "Approved by": "approvedBy",
        "Released / Issued by": "releasedBy",
        "Certified correct by": "certifiedBy",
        "Verified by": "verifiedBy",
        "Requested by": "accountableOfficer",
        "Inspected by": "inspectionOfficer",
        Witness: "witness",
        "Accountable officer": "accountableOfficer",
        "Noted by / immediate supervisor": "supervisor",
        "Notary public": "notary",
        "Returned by": "returnedBy",
        "Recorded by": "recordedBy",
        "Reviewed by": "reviewedBy",
      } as Record<string, string>
    )[label] || ""
  );
}

function padRows<T>(rows: T[], count: number): Array<T | null> {
  return [
    ...rows,
    ...Array.from({ length: Math.max(0, count - rows.length) }, () => null),
  ];
}

const PPE_PAPER_STYLES = `
.ppe-document-flow .ppe-label{display:grid;gap:5px;font-size:12px;font-weight:600;color:hsl(var(--foreground))}
.ppe-document-flow .ppe-field{width:100%;min-height:38px;border:1px solid hsl(var(--border));border-radius:6px;background:hsl(var(--background));padding:8px 10px;font-size:13px;font-weight:400;color:hsl(var(--foreground))}
.ppe-document-flow .ppe-field:disabled{background:hsl(var(--muted));color:hsl(var(--muted-foreground))}
.ppe-document-paper{max-width:1100px;min-width:700px;padding:30px 34px!important;color:#111;background:white;box-shadow:0 1px 5px #0002;font-family:Arial,sans-serif}
.ppe-document-paper h1{text-align:center;font:bold 17px Arial;margin:18px 0 12px}
.ppe-document-paper .ppe-paper-info{display:grid;grid-template-columns:1fr 1fr;gap:7px 16px;font-size:10px;margin:12px 0}
.ppe-document-paper .ppe-paper-wide{grid-column:1/-1}
.ppe-document-paper .ppe-paper-note{font-size:10px;line-height:1.5;padding:10px 0;white-space:pre-wrap}
.ppe-document-paper .ppe-paper-band{display:flex;justify-content:space-around;background:#f3f3f3;border:1px solid #111;padding:5px;font-size:9px}
.ppe-document-paper .ppe-paper-table{width:100%;table-layout:fixed;font-size:8px}
.ppe-document-paper .ppe-paper-table th,.ppe-document-paper .ppe-paper-table td{border:1px solid #222;padding:4px;vertical-align:top;overflow-wrap:anywhere}
.ppe-document-paper .ppe-paper-table th{text-align:center;font-weight:700}
.ppe-document-paper .ppe-paper-table td{height:23px}
.ppe-document-paper .ppe-total-row td{font-weight:bold}
.ppe-document-paper .ppe-paper-signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:36px;text-align:center;font-size:9px;break-inside:avoid}
.ppe-document-paper.rrpe .ppe-paper-signatures{grid-template-columns:1fr 1fr}
.ppe-document-paper .ppe-paper-signatures small{font-size:8px}
.ppe-document-paper .ppe-paper-footer{margin-top:16px;text-align:center;font-size:8px}
@media print{.ppe-document-flow{display:block!important}.ppe-document-paper{box-shadow:none;min-width:0;width:100%;padding:12mm!important;transform:none!important}.ppe-document-paper.landscape{width:100%;max-width:none}.ppe-document-paper.portrait{max-width:210mm}.ppe-document-paper table{break-inside:auto}.ppe-document-paper tr{break-inside:avoid;break-after:auto}}
`;
