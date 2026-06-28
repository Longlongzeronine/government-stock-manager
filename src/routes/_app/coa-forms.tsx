import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Download, FileSpreadsheet, FileText, Printer, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { exportCSV, exportPDF, exportXLSX } from "@/lib/export";

export const Route = createFileRoute("/_app/coa-forms")({
  head: () => ({ meta: [{ title: "COA Forms — Supplify" }] }),
  component: CoaForms,
});

type Item = any;
type Tx = any;

const entityName = "PROVINCIAL TRAINING CENTER - DAVAO DEL NORTE";
const supplyOfficer = "ENGR. JENY E. BUSCANO";
const agencyHead = "ENGR. ALBERT N. MANINGO";
const accountingStaff = "Designated Accounting Staff";
const responsibilityCenter = "16 009 0 300011 07";

const forms = [
  { id: "ris", label: "RIS", title: "REQUISITION AND ISSUE SLIP", source: "Appendix 63 / 01 RIS" },
  { id: "iar", label: "IAR", title: "INSPECTION AND ACCEPTANCE REPORT", source: "Appendix 62" },
  { id: "slc", label: "SLC", title: "SUPPLIES LEDGER CARD", source: "Appendix 57" },
  { id: "sc", label: "SC", title: "STOCK CARD", source: "Appendix 58" },
  { id: "rsmi", label: "RSMI", title: "REPORT OF SUPPLIES AND MATERIALS ISSUED", source: "Appendix 64" },
  { id: "rpci", label: "RPCI", title: "REPORT ON THE PHYSICAL COUNT OF INVENTORIES", source: "Appendix 66" },
  { id: "spc", label: "SPC", title: "SEMI-EXPENDABLE PROPERTY CARD", source: "Annex A.1" },
  { id: "splc", label: "SPLC", title: "SEMI-EXPENDABLE PROPERTY LEDGER CARD", source: "Annex A.2" },
  { id: "ics", label: "ICS", title: "INVENTORY CUSTODIAN SLIP", source: "Annex A.3" },
  { id: "regspi", label: "RegSPI", title: "REGISTRY OF SEMI-EXPENDABLE PROPERTY ISSUED", source: "Annex A.4" },
  { id: "itr", label: "ITR", title: "INVENTORY TRANSFER REPORT", source: "Annex A.5" },
  { id: "rrsp", label: "RRSP", title: "RECEIPT OF RETURNED SEMI-EXPENDABLE PROPERTY", source: "Annex A.6" },
  { id: "rspi", label: "RSPI", title: "REPORT OF SEMI-EXPENDABLE PROPERTY ISSUED", source: "Annex A.7" },
  { id: "rpcsp", label: "RPCSP", title: "REPORT ON THE PHYSICAL COUNT OF SEMI-EXPENDABLE PROPERTY", source: "Annex A.8" },
  { id: "rlsddsp", label: "RLSDDSP", title: "REPORT OF LOST, STOLEN, DAMAGED OR DESTROYED SEMI-EXPENDABLE PROPERTY", source: "Annex A.9" },
  { id: "iirusp", label: "IIRUSP", title: "INVENTORY AND INSPECTION REPORT OF UNSERVICEABLE SEMI-EXPENDABLE PROPERTY", source: "Annex A.10" },
];

function CoaForms() {
  const [formId, setFormId] = useState("rpci");
  const [fund, setFund] = useState("");
  const [itemId, setItemId] = useState("");
  const [search, setSearch] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["items", "coa"],
    queryFn: async () =>
      (
        await supabase
          .from("items")
          .select("*, category:categories(id,name), supplier:suppliers(id,name)")
          .order("name")
      ).data ?? [],
  });
  const { data: txs = [] } = useQuery({
    queryKey: ["transactions", "coa"],
    queryFn: async () =>
      (
        await supabase
          .from("transactions")
          .select("*, item:items(id,name,description,unit,unit_value,item_type,stock_number,property_number,fund_cluster,uacs_object_code,estimated_useful_life,office,accountable_officer)")
          .order("transaction_date", { ascending: true })
          .order("created_at", { ascending: true })
      ).data ?? [],
  });

  const active = forms.find((f) => f.id === formId)!;
  const fundOptions = Array.from(new Set(items.map((i: Item) => i.fund_cluster).filter(Boolean))).sort();
  const filteredItems = useMemo(() => {
    return items.filter((i: Item) => {
      if (fund && i.fund_cluster !== fund) return false;
      if (search && !`${i.name} ${i.description ?? ""} ${i.stock_number ?? ""} ${i.property_number ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, fund, search]);
  const filteredTxs = useMemo(() => txs.filter((t: Tx) => !fund || t.item?.fund_cluster === fund), [txs, fund]);
  const selected = filteredItems.find((i: Item) => i.id === itemId) ?? filteredItems[0];
  const context = { items: filteredItems, txs: filteredTxs, item: selected };
  const exportRows = rowsForExport(active.id, context);
  const exportColumns = exportRows[0] ? Object.keys(exportRows[0]) : [];

  return (
    <div>
      <PageHeader
        title="COA Forms"
        subtitle={`${active.source} · ${active.title}`}
        actions={<ExportMenu title={active.label} rows={exportRows} columns={exportColumns} />}
      />
      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1">
            {forms.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormId(f.id)}
                className={`rounded px-2.5 py-1.5 text-xs font-semibold ${formId === f.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search records" className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm" />
            </div>
            <select value={fund} onChange={(e) => setFund(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">All fund clusters</option>
              {fundOptions.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm sm:max-w-64">
              {filteredItems.map((i: Item) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-white p-2 text-black shadow-sm print:border-0 print:p-0 print:shadow-none">
          <div className="coa-sheet mx-auto min-w-[980px] bg-white p-6">
            <FormRenderer formId={formId} context={context} />
          </div>
        </div>
      </div>
      <style>{coaStyles}</style>
    </div>
  );
}

function FormRenderer({ formId, context }: { formId: string; context: any }) {
  if (formId === "slc") return <LedgerForm title="SUPPLIES LEDGER CARD" source="Appendix 57" item={context.item} txs={context.txs} accounting />;
  if (formId === "sc") return <LedgerForm title="STOCK CARD" source="Appendix 58" item={context.item} txs={context.txs} />;
  if (formId === "spc") return <LedgerForm title="SEMI-EXPENDABLE PROPERTY CARD" source="Annex A.1" item={context.item} txs={context.txs} semi accounting />;
  if (formId === "splc") return <LedgerForm title="SEMI-EXPENDABLE PROPERTY LEDGER CARD" source="Annex A.2" item={context.item} txs={context.txs} semi accounting />;
  if (formId === "ris") return <RisForm txs={context.txs} />;
  if (formId === "iar") return <IarForm txs={context.txs} />;
  if (formId === "rsmi") return <IssuedReport title="REPORT OF SUPPLIES AND MATERIALS ISSUED" source="Appendix 64" rows={issuedRows(context.txs, false)} />;
  if (formId === "rspi") return <IssuedReport title="REPORT OF SEMI-EXPENDABLE PROPERTY ISSUED" source="Annex A.7" rows={issuedRows(context.txs, true)} semi />;
  if (formId === "rpci") return <PhysicalCount title="REPORT ON THE PHYSICAL COUNT OF INVENTORIES" source="Appendix 66" items={context.items.filter((i: Item) => i.item_type !== "material")} />;
  if (formId === "rpcsp") return <PhysicalCount title="REPORT ON THE PHYSICAL COUNT OF SEMI-EXPENDABLE PROPERTY" source="Annex A.8" items={context.items.filter((i: Item) => i.item_type === "material")} semi />;
  if (formId === "ics") return <IcsForm items={context.items.filter((i: Item) => i.item_type === "material")} />;
  if (formId === "regspi") return <RegistryForm txs={context.txs} />;
  if (formId === "itr") return <TransferForm txs={context.txs} />;
  if (formId === "rrsp") return <ReturnForm txs={context.txs} />;
  if (formId === "rlsddsp") return <LossForm txs={context.txs} />;
  return <UnserviceableForm txs={context.txs} />;
}

function Header({ source, title, children }: any) {
  return (
    <>
      <div className="text-right text-xs">{source}</div>
      <h2 className="text-center text-base font-bold tracking-normal">{title}</h2>
      <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
        <div>Entity Name: <b>{entityName}</b></div>
        <div>Fund Cluster: <b>06</b></div>
        {children}
      </div>
    </>
  );
}

function LedgerForm({ title, source, item, txs, semi = false, accounting = false }: any) {
  const rows = runningRows(txs.filter((t: Tx) => t.item_id === item?.id), item);
  return (
    <>
      <Header source={source} title={title}>
        <div>{semi ? "Semi-Expendable Property" : "Item"}: <b>{item?.name ?? ""}</b></div>
        <div>{semi ? "Semi-Expendable Property Number" : "Item Code"}: <b>{semi ? item?.property_number : item?.stock_number}</b></div>
        <div>Description: <b>{item?.description ?? ""}</b></div>
        <div>Re-order Point: <b>{item?.reorder_level ?? ""}</b></div>
        <div>Unit of Measurement: <b>{item?.unit ?? ""}</b></div>
        {semi && <div>UACS Object Code: <b>{item?.uacs_object_code ?? ""}</b></div>}
      </Header>
      <table className="coa-table mt-4">
        <thead>
          <tr><th rowSpan={2}>Date</th><th rowSpan={2}>Reference</th><th colSpan={3}>Receipt</th><th colSpan={3}>Issue/Transfer/Disposal</th><th colSpan={3}>Balance</th>{accounting && <th rowSpan={2}>Remarks</th>}</tr>
          <tr><th>Qty.</th><th>Unit Cost</th><th>Total Cost</th><th>Qty.</th><th>Unit Cost</th><th>Total Cost</th><th>Qty.</th><th>Unit Cost</th><th>Total Cost</th></tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx}>
              <td>{r.date}</td><td>{r.ref}</td><td className="num">{r.receiptQty || ""}</td><td className="num">{r.receiptQty ? money(r.unitValue) : ""}</td><td className="num">{r.receiptQty ? money(r.receiptCost) : ""}</td>
              <td className="num">{r.issueQty || ""}</td><td className="num">{r.issueQty ? money(r.unitValue) : ""}</td><td className="num">{r.issueQty ? money(r.issueCost) : ""}</td>
              <td className="num">{r.balanceQty}</td><td className="num">{money(r.unitValue)}</td><td className="num">{money(r.balanceCost)}</td>{accounting && <td>{r.remarks}</td>}
            </tr>
          ))}
          {emptyRows(rows.length, accounting ? 12 : 11)}
        </tbody>
      </table>
    </>
  );
}

function RisForm({ txs }: { txs: Tx[] }) {
  const rows = txs.filter((t) => outTypes.has(t.type)).slice(-24);
  return (
    <>
      <Header source="Appendix 63" title="REQUISITION AND ISSUE SLIP">
        <div>Division: ______________________________</div><div>Responsibility Center Code: {responsibilityCenter}</div>
        <div>Office: _______________________________</div><div>RIS No.: _______________________________</div>
      </Header>
      <table className="coa-table mt-4">
        <thead><tr><th colSpan={4}>Requisition</th><th colSpan={2}>Stock Available?</th><th colSpan={2}>Issue</th></tr><tr><th>Stock No.</th><th>Unit</th><th>Description</th><th>Quantity</th><th>Yes</th><th>No</th><th>Quantity</th><th>Remarks</th></tr></thead>
        <tbody>{rows.map((t) => <tr key={t.id}><td>{t.item?.stock_number}</td><td>{t.item?.unit}</td><td>{t.item?.name}</td><td className="num">{t.quantity}</td><td className="center">✓</td><td></td><td className="num">{t.quantity}</td><td>{t.remarks ?? "ISSUED"}</td></tr>)}{emptyRows(rows.length, 8)}</tbody>
      </table>
      <Signatures labels={["Requested by", "Approved by", "Issued by", "Received by"]} names={["", agencyHead, supplyOfficer, ""]} />
    </>
  );
}

function IarForm({ txs }: { txs: Tx[] }) {
  const rows = txs.filter((t) => t.type === "IN").slice(-20);
  return (
    <>
      <Header source="Appendix 62" title="INSPECTION AND ACCEPTANCE REPORT"><div>Supplier: ______________________________</div><div>IAR No.: ______________________________</div><div>Invoice No.: ___________________________</div><div>Date: {format(new Date(), "MMMM d, yyyy")}</div></Header>
      <table className="coa-table mt-4"><thead><tr><th>Stock/Property No.</th><th>Description</th><th>Unit</th><th>Quantity</th><th>Unit Cost</th><th>Amount</th><th>Remarks</th></tr></thead><tbody>{rows.map((t) => <tr key={t.id}><td>{t.item?.stock_number || t.item?.property_number}</td><td>{t.item?.name}</td><td>{t.item?.unit}</td><td className="num">{t.quantity}</td><td className="num">{money(unitValue(t))}</td><td className="num">{money(amount(t))}</td><td>{t.remarks}</td></tr>)}{emptyRows(rows.length, 7)}</tbody></table>
      <Signatures labels={["Inspection", "Acceptance"]} names={["Inspection Officer", supplyOfficer]} />
    </>
  );
}

function IssuedReport({ title, source, rows, semi = false }: any) {
  return (
    <>
      <Header source={source} title={title}><div>Serial No.: {format(new Date(), "yyyy-MM-0001")}</div><div>Date: {format(new Date(), "MMMM d, yyyy")}</div></Header>
      <table className="coa-table mt-4"><thead><tr><th>{semi ? "ICS No." : "RIS No."}</th><th>Responsibility Center Code</th><th>{semi ? "Semi-Expendable Property No." : "Stock No."}</th><th>Item</th><th>Unit</th><th>Quantity Issued</th><th>Unit Cost</th><th>Amount</th></tr></thead><tbody>{rows.map((r: any, idx: number) => <tr key={idx}><td>{r.ref}</td><td>{r.rcc}</td><td>{r.no}</td><td>{r.item}</td><td>{r.unit}</td><td className="num">{r.qty}</td><td className="num">{money(r.unitValue)}</td><td className="num">{money(r.total)}</td></tr>)}{emptyRows(rows.length, 8)}<tr><td colSpan={7} className="num"><b>Total</b></td><td className="num"><b>{money(rows.reduce((s: number, r: any) => s + r.total, 0))}</b></td></tr></tbody></table>
      <Signatures labels={["Certified Correct by", "Posted by"]} names={[supplyOfficer, accountingStaff]} />
    </>
  );
}

function PhysicalCount({ title, source, items, semi = false }: any) {
  return (
    <>
      <Header source={source} title={title}><div>{semi ? "Type of Semi-expendable Property" : "Type of Inventory Item"}: Common-use Supplies and Equipment</div><div>As at {format(new Date(), "MMMM d, yyyy")}</div></Header>
      <table className="coa-table mt-4"><thead><tr><th>Article</th><th>Description</th><th>{semi ? "Semi-expendable Property No." : "Stock Number"}</th><th>Unit of Measure</th><th>Unit Value</th><th>Balance Per Card</th><th>On Hand Per Count</th><th colSpan={2}>Shortage/Overage</th><th>Remarks</th></tr><tr><th colSpan={7}></th><th>Quantity</th><th>Value</th><th></th></tr></thead><tbody>{items.map((i: Item) => <tr key={i.id}><td>{i.name}</td><td>{i.description}</td><td>{semi ? i.property_number : i.stock_number}</td><td>{i.unit}</td><td className="num">{money(i.unit_value)}</td><td className="num">{i.quantity}</td><td className="num">{i.quantity}</td><td className="num">0</td><td className="num">{money(0)}</td><td>{i.remarks}</td></tr>)}{emptyRows(items.length, 10)}</tbody></table>
      <Signatures labels={["Certified Correct by", "Approved by", "Verified by"]} names={[supplyOfficer, agencyHead, "COA Representative"]} />
    </>
  );
}

function IcsForm({ items }: { items: Item[] }) {
  return (
    <>
      <Header source="Annex A.3" title="INVENTORY CUSTODIAN SLIP"><div>ICS No.: ______________________________</div><div>Date: {format(new Date(), "MMMM d, yyyy")}</div></Header>
      <table className="coa-table mt-4"><thead><tr><th>Quantity</th><th>Unit</th><th colSpan={2}>Amount</th><th>Description</th><th>Item No.</th><th>Estimated Useful Life</th></tr><tr><th></th><th></th><th>Unit Cost</th><th>Total Cost</th><th></th><th></th><th></th></tr></thead><tbody>{items.map((i) => <tr key={i.id}><td className="num">{i.quantity}</td><td>{i.unit}</td><td className="num">{money(i.unit_value)}</td><td className="num">{money(i.quantity * i.unit_value)}</td><td>{i.name}</td><td>{i.property_number}</td><td>{i.estimated_useful_life}</td></tr>)}{emptyRows(items.length, 7)}</tbody></table>
      <Signatures labels={["Received from", "Received by"]} names={[supplyOfficer, ""]} />
    </>
  );
}

function RegistryForm({ txs }: { txs: Tx[] }) {
  const rows = txs.filter((t) => t.item?.item_type === "material");
  return (
    <>
      <Header source="Annex A.4" title="REGISTRY OF SEMI-EXPENDABLE PROPERTY ISSUED"><div>Date: {format(new Date(), "MMMM d, yyyy")}</div><div></div></Header>
      <table className="coa-table mt-4"><thead><tr><th>Date</th><th>Reference</th><th>Item Description</th><th>Estimated Useful Life</th><th colSpan={2}>Issued</th><th colSpan={2}>Returned</th><th colSpan={2}>Disposed</th><th>Balance</th><th>Amount</th><th>Remarks</th></tr><tr><th></th><th>ICS/RRSP No.</th><th></th><th></th><th>Qty.</th><th>Office/Officer</th><th>Qty.</th><th>Office/Officer</th><th>Qty.</th><th>Office/Officer</th><th>Qty.</th><th></th><th></th></tr></thead><tbody>{rows.map((t) => <tr key={t.id}><td>{date(t)}</td><td>{t.reference_no}</td><td>{t.item?.name}</td><td>{t.item?.estimated_useful_life}</td><td className="num">{outTypes.has(t.type) ? t.quantity : ""}</td><td>{t.office_officer}</td><td className="num">{t.type === "RETURN" ? t.quantity : ""}</td><td>{t.office_officer}</td><td className="num">{t.type === "DISPOSAL" ? t.quantity : ""}</td><td>{t.office_officer}</td><td className="num">{t.item?.quantity}</td><td className="num">{money(amount(t))}</td><td>{t.remarks}</td></tr>)}{emptyRows(rows.length, 13)}</tbody></table>
    </>
  );
}

function TransferForm({ txs }: { txs: Tx[] }) {
  const rows = txs.filter((t) => t.type === "TRANSFER");
  return <SimpleMovement title="INVENTORY TRANSFER REPORT" source="Annex A.5" rows={rows} cols={["Date Acquired", "Item No.", "ICS", "Description", "Amount", "Condition of Inventory"]} />;
}

function ReturnForm({ txs }: { txs: Tx[] }) {
  const rows = txs.filter((t) => t.type === "RETURN");
  return <SimpleMovement title="RECEIPT OF RETURNED SEMI-EXPENDABLE PROPERTY" source="Annex A.6" rows={rows} cols={["Item Description", "Quantity", "ICS No.", "End-user", "Remarks"]} />;
}

function LossForm({ txs }: { txs: Tx[] }) {
  const rows = txs.filter((t) => t.type === "DISPOSAL");
  return <SimpleMovement title="REPORT OF LOST, STOLEN, DAMAGED OR DESTROYED SEMI-EXPENDABLE PROPERTY" source="Annex A.9" rows={rows} cols={["Date", "Property No.", "Description", "Acquisition Cost", "Circumstances", "Action Taken"]} />;
}

function UnserviceableForm({ txs }: { txs: Tx[] }) {
  const rows = txs.filter((t) => t.type === "DISPOSAL");
  return <SimpleMovement title="INVENTORY AND INSPECTION REPORT OF UNSERVICEABLE SEMI-EXPENDABLE PROPERTY" source="Annex A.10" rows={rows} cols={["Date Acquired", "Particular/Articles", "Semi-expendable Property No.", "Qty.", "Unit Cost", "Total Cost", "Remarks", "Disposal"]} />;
}

function SimpleMovement({ title, source, rows, cols }: any) {
  return (
    <>
      <Header source={source} title={title}><div>Date: {format(new Date(), "MMMM d, yyyy")}</div><div>Accountable Officer: __________________</div></Header>
      <table className="coa-table mt-4"><thead><tr>{cols.map((c: string) => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((t: Tx) => <tr key={t.id}>{cols.map((c: string) => <td key={c} className={/cost|amount|qty/i.test(c) ? "num" : ""}>{movementCell(c, t)}</td>)}</tr>)}{emptyRows(rows.length, cols.length)}</tbody></table>
      <Signatures labels={["Prepared by", "Approved by", "Received/Witnessed by"]} names={[supplyOfficer, agencyHead, ""]} />
    </>
  );
}

function Signatures({ labels, names }: { labels: string[]; names: string[] }) {
  return (
    <div className="mt-8 grid gap-6 text-xs" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
      {labels.map((l, i) => <div key={l}><div>{l}:</div><div className="mt-8 border-t border-black pt-1 text-center font-semibold">{names[i]}</div><div className="text-center">Signature over Printed Name</div></div>)}
    </div>
  );
}

const outTypes = new Set(["OUT", "TRANSFER", "DISPOSAL"]);
function unitValue(t: Tx) { return Number(t.unit_value ?? t.item?.unit_value ?? 0); }
function amount(t: Tx) { return Number(t.total_cost ?? Number(t.quantity ?? 0) * unitValue(t)); }
function date(t: Tx) { return t.transaction_date ? format(new Date(t.transaction_date), "yyyy-MM-dd") : ""; }
function money(v: any) { return Number(v ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function runningRows(txs: Tx[], item: Item) {
  let balance = 0;
  return txs.map((t) => {
    const receipt = t.type === "IN" || t.type === "RETURN" ? Number(t.quantity) : 0;
    const issue = outTypes.has(t.type) ? Number(t.quantity) : 0;
    balance = t.type === "ADJUSTMENT" ? Number(t.quantity) : balance + receipt - issue;
    const value = unitValue(t) || Number(item?.unit_value ?? 0);
    return { date: date(t), ref: t.reference_no ?? t.type, receiptQty: receipt, issueQty: issue, unitValue: value, receiptCost: receipt * value, issueCost: issue * value, balanceQty: balance, balanceCost: balance * value, remarks: t.remarks ?? t.office_officer ?? "" };
  });
}

function issuedRows(txs: Tx[], semi: boolean) {
  return txs.filter((t) => outTypes.has(t.type) && (semi ? t.item?.item_type === "material" : t.item?.item_type !== "material")).map((t) => ({
    ref: t.reference_no ?? "",
    rcc: t.responsibility_center_code ?? responsibilityCenter,
    no: semi ? t.item?.property_number : t.item?.stock_number,
    item: t.item?.name,
    unit: t.item?.unit,
    qty: t.quantity,
    unitValue: unitValue(t),
    total: amount(t),
  }));
}

function rowsForExport(formId: string, context: any) {
  if (["rsmi", "rspi"].includes(formId)) return issuedRows(context.txs, formId === "rspi");
  if (["slc", "sc", "spc", "splc"].includes(formId)) return runningRows(context.txs.filter((t: Tx) => t.item_id === context.item?.id), context.item);
  return context.items.map((i: Item) => ({
    Article: i.name,
    Description: i.description ?? "",
    Number: i.property_number ?? i.stock_number ?? "",
    Unit: i.unit,
    Quantity: i.quantity,
    UnitValue: Number(i.unit_value ?? 0),
    TotalCost: Number(i.total_cost ?? Number(i.quantity ?? 0) * Number(i.unit_value ?? 0)),
    FundCluster: i.fund_cluster ?? "",
  }));
}

function movementCell(col: string, t: Tx) {
  if (/date/i.test(col)) return date(t);
  if (/property|item no/i.test(col)) return t.item?.property_number ?? t.item?.stock_number ?? "";
  if (/ics/i.test(col)) return t.reference_no ?? "";
  if (/description|particular/i.test(col)) return t.item?.name ?? "";
  if (/qty|quantity/i.test(col)) return t.quantity;
  if (/unit cost/i.test(col)) return money(unitValue(t));
  if (/cost|amount/i.test(col)) return money(amount(t));
  if (/end-user/i.test(col)) return t.office_officer ?? "";
  if (/disposal/i.test(col)) return t.type;
  return t.remarks ?? "";
}

function emptyRows(count: number, cols: number) {
  return Array.from({ length: Math.max(0, 10 - count) }).map((_, i) => <tr key={`e-${i}`}>{Array.from({ length: cols }).map((__, j) => <td key={j}>&nbsp;</td>)}</tr>);
}

function ExportMenu({ rows, title, columns }: { rows: any[]; title: string; columns: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-accent"><Printer className="h-4 w-4" /> Print</button>
      <button onClick={() => exportCSV(rows, `COA ${title}`)} className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-accent"><FileText className="h-4 w-4" /> CSV</button>
      <button onClick={() => exportXLSX(rows, `COA ${title}`)} className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-accent"><FileSpreadsheet className="h-4 w-4" /> Excel</button>
      <button onClick={() => exportPDF(`COA ${title}`, columns, rows.map((r) => columns.map((c) => r[c])), `COA ${title}`)} className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-accent"><Download className="h-4 w-4" /> PDF</button>
    </div>
  );
}

const coaStyles = `
.coa-sheet{font-family:Arial,Helvetica,sans-serif;color:#111}
.coa-table{width:100%;border-collapse:collapse;font-size:11px}
.coa-table th,.coa-table td{border:1px solid #111;padding:4px 5px;vertical-align:top}
.coa-table th{font-weight:700;text-align:center}
.coa-table .num{text-align:right;font-variant-numeric:tabular-nums}
.coa-table .center{text-align:center}
@media print{
  body *{visibility:hidden}
  .coa-sheet,.coa-sheet *{visibility:visible}
  .coa-sheet{position:absolute;left:0;top:0;width:100%;min-width:0;padding:16px}
  @page{size:landscape;margin:10mm}
}
`;
