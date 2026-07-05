import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  FileText,
  LayoutPanelLeft,
  Plus,
  Printer,
  Save,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/_app/requisitions")({
  head: () => ({ meta: [{ title: "Requisitions - Supplify" }] }),
  component: Requisitions,
});

type Mode = "preview" | "split";
type FormLayout = "request" | "ris";
type PaperOrientation = "portrait" | "landscape";
type Errors = Record<string, string>;

type RequisitionItem = {
  id: string;
  particulars: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  remarks: string;
};

type RequisitionState = {
  formLayout: FormLayout;
  paperOrientation: PaperOrientation;
  date: string;
  requisitionNo: string;
  fundCluster: string;
  responsibilityCenterCode: string;
  risNo: string;
  requestedBy: string;
  department: string;
  purpose: string;
  remarks: string;
  approvers: {
    approvedBy: string;
    receivedBy: string;
    chairperson: string;
    viceChairperson: string;
  };
  items: RequisitionItem[];
};

type SavedRequisition = RequisitionState & {
  id: string;
  status: "Draft" | "Saved";
  savedAt: string;
  grandTotal: number;
};

const blankItem = (): RequisitionItem => ({
  id: createId(),
  particulars: "",
  quantity: "",
  unit: "",
  unitPrice: "",
  remarks: "",
});

const initialForm = (requestedBy = ""): RequisitionState => ({
  formLayout: "request",
  paperOrientation: "portrait",
  date: new Date().toISOString().slice(0, 10),
  requisitionNo: "",
  fundCluster: "",
  responsibilityCenterCode: "",
  risNo: "",
  requestedBy,
  department: "",
  purpose: "",
  remarks: "",
  approvers: {
    approvedBy: "",
    receivedBy: "",
    chairperson: "",
    viceChairperson: "",
  },
  items: Array.from({ length: 5 }, blankItem),
});

function Requisitions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("preview");
  const [form, setForm] = useState<RequisitionState>(() =>
    initialForm(user?.user_metadata?.full_name || user?.email || ""),
  );
  const [errors, setErrors] = useState<Errors>({});
  const [records, setRecords] = useState<SavedRequisition[]>(() => loadRecords());
  const [previewZoom, setPreviewZoom] = useState(0.9);
  const requesterName = user?.user_metadata?.full_name || user?.email || "";

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["items"],
    queryFn: async () =>
      (
        await supabase
          .from("items")
          .select("id,name,unit,quantity,item_type")
          .order("name")
      ).data ?? [],
  });

  const validItems = useMemo(() => getValidItems(form.items), [form.items]);
  const grandTotal = useMemo(() => sumItems(form.items), [form.items]);
  const latestRequest = records[0];

  function updateField<K extends keyof RequisitionState>(field: K, value: RequisitionState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateApprover(field: keyof RequisitionState["approvers"], value: string) {
    setForm((current) => ({
      ...current,
      approvers: { ...current.approvers, [field]: value },
    }));
  }

  function updateItem(id: string, patch: Partial<RequisitionItem>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function addItem() {
    setForm((current) => ({ ...current, items: [...current.items, blankItem()] }));
  }

  function deleteItem(id: string) {
    setForm((current) => ({
      ...current,
      items: current.items.length > 1 ? current.items.filter((item) => item.id !== id) : current.items,
    }));
  }

  function validate() {
    const next: Errors = {};
    if (!form.date) next.date = "Date is required.";
    if (!form.requisitionNo.trim()) next.requisitionNo = "Requisition number is required.";
    if (!form.purpose.trim()) next.purpose = "Purpose is required.";
    if (validItems.length === 0) next.items = "Add at least one item with particulars and quantity greater than 0.";
    form.items.forEach((item, index) => {
      const hasAnyValue = item.particulars.trim() || item.quantity || item.unit || item.unitPrice;
      if (hasAnyValue && item.particulars.trim() && Number(item.quantity) <= 0) {
        next[`item-${item.id}`] = `Row ${index + 1}: quantity must be greater than 0.`;
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function persistRecord(status: SavedRequisition["status"]) {
    const record: SavedRequisition = {
      ...form,
      items: form.items.map((item) => ({ ...item })),
      id: createId(),
      status,
      savedAt: new Date().toISOString(),
      grandTotal,
    };
    const next = [record, ...records].slice(0, 50);
    setRecords(next);
    localStorage.setItem("requisition-records", JSON.stringify(next));
    return record;
  }

  function saveDraft() {
    if (!validate()) {
      toast.error("Resolve the highlighted fields before saving a draft.");
      return;
    }
    persistRecord("Draft");
    toast.success("Draft saved");
  }

  function saveCurrentDraftQuietly() {
    persistRecord("Draft");
    toast.success("Current input saved as draft");
  }

  function saveAndPrint() {
    if (!validate()) {
      toast.error("Resolve the highlighted fields before saving.");
      return;
    }
    const summary = [
      `Requisition number: ${form.requisitionNo}`,
      `Date: ${form.date}`,
      `Purpose: ${form.purpose}`,
      `Items: ${validItems.length}`,
      `Grand total: ${money(grandTotal)}`,
    ].join("\n");
    if (!window.confirm(`Save and print this request?\n\n${summary}`)) return;

    const record = persistRecord("Saved");
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      toast.error("Allow pop-ups to open the printable request form.");
      return;
    }
    printWindow.document.write(printHtml(record));
    printWindow.document.close();
    toast.success("Request saved");
  }

  function cancelForm() {
    if (!window.confirm("Clear the current requisition form?")) return;
    setForm(initialForm(requesterName));
    setErrors({});
  }

  function loadRecord(record: SavedRequisition) {
    if (hasMeaningfulInput(form, requesterName)) {
      const shouldSave = window.confirm(
        "There is data in the current form. Save it as a draft before loading this requisition?\n\nOK saves it first. Cancel discards the current input and loads the selected row.",
      );
      if (shouldSave) saveCurrentDraftQuietly();
    }
    setForm(recordToForm(record));
    setErrors({});
    setMode("preview");
  }

  function deleteRecord(id: string) {
    const next = records.filter((record) => record.id !== id);
    setRecords(next);
    localStorage.setItem("requisition-records", JSON.stringify(next));
  }

  async function deleteInventoryItem(id: string) {
    if (!window.confirm("Delete this inventory item permanently?")) return;
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Inventory item deleted");
    queryClient.invalidateQueries({ queryKey: ["items"] });
  }

  return (
    <div>
      <PageHeader
        title="Requisitions"
        subtitle="Create request forms from preview or split view"
        actions={
          <>
            <button onClick={cancelForm} className="office-btn requisition-action">
              <X className="h-4 w-4" /> Cancel
            </button>
            <button onClick={saveDraft} className="office-btn requisition-action">
              <Save className="h-4 w-4" /> Save Draft
            </button>
            <button onClick={saveAndPrint} className="office-btn-primary requisition-action">
              <Printer className="h-4 w-4" /> Save & Print
            </button>
          </>
        }
      />

      <div className="space-y-4 p-3 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              Grand Total: <span className="font-semibold text-foreground">{money(grandTotal)}</span>
            </div>
            <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border bg-card p-1 sm:inline-flex">
              {[
                { value: "request", label: "Request Form" },
                { value: "ris", label: "RIS Slip" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField("formLayout", option.value as FormLayout)}
                  className={`rounded px-3 py-2 text-sm font-medium ${
                    form.formLayout === option.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid w-full grid-cols-2 overflow-hidden rounded-md border border-border bg-card p-1 sm:inline-flex sm:w-auto">
            {[
              { value: "preview", label: "Form Preview", icon: FileText },
              { value: "split", label: "Split View", icon: LayoutPanelLeft },
            ].map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setMode(option.value as Mode)}
                  className={`flex min-w-0 items-center justify-center gap-1.5 rounded px-2 py-2 text-xs font-medium sm:flex-initial sm:gap-2 sm:px-3 sm:text-sm ${
                    mode === option.value
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
        </div>

        <div
          className={
            mode === "split"
              ? "space-y-4"
              : "grid gap-4 xl:grid-cols-[minmax(0,1040px)_minmax(380px,1fr)] xl:items-start"
          }
        >
          <main className="min-w-0">
            {mode === "preview" && (
              <PaperPreview
                form={form}
                errors={errors}
                editable
                grandTotal={grandTotal}
                onField={updateField}
                onApprover={updateApprover}
                onItem={updateItem}
                onAddItem={addItem}
                onDeleteItem={deleteItem}
                zoom={previewZoom}
                onZoomChange={setPreviewZoom}
              />
            )}

            {mode === "split" && (
              <div className="grid gap-4 xl:grid-cols-[minmax(460px,0.9fr)_minmax(520px,1.1fr)]">
                <QuickEntry
                  form={form}
                  errors={errors}
                  grandTotal={grandTotal}
                  onField={updateField}
                  onApprover={updateApprover}
                  onItem={updateItem}
                  onAddItem={addItem}
                  onDeleteItem={deleteItem}
                  compact
                />
                <PaperPreview
                  form={form}
                  errors={{}}
                  grandTotal={grandTotal}
                  onField={updateField}
                  onApprover={updateApprover}
                  onItem={updateItem}
                  onAddItem={addItem}
                  onDeleteItem={deleteItem}
                  zoom={previewZoom}
                  onZoomChange={setPreviewZoom}
                />
              </div>
            )}

            {Object.values(errors).length > 0 && (
              <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {Object.values(errors).map((error) => (
                  <div key={error}>{error}</div>
                ))}
              </div>
            )}

          </main>

          <RightPanel
            inventoryItems={inventoryItems}
            records={records}
            activeItems={validItems.length}
            latestRequest={latestRequest}
            onDeleteRecord={deleteRecord}
            onDeleteInventoryItem={deleteInventoryItem}
            onLoadRecord={loadRecord}
            placement={mode === "split" ? "bottom" : "side"}
          />
        </div>
      </div>

      <style>{officeStyles}</style>
    </div>
  );
}

function QuickEntry({
  form,
  errors,
  grandTotal,
  onField,
  onApprover,
  onItem,
  onAddItem,
  onDeleteItem,
  compact = false,
}: {
  form: RequisitionState;
  errors: Errors;
  grandTotal: number;
  onField: <K extends keyof RequisitionState>(field: K, value: RequisitionState[K]) => void;
  onApprover: (field: keyof RequisitionState["approvers"], value: string) => void;
  onItem: (id: string, patch: Partial<RequisitionItem>) => void;
  onAddItem: () => void;
  onDeleteItem: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold sm:text-lg">Quick Entry</h2>
        <div className="shrink-0 text-xs font-semibold tabular-nums sm:text-sm">{money(grandTotal)}</div>
      </div>

      <div className={`grid gap-4 ${compact ? "" : "lg:grid-cols-[360px_minmax(0,1fr)]"}`}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField label="Date" error={errors.date}>
              <input className="admin-input" type="date" value={form.date} onChange={(e) => onField("date", e.target.value)} />
            </AdminField>
            <AdminField label="Requisition No." error={errors.requisitionNo}>
              <input className="admin-input" placeholder="REQ-2026-001" value={form.requisitionNo} onChange={(e) => onField("requisitionNo", e.target.value)} />
            </AdminField>
          </div>
          {form.formLayout === "ris" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AdminField label="Fund Cluster">
                <input className="admin-input" placeholder="01" value={form.fundCluster} onChange={(e) => onField("fundCluster", e.target.value)} />
              </AdminField>
              <AdminField label="RIS No.">
                <input className="admin-input" placeholder="2026-06-013" value={form.risNo} onChange={(e) => onField("risNo", e.target.value)} />
              </AdminField>
              <AdminField label="Responsibility Center Code">
                <input className="admin-input" placeholder="16 009 03 0001 07" value={form.responsibilityCenterCode} onChange={(e) => onField("responsibilityCenterCode", e.target.value)} />
              </AdminField>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField label="Requested By">
              <input className="admin-input" placeholder="Full name" value={form.requestedBy} onChange={(e) => onField("requestedBy", e.target.value)} />
            </AdminField>
            <AdminField label="Department">
              <input className="admin-input" placeholder="Department / section" value={form.department} onChange={(e) => onField("department", e.target.value)} />
            </AdminField>
          </div>
          <AdminField label="Purpose" error={errors.purpose}>
            <textarea rows={compact ? 2 : 3} className="admin-input" placeholder="Brief reason for the request" value={form.purpose} onChange={(e) => onField("purpose", e.target.value)} />
          </AdminField>
          <AdminField label="Remarks">
            <textarea rows={compact ? 2 : 3} className="admin-input" placeholder="Optional notes, delivery instructions, or reference" value={form.remarks} onChange={(e) => onField("remarks", e.target.value)} />
          </AdminField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField label="Approved By">
              <input className="admin-input" placeholder="Approver name" value={form.approvers.approvedBy} onChange={(e) => onApprover("approvedBy", e.target.value)} />
            </AdminField>
            <AdminField label="Received By">
              <input className="admin-input" placeholder="Receiver name" value={form.approvers.receivedBy} onChange={(e) => onApprover("receivedBy", e.target.value)} />
            </AdminField>
            <AdminField label="Chairperson">
              <input className="admin-input" placeholder="Chairperson name" value={form.approvers.chairperson} onChange={(e) => onApprover("chairperson", e.target.value)} />
            </AdminField>
            <AdminField label="Vice Chairperson">
              <input className="admin-input" placeholder="Vice chairperson name" value={form.approvers.viceChairperson} onChange={(e) => onApprover("viceChairperson", e.target.value)} />
            </AdminField>
          </div>
        </div>

        <div className="mobile-table-scroll min-w-0 overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left">Item/Particulars</th>
                <th className="px-2 py-2 text-right">Quantity</th>
                <th className="px-2 py-2 text-left">Unit</th>
                <th className="px-2 py-2 text-right">Unit Price</th>
                <th className="px-2 py-2 text-right">Amount</th>
                <th className="px-2 py-2 text-left">Remarks</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="p-1">
                    <input className="table-input" placeholder="Bond paper A4" value={item.particulars} onChange={(e) => onItem(item.id, { particulars: e.target.value })} />
                  </td>
                  <td className="p-1">
                    <input className="table-input text-right" placeholder="0" type="number" min="0" value={item.quantity} onChange={(e) => onItem(item.id, { quantity: e.target.value })} />
                  </td>
                  <td className="p-1">
                    <input className="table-input" placeholder="pcs" value={item.unit} onChange={(e) => onItem(item.id, { unit: e.target.value })} />
                  </td>
                  <td className="p-1">
                    <input className="table-input text-right" placeholder="0.00" type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => onItem(item.id, { unitPrice: e.target.value })} />
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">{money(itemAmount(item))}</td>
                  <td className="p-1">
                    <input className="table-input" placeholder="Optional" value={item.remarks} onChange={(e) => onItem(item.id, { remarks: e.target.value })} />
                  </td>
                  <td className="p-1 text-right">
                    <button onClick={() => onDeleteItem(item.id)} className="icon-btn text-destructive" title="Delete item">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/40 font-semibold">
                <td colSpan={4} className="px-2 py-2 text-right">Grand Total</td>
                <td className="px-2 py-2 text-right tabular-nums">{money(grandTotal)}</td>
                <td colSpan={2} className="px-2 py-2">
                  <button onClick={onAddItem} className="office-btn py-1">
                    <Plus className="h-3.5 w-3.5" /> Add Item
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}

function PaperPreview({
  form,
  errors,
  editable = false,
  grandTotal,
  onField,
  onApprover,
  onItem,
  onAddItem,
  onDeleteItem,
  zoom,
  onZoomChange,
}: {
  form: RequisitionState;
  errors: Errors;
  editable?: boolean;
  grandTotal: number;
  onField: <K extends keyof RequisitionState>(field: K, value: RequisitionState[K]) => void;
  onApprover: (field: keyof RequisitionState["approvers"], value: string) => void;
  onItem: (id: string, patch: Partial<RequisitionItem>) => void;
  onAddItem: () => void;
  onDeleteItem: (id: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}) {
  const isRis = form.formLayout === "ris";

  return (
    <section className="preview-shell">
      <div className="preview-toolbar">
        <div className="inline-flex overflow-hidden rounded-md border border-border bg-card p-1">
          {[
            { value: "portrait", label: "Portrait" },
            { value: "landscape", label: "Landscape" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => onField("paperOrientation", option.value as PaperOrientation)}
              className={`rounded px-3 py-1.5 text-xs font-semibold ${
                form.paperOrientation === option.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="inline-flex items-center gap-1 rounded-md border border-border bg-card p-1">
          <button className="icon-btn" title="Zoom out" onClick={() => onZoomChange(Math.max(0.6, Number((zoom - 0.1).toFixed(1))))}>
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-xs font-semibold tabular-nums">{Math.round(zoom * 100)}%</span>
          <button className="icon-btn" title="Zoom in" onClick={() => onZoomChange(Math.min(1.4, Number((zoom + 0.1).toFixed(1))))}>
            <ZoomIn className="h-4 w-4" />
          </button>
          <button className="rounded px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent" onClick={() => onZoomChange(0.9)}>
            Reset
          </button>
        </div>
      </div>

      <div className="preview-bg">
        <div className="preview-zoom" style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }}>
          {isRis ? (
            <RisPaper
              form={form}
              errors={errors}
              editable={editable}
              onField={onField}
              onApprover={onApprover}
              onItem={onItem}
              onAddItem={onAddItem}
              onDeleteItem={onDeleteItem}
            />
          ) : (
            <RequestPaper
              form={form}
              errors={errors}
              editable={editable}
              grandTotal={grandTotal}
              onField={onField}
              onApprover={onApprover}
              onItem={onItem}
              onAddItem={onAddItem}
              onDeleteItem={onDeleteItem}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function RequestPaper({
  form,
  errors,
  editable,
  grandTotal,
  onField,
  onApprover,
  onItem,
  onAddItem,
  onDeleteItem,
}: {
  form: RequisitionState;
  errors: Errors;
  editable: boolean;
  grandTotal: number;
  onField: <K extends keyof RequisitionState>(field: K, value: RequisitionState[K]) => void;
  onApprover: (field: keyof RequisitionState["approvers"], value: string) => void;
  onItem: (id: string, patch: Partial<RequisitionItem>) => void;
  onAddItem: () => void;
  onDeleteItem: (id: string) => void;
}) {
  return (
      <div className={`request-paper ${form.paperOrientation}`}>
        <div className="paper-header">
          <div className="logo-box">LOGO</div>
          <div className="org-box">
            <div className="org-name">Government Stock Manager</div>
            <div className="org-address">Administrative Services Office</div>
            <div className="org-address">Supplies and Materials Management</div>
          </div>
          <div className="form-no-box">
            <div className="text-[10px] font-bold uppercase">Form No.</div>
            <div>{editable ? <PaperInput placeholder="REQ-2026-001" value={form.requisitionNo} error={errors.requisitionNo} onChange={(value) => onField("requisitionNo", value)} /> : form.requisitionNo || "-"}</div>
          </div>
        </div>

        <div className="paper-title">Request Form</div>

        <div className="paper-fields">
          <PaperField label="Date" error={errors.date}>
            {editable ? <PaperInput type="date" value={form.date} onChange={(value) => onField("date", value)} /> : formatDate(form.date)}
          </PaperField>
          <PaperField label="Requisition No." error={errors.requisitionNo}>
            {editable ? <PaperInput placeholder="REQ-2026-001" value={form.requisitionNo} onChange={(value) => onField("requisitionNo", value)} /> : form.requisitionNo || "-"}
          </PaperField>
          <PaperField label="Total Amount Requested">
            {money(grandTotal)}
          </PaperField>
          <PaperField label="Requested By">
            {editable ? <PaperInput placeholder="Full name" value={form.requestedBy} onChange={(value) => onField("requestedBy", value)} /> : form.requestedBy || "-"}
          </PaperField>
          <PaperField label="Department">
            {editable ? <PaperInput placeholder="Department / section" value={form.department} onChange={(value) => onField("department", value)} /> : form.department || "-"}
          </PaperField>
          <PaperField label="Purpose" wide error={errors.purpose}>
            {editable ? <PaperInput placeholder="Brief reason for the request" value={form.purpose} onChange={(value) => onField("purpose", value)} /> : form.purpose || "-"}
          </PaperField>
        </div>

        <div className="overflow-x-auto">
          <table className="paper-table">
            <thead>
              <tr>
                <th>Particulars</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Unit Price</th>
                <th>Amount</th>
                {editable && <th>Delete</th>}
              </tr>
            </thead>
            <tbody>
              {form.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {editable ? <input className="paper-cell-input" placeholder="Item description" value={item.particulars} onChange={(e) => onItem(item.id, { particulars: e.target.value })} /> : item.particulars}
                  </td>
                  <td>
                    {editable ? <input className="paper-cell-input text-right" placeholder="0" type="number" min="0" value={item.quantity} onChange={(e) => onItem(item.id, { quantity: e.target.value })} /> : item.quantity}
                  </td>
                  <td>
                    {editable ? <input className="paper-cell-input" placeholder="pcs" value={item.unit} onChange={(e) => onItem(item.id, { unit: e.target.value })} /> : item.unit}
                  </td>
                  <td>
                    {editable ? <input className="paper-cell-input text-right" placeholder="0.00" type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => onItem(item.id, { unitPrice: e.target.value })} /> : money(Number(item.unitPrice || 0))}
                  </td>
                  <td className="text-right tabular-nums">{money(itemAmount(item))}</td>
                  {editable && (
                    <td className="text-center">
                      <button onClick={() => onDeleteItem(item.id)} className="icon-btn text-destructive" title="Delete row">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="text-right font-bold">Grand Total</td>
                <td className="text-right font-bold tabular-nums">{money(grandTotal)}</td>
                {editable && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>

        {editable && (
          <button onClick={onAddItem} className="office-btn mt-3">
            <Plus className="h-4 w-4" /> Add Row
          </button>
        )}

        <div className="mt-4">
          <div className="text-xs font-bold uppercase">Remarks</div>
          {editable ? (
            <textarea className="paper-remarks" rows={2} placeholder="Optional notes or reference" value={form.remarks} onChange={(e) => onField("remarks", e.target.value)} />
          ) : (
            <div className="paper-remarks min-h-12">{form.remarks}</div>
          )}
        </div>

        <SignatureGrid form={form} editable={editable} onApprover={onApprover} />
      </div>
  );
}

function RisPaper({
  form,
  errors,
  editable,
  onField,
  onApprover,
  onItem,
  onAddItem,
  onDeleteItem,
}: {
  form: RequisitionState;
  errors: Errors;
  editable: boolean;
  onField: <K extends keyof RequisitionState>(field: K, value: RequisitionState[K]) => void;
  onApprover: (field: keyof RequisitionState["approvers"], value: string) => void;
  onItem: (id: string, patch: Partial<RequisitionItem>) => void;
  onAddItem: () => void;
  onDeleteItem: (id: string) => void;
}) {
  return (
    <div className={`request-paper ris-paper ${form.paperOrientation}`}>
      <div className="ris-title">Requisition and Issue Slip</div>
      <div className="ris-meta-grid">
        <RisMeta label="Entity Name">
          <span className="font-bold">Government Stock Manager</span>
        </RisMeta>
        <RisMeta label="Fund Cluster">
          {editable ? <PaperInput placeholder="01" value={form.fundCluster} onChange={(value) => onField("fundCluster", value)} /> : form.fundCluster || "-"}
        </RisMeta>
        <RisMeta label="Division">
          {editable ? <PaperInput placeholder="Administrative Services" value={form.department} onChange={(value) => onField("department", value)} /> : form.department || "-"}
        </RisMeta>
        <RisMeta label="Responsibility Center Code">
          {editable ? <PaperInput placeholder="16 009 03 0001 07" value={form.responsibilityCenterCode} onChange={(value) => onField("responsibilityCenterCode", value)} /> : form.responsibilityCenterCode || "-"}
        </RisMeta>
        <RisMeta label="Office">
          <span>Supplies and Materials Management</span>
        </RisMeta>
        <RisMeta label="RIS No.">
          {editable ? <PaperInput placeholder="2026-06-013" value={form.risNo || form.requisitionNo} error={errors.requisitionNo} onChange={(value) => {
            onField("risNo", value);
            onField("requisitionNo", value);
          }} /> : form.risNo || form.requisitionNo || "-"}
        </RisMeta>
      </div>

      <div className="overflow-x-auto">
        <table className="ris-table">
          <thead>
            <tr>
              <th colSpan={4}>Requisition</th>
              <th colSpan={2}>Stock Available?</th>
              <th colSpan={2}>Issue</th>
              {editable && <th rowSpan={2}>Delete</th>}
            </tr>
            <tr>
              <th>Stock No.</th>
              <th>Unit</th>
              <th>Description</th>
              <th>Quantity</th>
              <th>Yes</th>
              <th>No</th>
              <th>Quantity</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {form.items.map((item, index) => {
              const quantity = Number(item.quantity || 0);
              return (
                <tr key={item.id}>
                  <td className="text-center tabular-nums">{String(index + 1).padStart(3, "0")}</td>
                  <td>
                    {editable ? <input className="paper-cell-input" placeholder="pcs" value={item.unit} onChange={(e) => onItem(item.id, { unit: e.target.value })} /> : item.unit}
                  </td>
                  <td>
                    {editable ? <input className="paper-cell-input" placeholder="Item description" value={item.particulars} onChange={(e) => onItem(item.id, { particulars: e.target.value })} /> : item.particulars}
                  </td>
                  <td>
                    {editable ? <input className="paper-cell-input text-right" placeholder="0" type="number" min="0" value={item.quantity} onChange={(e) => onItem(item.id, { quantity: e.target.value })} /> : item.quantity}
                  </td>
                  <td className="text-center">{quantity > 0 ? "/" : ""}</td>
                  <td className="text-center">{quantity <= 0 && item.particulars ? "/" : ""}</td>
                  <td className="text-right tabular-nums">{quantity > 0 ? item.quantity : ""}</td>
                  <td>
                    {editable ? <input className="paper-cell-input" placeholder="Issued / pending" value={item.remarks} onChange={(e) => onItem(item.id, { remarks: e.target.value })} /> : item.remarks}
                  </td>
                  {editable && (
                    <td className="text-center">
                      <button onClick={() => onDeleteItem(item.id)} className="icon-btn text-destructive" title="Delete row">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editable && (
        <button onClick={onAddItem} className="office-btn mt-3">
          <Plus className="h-4 w-4" /> Add Row
        </button>
      )}

      <div className="ris-purpose">
        <span className="font-bold">Purpose:</span>{" "}
        {editable ? <PaperInput placeholder="For official supplies, maintenance, or project use" value={form.purpose} error={errors.purpose} onChange={(value) => onField("purpose", value)} /> : form.purpose || "-"}
      </div>

      <RisSignatureGrid form={form} editable={editable} onField={onField} onApprover={onApprover} />
    </div>
  );
}

function RisMeta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ris-meta-cell">
      <span className="ris-meta-label">{label}:</span> {children}
    </div>
  );
}

function RisSignatureGrid({
  form,
  editable,
  onField,
  onApprover,
}: {
  form: RequisitionState;
  editable: boolean;
  onField: <K extends keyof RequisitionState>(field: K, value: RequisitionState[K]) => void;
  onApprover: (field: keyof RequisitionState["approvers"], value: string) => void;
}) {
  const signatures = [
    ["Requested by", form.requestedBy, (value: string) => onField("requestedBy", value), "TESDA Specialist"],
    ["Approved by", form.approvers.approvedBy, (value: string) => onApprover("approvedBy", value), "Head of Office"],
    ["Issued by", form.approvers.chairperson, (value: string) => onApprover("chairperson", value), "Supply Officer"],
    ["Received by", form.approvers.receivedBy, (value: string) => onApprover("receivedBy", value), "End User"],
  ] as const;

  return (
    <div className="mobile-table-scroll overflow-x-auto">
      <table className="ris-signature-table">
        <tbody>
          <tr>
            <td>Signature</td>
            {signatures.map(([label]) => <td key={label}>{label}:</td>)}
          </tr>
          <tr>
            <td>Printed Name</td>
            {signatures.map(([label, value, onChange]) => (
              <td key={label}>
                {editable ? <input className="signature-input" placeholder={label} value={value} onChange={(e) => onChange(e.target.value)} /> : value}
              </td>
            ))}
          </tr>
          <tr>
            <td>Designation</td>
            {signatures.map(([label, , , designation]) => <td key={label}>{designation}</td>)}
          </tr>
          <tr>
            <td>Date</td>
            {signatures.map(([label]) => <td key={label}>{formatDate(form.date)}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SignatureGrid({
  form,
  editable,
  onApprover,
}: {
  form: RequisitionState;
  editable: boolean;
  onApprover: (field: keyof RequisitionState["approvers"], value: string) => void;
}) {
  const signatures = [
    ["Requested By", form.requestedBy, (value: string) => undefined],
    ["Approved By", form.approvers.approvedBy, (value: string) => onApprover("approvedBy", value)],
    ["Received By", form.approvers.receivedBy, (value: string) => onApprover("receivedBy", value)],
    ["Chairperson", form.approvers.chairperson, (value: string) => onApprover("chairperson", value)],
    ["Vice Chairperson", form.approvers.viceChairperson, (value: string) => onApprover("viceChairperson", value)],
  ] as const;

  return (
    <div className="signature-grid">
      {signatures.map(([label, value, onChange]) => (
        <div key={label} className="signature-box">
          <div className="signature-line">
            {editable && label !== "Requested By" ? (
              <input className="signature-input" placeholder={label} value={value} onChange={(e) => onChange(e.target.value)} />
            ) : (
              <span>{value}</span>
            )}
          </div>
          <div className="signature-label">{label}</div>
        </div>
      ))}
    </div>
  );
}

function RightPanel({
  inventoryItems,
  records,
  activeItems,
  latestRequest,
  onDeleteRecord,
  onDeleteInventoryItem,
  onLoadRecord,
  placement = "side",
}: {
  inventoryItems: any[];
  records: SavedRequisition[];
  activeItems: number;
  latestRequest?: SavedRequisition;
  onDeleteRecord: (id: string) => void;
  onDeleteInventoryItem: (id: string) => void;
  onLoadRecord: (record: SavedRequisition) => void;
  placement?: "side" | "bottom";
}) {
  const requestCounts = useMemo(() => {
    const counts = new Map<string, number>();
    records.forEach((record) => {
      record.items.forEach((item) => {
        const key = item.particulars.trim().toLowerCase();
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    });
    return counts;
  }, [records]);
  const savedRecords = records.filter((record) => record.status === "Saved");
  const draftRecords = records.filter((record) => record.status === "Draft");
  const latestSaved = savedRecords[0];
  const isBottom = placement === "bottom";

  return (
    <aside className="space-y-4">
      <div className={`grid grid-cols-2 gap-3 ${isBottom ? "xl:grid-cols-4" : ""}`}>
        <SummaryCard label="Active Items" value={activeItems} />
        <SummaryCard label="Request Forms" value={savedRecords.length} />
        <SummaryCard label="Requested This Month" value={savedRecords.filter((record) => sameMonth(record.savedAt)).length} />
        <SummaryCard label="Latest Request" value={latestSaved?.requisitionNo || latestRequest?.requisitionNo || "-"} />
      </div>

      <div className={isBottom ? "grid gap-4 xl:grid-cols-2" : "space-y-4"}>
        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-3 py-2 text-sm font-semibold">Recent Requisitions</div>
          <div className="mobile-table-scroll max-h-72 overflow-auto">
            <table className="min-w-[520px] w-full text-xs">
              <thead className="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left">Requisition No.</th>
                  <th className="px-2 py-2 text-left">Requested By</th>
                  <th className="px-2 py-2 text-left">Date</th>
                  <th className="px-2 py-2 text-right">Item Count</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {savedRecords.map((record) => (
                  <tr
                    key={record.id}
                    onClick={() => onLoadRecord(record)}
                    className="cursor-pointer border-t border-border hover:bg-accent/60"
                    title="Load this requisition into the form"
                  >
                    <td className="px-2 py-2 font-medium">{record.requisitionNo}</td>
                    <td className="px-2 py-2">{record.requestedBy || "-"}</td>
                    <td className="px-2 py-2">{formatDate(record.date)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{getValidItems(record.items).length}</td>
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteRecord(record.id);
                        }}
                        className="icon-btn text-destructive"
                        title="Delete requisition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {savedRecords.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No saved requisitions yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-3 py-2 text-sm font-semibold">Draft Requisitions</div>
          <div className="mobile-table-scroll max-h-72 overflow-auto">
            <table className="min-w-[520px] w-full text-xs">
              <thead className="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left">Requisition No.</th>
                  <th className="px-2 py-2 text-left">Requested By</th>
                  <th className="px-2 py-2 text-left">Date</th>
                  <th className="px-2 py-2 text-right">Item Count</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {draftRecords.map((record) => (
                  <tr
                    key={record.id}
                    onClick={() => onLoadRecord(record)}
                    className="cursor-pointer border-t border-border hover:bg-accent/60"
                    title="Load this requisition into the form"
                  >
                    <td className="px-2 py-2 font-medium">{record.requisitionNo}</td>
                    <td className="px-2 py-2">{record.requestedBy || "-"}</td>
                    <td className="px-2 py-2">{formatDate(record.date)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{getValidItems(record.items).length}</td>
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteRecord(record.id);
                        }}
                        className="icon-btn text-destructive"
                        title="Delete requisition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {draftRecords.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No draft requisitions yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`rounded-lg border border-border bg-card ${isBottom ? "xl:col-span-2" : ""}`}>
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <div className="text-sm font-semibold">Inventory Items</div>
            <Link to="/inventory" search={{ add: true }} className="office-btn py-1 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add
            </Link>
          </div>
          <div className="mobile-table-scroll max-h-72 overflow-auto">
            <table className="min-w-[720px] w-full text-xs">
              <thead className="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left">Particulars</th>
                  <th className="px-2 py-2 text-left">Unit</th>
                  <th className="px-2 py-2 text-right">Unit Cost</th>
                  <th className="px-2 py-2 text-left">Source / Transaction</th>
                  <th className="px-2 py-2 text-right">Request Count</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {inventoryItems.slice(0, 12).map((item: any) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-2 py-2">{item.name}</td>
                    <td className="px-2 py-2">{item.unit}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{money(0)}</td>
                    <td className="px-2 py-2">{item.item_type || "Inventory"}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{requestCounts.get(String(item.name).toLowerCase()) ?? 0}</td>
                    <td className="px-2 py-2 text-right">
                      <button onClick={() => onDeleteInventoryItem(item.id)} className="icon-btn text-destructive" title="Delete inventory item">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {inventoryItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No inventory items found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </aside>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function AdminField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <div className="mt-1 text-xs text-destructive">{error}</div>}
    </label>
  );
}

function PaperField({ label, children, error, wide = false }: { label: string; children: React.ReactNode; error?: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <div className="paper-field-label">{label}</div>
      <div className={`paper-field-value ${error ? "paper-field-error" : ""}`}>{children}</div>
      {error && <div className="text-[10px] text-red-700">{error}</div>}
    </div>
  );
}

function PaperInput({ value, onChange, type = "text", error, placeholder }: { value: string; onChange: (value: string) => void; type?: string; error?: string; placeholder?: string }) {
  return (
    <input
      className={`paper-input ${error ? "paper-input-error" : ""}`}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function itemAmount(item: RequisitionItem) {
  return Number(item.quantity || 0) * Number(item.unitPrice || 0);
}

function sumItems(items: RequisitionItem[]) {
  return items.reduce((sum, item) => sum + itemAmount(item), 0);
}

function getValidItems(items: RequisitionItem[]) {
  return items.filter((item) => item.particulars.trim() && Number(item.quantity) > 0);
}

function money(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value || 0);
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function sameMonth(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function hasMeaningfulInput(form: RequisitionState, defaultRequester: string) {
  const hasDetails =
    form.requisitionNo.trim() ||
    form.department.trim() ||
    form.purpose.trim() ||
    form.remarks.trim() ||
    form.approvers.approvedBy.trim() ||
    form.approvers.receivedBy.trim() ||
    form.approvers.chairperson.trim() ||
    form.approvers.viceChairperson.trim() ||
    (form.requestedBy.trim() && form.requestedBy.trim() !== defaultRequester.trim());
  const hasItems = form.items.some(
    (item) =>
      item.particulars.trim() ||
      item.quantity.trim() ||
      item.unit.trim() ||
      item.unitPrice.trim() ||
      item.remarks.trim(),
  );
  return Boolean(hasDetails || hasItems);
}

function recordToForm(record: SavedRequisition): RequisitionState {
  const items = record.items.map((item) => ({ ...item, id: createId() }));
  return {
    formLayout: record.formLayout ?? "request",
    paperOrientation: record.paperOrientation ?? "portrait",
    date: record.date ?? new Date().toISOString().slice(0, 10),
    requisitionNo: record.requisitionNo ?? "",
    fundCluster: record.fundCluster ?? "",
    responsibilityCenterCode: record.responsibilityCenterCode ?? "",
    risNo: record.risNo ?? record.requisitionNo ?? "",
    requestedBy: record.requestedBy,
    department: record.department,
    purpose: record.purpose,
    remarks: record.remarks,
    approvers: { ...record.approvers },
    items: items.length >= 5 ? items : [...items, ...Array.from({ length: 5 - items.length }, blankItem)],
  };
}

function loadRecords(): SavedRequisition[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("requisition-records") || "[]");
  } catch {
    return [];
  }
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function printHtml(record: SavedRequisition) {
  if (record.formLayout === "ris") return printRisHtml(record);
  return printRequestHtml(record);
}

function printRequestHtml(record: SavedRequisition) {
  const rows = record.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.particulars)}</td>
          <td class="right">${escapeHtml(item.quantity)}</td>
          <td>${escapeHtml(item.unit)}</td>
          <td class="right">${money(Number(item.unitPrice || 0))}</td>
          <td class="right">${money(itemAmount(item))}</td>
        </tr>`,
    )
    .join("");

  const pageSize = record.paperOrientation === "landscape" ? "legal landscape" : "legal portrait";
  const paperWidth = record.paperOrientation === "landscape" ? "13in" : "8.5in";
  const paperMinHeight = record.paperOrientation === "landscape" ? "8.5in" : "13in";

  return `<!doctype html>
<html>
<head>
  <title>Request Form ${escapeHtml(record.requisitionNo)}</title>
  <style>
    @page { size: ${pageSize}; margin: 0.45in; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #e5e7eb; font-family: Arial, sans-serif; color: #111827; }
    .toolbar { padding: 12px; text-align: right; }
    .toolbar button { background: #0f2348; color: white; border: 0; border-radius: 4px; padding: 8px 12px; font-size: 13px; }
    .paper { width: ${paperWidth}; min-height: ${paperMinHeight}; margin: 0 auto 24px; background: white; border: 2px solid #111; padding: 18px; }
    .header { display: grid; grid-template-columns: 92px 1fr 130px; border: 1px solid #111; }
    .logo { display: grid; place-items: center; min-height: 74px; border-right: 1px solid #111; font-weight: 700; font-size: 12px; }
    .org { padding: 10px; text-align: center; border-right: 1px solid #111; }
    .org-name { font-weight: 800; font-size: 16px; text-transform: uppercase; }
    .org-address { font-size: 12px; margin-top: 3px; }
    .form-no { background: #c7f7ff; padding: 8px; font-size: 12px; font-weight: 700; }
    .title { margin-top: 10px; background: #0f2348; color: white; text-align: center; font-weight: 800; text-transform: uppercase; padding: 8px; letter-spacing: .08em; }
    .fields { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px 18px; margin: 16px 0; font-size: 12px; }
    .wide { grid-column: span 2; }
    .label { font-weight: 800; text-transform: uppercase; font-size: 10px; }
    .value { min-height: 22px; border-bottom: 1px solid #111; padding: 4px 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #111; padding: 6px; vertical-align: top; }
    th { background: #f3f4f6; text-transform: uppercase; font-size: 10px; }
    .right { text-align: right; }
    .remarks { margin-top: 14px; min-height: 52px; border: 1px solid #111; padding: 8px; font-size: 12px; }
    .signatures { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-top: 64px; }
    .sig-line { border-bottom: 1px solid #111; min-height: 22px; text-align: center; font-size: 12px; }
    .sig-label { text-align: center; text-transform: uppercase; font-size: 10px; font-weight: 800; margin-top: 5px; }
    @media print {
      body { background: white; }
      .toolbar { display: none; }
      .paper { margin: 0; border: 2px solid #111; width: auto; min-height: auto; }
    }
  </style>
</head>
<body>
  <div class="toolbar"><button onclick="window.print()">Print</button></div>
  <main class="paper">
    <div class="header">
      <div class="logo">LOGO</div>
      <div class="org">
        <div class="org-name">Government Stock Manager</div>
        <div class="org-address">Administrative Services Office</div>
        <div class="org-address">Supplies and Materials Management</div>
      </div>
      <div class="form-no">
        <div>FORM NO.</div>
        <div>${escapeHtml(record.requisitionNo)}</div>
      </div>
    </div>
    <div class="title">Request Form</div>
    <section class="fields">
      <div><div class="label">Date</div><div class="value">${formatDate(record.date)}</div></div>
      <div><div class="label">Requisition No.</div><div class="value">${escapeHtml(record.requisitionNo)}</div></div>
      <div><div class="label">Total Amount Requested</div><div class="value">${money(record.grandTotal)}</div></div>
      <div><div class="label">Requested By</div><div class="value">${escapeHtml(record.requestedBy)}</div></div>
      <div><div class="label">Department</div><div class="value">${escapeHtml(record.department)}</div></div>
      <div class="wide"><div class="label">Purpose</div><div class="value">${escapeHtml(record.purpose)}</div></div>
    </section>
    <table>
      <thead>
        <tr><th>Particulars</th><th>Quantity</th><th>Unit</th><th>Unit Price</th><th>Amount</th></tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="4" class="right"><strong>Grand Total</strong></td><td class="right"><strong>${money(record.grandTotal)}</strong></td></tr></tfoot>
    </table>
    <div class="remarks">${escapeHtml(record.remarks)}</div>
    <section class="signatures">
      <div><div class="sig-line">${escapeHtml(record.requestedBy)}</div><div class="sig-label">Requested By</div></div>
      <div><div class="sig-line">${escapeHtml(record.approvers.approvedBy)}</div><div class="sig-label">Approved By</div></div>
      <div><div class="sig-line">${escapeHtml(record.approvers.receivedBy)}</div><div class="sig-label">Received By</div></div>
      <div><div class="sig-line">${escapeHtml(record.approvers.chairperson)}</div><div class="sig-label">Chairperson</div></div>
      <div><div class="sig-line">${escapeHtml(record.approvers.viceChairperson)}</div><div class="sig-label">Vice Chairperson</div></div>
    </section>
  </main>
</body>
</html>`;
}

function printRisHtml(record: SavedRequisition) {
  const rows = record.items
    .map((item, index) => {
      const quantity = Number(item.quantity || 0);
      return `
        <tr>
          <td class="center">${String(index + 1).padStart(3, "0")}</td>
          <td>${escapeHtml(item.unit)}</td>
          <td>${escapeHtml(item.particulars)}</td>
          <td class="right">${escapeHtml(item.quantity)}</td>
          <td class="center">${quantity > 0 ? "/" : ""}</td>
          <td class="center">${quantity <= 0 && item.particulars ? "/" : ""}</td>
          <td class="right">${quantity > 0 ? escapeHtml(item.quantity) : ""}</td>
          <td>${escapeHtml(item.remarks || "Issued")}</td>
        </tr>`;
    })
    .join("");
  const pageSize = record.paperOrientation === "landscape" ? "legal landscape" : "legal portrait";
  const paperWidth = record.paperOrientation === "landscape" ? "13in" : "8.5in";
  const paperMinHeight = record.paperOrientation === "landscape" ? "8.5in" : "13in";

  return `<!doctype html>
<html>
<head>
  <title>RIS ${escapeHtml(record.risNo || record.requisitionNo)}</title>
  <style>
    @page { size: ${pageSize}; margin: 0.45in; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #e5e7eb; font-family: Arial, sans-serif; color: #111827; }
    .toolbar { padding: 12px; text-align: right; }
    .toolbar button { background: #0f2348; color: white; border: 0; border-radius: 4px; padding: 8px 12px; font-size: 13px; }
    .paper { width: ${paperWidth}; min-height: ${paperMinHeight}; margin: 0 auto 24px; background: white; border: 2px solid #111; padding: 18px; }
    .title { text-align: center; text-transform: uppercase; font-weight: 800; font-size: 14px; margin-bottom: 10px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #111; border-bottom: 0; font-size: 11px; }
    .meta div { min-height: 26px; border-bottom: 1px solid #111; padding: 5px 7px; }
    .meta div:nth-child(odd) { border-right: 1px solid #111; }
    .label { font-weight: 800; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #111; padding: 5px; vertical-align: top; }
    th { background: #eef2f7; text-transform: uppercase; font-size: 10px; }
    .right { text-align: right; }
    .center { text-align: center; }
    .purpose { border: 1px solid #111; border-top: 0; min-height: 54px; padding: 7px; font-size: 11px; }
    .signatures { margin-top: 0; }
    .signatures td { height: 34px; text-align: center; }
    .signatures td:first-child { width: 120px; text-align: left; font-weight: 800; }
    @media print {
      body { background: white; }
      .toolbar { display: none; }
      .paper { margin: 0; border: 2px solid #111; width: auto; min-height: auto; }
    }
  </style>
</head>
<body>
  <div class="toolbar"><button onclick="window.print()">Print</button></div>
  <main class="paper">
    <div class="title">Requisition and Issue Slip</div>
    <section class="meta">
      <div><span class="label">Entity Name:</span> Government Stock Manager</div>
      <div><span class="label">Fund Cluster:</span> ${escapeHtml(record.fundCluster || "")}</div>
      <div><span class="label">Division:</span> ${escapeHtml(record.department || "")}</div>
      <div><span class="label">Responsibility Center Code:</span> ${escapeHtml(record.responsibilityCenterCode || "")}</div>
      <div><span class="label">Office:</span> Supplies and Materials Management</div>
      <div><span class="label">RIS No.:</span> ${escapeHtml(record.risNo || record.requisitionNo || "")}</div>
    </section>
    <table>
      <thead>
        <tr><th colspan="4">Requisition</th><th colspan="2">Stock Available?</th><th colspan="2">Issue</th></tr>
        <tr><th>Stock No.</th><th>Unit</th><th>Description</th><th>Quantity</th><th>Yes</th><th>No</th><th>Quantity</th><th>Remarks</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="purpose"><strong>Purpose:</strong> ${escapeHtml(record.purpose || "")}</div>
    <table class="signatures">
      <tbody>
        <tr><td>Signature</td><td>Requested by:</td><td>Approved by:</td><td>Issued by:</td><td>Received by:</td></tr>
        <tr><td>Printed Name</td><td>${escapeHtml(record.requestedBy || "")}</td><td>${escapeHtml(record.approvers.approvedBy || "")}</td><td>${escapeHtml(record.approvers.chairperson || "")}</td><td>${escapeHtml(record.approvers.receivedBy || "")}</td></tr>
        <tr><td>Designation</td><td>TESDA Specialist</td><td>Head of Office</td><td>Supply Officer</td><td>End User</td></tr>
        <tr><td>Date</td><td>${formatDate(record.date)}</td><td>${formatDate(record.date)}</td><td>${formatDate(record.date)}</td><td>${formatDate(record.date)}</td></tr>
      </tbody>
    </table>
  </main>
</body>
</html>`;
}

const officeStyles = `
.office-btn,.office-btn-primary{display:inline-flex;align-items:center;gap:.45rem;border-radius:6px;padding:.48rem .75rem;font-size:.875rem;font-weight:600;line-height:1;border:1px solid var(--color-input)}
.office-btn{background:var(--color-card);color:var(--color-foreground)}
.office-btn:hover{background:var(--color-accent)}
.office-btn-primary{background:var(--color-primary);color:var(--color-primary-foreground);border-color:var(--color-primary)}
.office-btn-primary:hover{filter:brightness(.95)}
.requisition-action{justify-content:center}
.icon-btn{display:inline-grid;place-items:center;border-radius:5px;padding:.3rem}
.icon-btn:hover{background:var(--color-accent)}
.admin-input,.table-input{width:100%;border:1px solid var(--color-input);background:var(--color-card);border-radius:6px;padding:.45rem .55rem;font-size:.875rem;outline:none}
.table-input{height:32px;border-radius:4px;padding:.25rem .4rem}
.admin-input:focus,.table-input:focus,.paper-input:focus,.paper-cell-input:focus,.signature-input:focus{border-color:var(--color-ring);box-shadow:0 0 0 3px color-mix(in oklab,var(--color-ring) 20%,transparent)}
.preview-shell{border:1px solid var(--color-border);border-radius:8px;background:var(--color-card);overflow:hidden}
.preview-toolbar{position:sticky;top:0;z-index:20;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;background:var(--color-card);border-bottom:1px solid var(--color-border)}
.preview-bg{overflow:auto;background:#e5e7eb;padding:14px}
.preview-zoom{transform-origin:top center;margin:0 auto}
.request-paper{width:min(100%,8.5in);min-height:auto;aspect-ratio:8.5 / 13;margin:0 auto;background:#fff;color:#111;border:2px solid #111;padding:18px;font-family:Arial,sans-serif}
.request-paper.landscape{width:min(100%,13in);min-height:auto;aspect-ratio:13 / 8.5}
.paper-header{display:grid;grid-template-columns:92px minmax(0,1fr) 135px;border:1px solid #111}
.logo-box{display:grid;place-items:center;min-height:76px;border-right:1px solid #111;font-size:12px;font-weight:800}
.org-box{border-right:1px solid #111;padding:10px;text-align:center}
.org-name{font-size:16px;font-weight:800;text-transform:uppercase}
.org-address{font-size:12px;margin-top:3px}
.form-no-box{background:#c7f7ff;padding:8px;font-size:12px}
.paper-title{margin-top:10px;background:#0f2348;color:#fff;text-align:center;text-transform:uppercase;font-weight:800;letter-spacing:.08em;padding:8px}
.paper-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 18px;margin:16px 0}
.paper-field-label{font-size:10px;font-weight:800;text-transform:uppercase;color:#111}
.paper-field-value{min-height:28px;border-bottom:1px solid #111;padding:3px 2px;font-size:13px}
.paper-field-error{border-bottom-color:#b91c1c}
.paper-input{width:100%;border:0;background:transparent;padding:0;font-size:13px;outline:none;color:#111}
.paper-input-error{color:#b91c1c}
.paper-table{width:100%;min-width:690px;border-collapse:collapse;font-size:12px}
.paper-table th,.paper-table td{border:1px solid #111;padding:5px;vertical-align:middle}
.paper-table th{background:#f3f4f6;text-transform:uppercase;font-size:10px}
.paper-cell-input{width:100%;height:26px;border:0;background:transparent;padding:2px;outline:none;color:#111}
.paper-remarks{width:100%;border:1px solid #111;background:#fff;color:#111;padding:6px;font-size:12px;outline:none}
.signature-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:52px}
.signature-line{border-bottom:1px solid #111;min-height:25px;text-align:center;font-size:12px}
.signature-label{text-align:center;text-transform:uppercase;font-size:10px;font-weight:800;margin-top:5px}
.signature-input{width:100%;border:0;background:transparent;text-align:center;outline:none;color:#111}
.ris-paper{font-size:11px}
.ris-title{text-align:center;text-transform:uppercase;font-weight:800;font-size:14px;margin-bottom:10px}
.ris-meta-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #111;border-bottom:0}
.ris-meta-cell{min-height:29px;border-bottom:1px solid #111;padding:5px 7px}
.ris-meta-cell:nth-child(odd){border-right:1px solid #111}
.ris-meta-label{font-weight:800}
.ris-table{width:100%;min-width:760px;border-collapse:collapse;font-size:11px}
.ris-table th,.ris-table td{border:1px solid #111;padding:4px;vertical-align:middle}
.ris-table th{background:#eef2f7;text-transform:uppercase;font-size:10px}
.ris-purpose{display:flex;gap:6px;align-items:center;min-height:52px;border:1px solid #111;border-top:0;padding:7px;font-size:11px}
.ris-signature-table{width:100%;min-width:620px;border-collapse:collapse;font-size:11px;margin-top:0}
.ris-signature-table td{border:1px solid #111;padding:5px;text-align:center;height:32px}
.ris-signature-table td:first-child{width:120px;text-align:left;font-weight:800}
@media (max-width: 760px){
  .requisition-action{flex:1;min-width:0;padding:.55rem .35rem;font-size:11px;gap:.25rem;white-space:nowrap}
  .requisition-action svg{width:14px;height:14px;flex:none}
  .preview-toolbar{position:sticky;top:0;display:grid;grid-template-columns:1fr;padding:8px}
  .preview-toolbar>div{display:grid;width:100%;grid-template-columns:1fr 1fr}
  .preview-toolbar>div:last-child{grid-template-columns:auto 1fr auto auto}
  .preview-bg{padding:8px}
  .request-paper{padding:10px}
  .paper-header{grid-template-columns:72px minmax(0,1fr)}
  .form-no-box{grid-column:1 / -1;border-top:1px solid #111}
  .org-name{font-size:13px}
  .org-address{font-size:10px}
  .paper-fields{grid-template-columns:1fr}
  .signature-grid{grid-template-columns:1fr 1fr}
  .ris-meta-grid{grid-template-columns:1fr}
  .ris-meta-cell:nth-child(odd){border-right:0}
  .mobile-table-scroll{overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
}
`;
