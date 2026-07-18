import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clipboard,
  Download,
  ExternalLink,
  History,
  Loader2,
  Package,
  Printer,
  QrCode,
  Search,
  ShieldCheck,
  Square,
  Wifi,
} from "lucide-react";
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import QRCode from "qrcode";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/scanner")({
  head: () => ({ meta: [{ title: "Scanner - Supplify" }] }),
  component: Scanner,
});

type ScannerItem = {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  reorder_level: number;
  acquisition_cost: number;
  inventory_classification: string;
  semi_expendable_tier: string | null;
  accountability_status: string;
  barcode_value: string | null;
  qr_code_value: string | null;
  updated_at: string;
  category: { name: string } | null;
  supplier: { name: string } | null;
};

type RecentTransaction = {
  id: string;
  type: "IN" | "OUT";
  quantity: number;
  staff_name: string | null;
  remarks: string | null;
  created_at: string;
};

type ScanEntry = { id: string; name: string; code: string; scannedAt: Date };

const ITEM_SELECT =
  "id,name,description,quantity,unit,reorder_level,acquisition_cost,inventory_classification,semi_expendable_tier,accountability_status,barcode_value,qr_code_value,updated_at,category:categories(name),supplier:suppliers(name)";

function Scanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const processingRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<ScannerItem | null>(null);
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [history, setHistory] = useState<ScanEntry[]>([]);
  const [labelOpen, setLabelOpen] = useState(false);

  const isSecure = typeof window === "undefined" || window.isSecureContext;
  const hasCameraApi =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  useEffect(() => () => stopCamera(), []);

  async function findItem(code: string) {
    const value = code.trim();
    const withoutPrefix = value.replace(/^ITEM:/i, "");
    const candidates: Array<{
      column: "qr_code_value" | "barcode_value" | "id";
      value: string;
    }> = [
      { column: "qr_code_value", value },
      { column: "barcode_value", value: withoutPrefix },
    ];
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        withoutPrefix,
      )
    ) {
      candidates.push({ column: "id", value: withoutPrefix });
    }

    for (const candidate of candidates) {
      const response = await supabase
        .from("items")
        .select(ITEM_SELECT)
        .eq(candidate.column, candidate.value)
        .limit(1)
        .maybeSingle();
      if (response.error) throw response.error;
      if (response.data) return response.data as unknown as ScannerItem;
    }
    return null;
  }

  async function lookup(code: string, fromCamera = false) {
    const value = code.trim();
    if (!value || loading) return;
    setLoading(true);
    try {
      const item = await findItem(value);
      if (!item) {
        setResult(null);
        setTransactions([]);
        toast.error("No inventory item matches that code.");
        return;
      }

      const transactionResponse = await supabase
        .from("transactions")
        .select("id,type,quantity,staff_name,remarks,created_at")
        .eq("item_id", item.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setResult(item);
      setTransactions((transactionResponse.data ?? []) as RecentTransaction[]);
      setManualCode(value);
      setHistory((current) =>
        [
          {
            id: `${item.id}-${Date.now()}`,
            name: item.name,
            code: value,
            scannedAt: new Date(),
          },
          ...current.filter(
            (entry) => entry.id.split("-").slice(0, 5).join("-") !== item.id,
          ),
        ].slice(0, 5),
      );
      toast.success(fromCamera ? "Code scanned successfully" : "Item found");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to look up this item.",
      );
    } finally {
      setLoading(false);
      processingRef.current = false;
    }
  }

  async function startCamera() {
    if (!isSecure) {
      setCameraError(
        "Camera access requires HTTPS when opened from another phone or computer.",
      );
      return;
    }
    if (!hasCameraApi || !videoRef.current) {
      setCameraError(
        "This browser does not provide camera access. Use manual lookup instead.",
      );
      return;
    }

    setCameraError("");
    processingRef.current = false;
    try {
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        videoRef.current,
        (scanResult) => {
          if (!scanResult || processingRef.current) return;
          processingRef.current = true;
          stopCamera();
          void lookup(scanResult.getText(), true);
        },
      );
      controlsRef.current = controls;
      setScanning(true);
    } catch (error) {
      stopCamera();
      const message = cameraMessage(error);
      setCameraError(message);
      toast.error(message);
    }
  }

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    if (videoRef.current?.srcObject instanceof MediaStream) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  }

  function submitManual(event: React.FormEvent) {
    event.preventDefault();
    void lookup(manualCode);
  }

  return (
    <div>
      <PageHeader
        title="Scanner"
        subtitle="Scan a QR or barcode to open its inventory record"
      />
      <div className="space-y-5 p-4 sm:p-6 lg:p-8">
        <ScannerReadiness isSecure={isSecure} hasCameraApi={hasCameraApi} />

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="relative aspect-[4/3] min-h-64 overflow-hidden bg-slate-950 sm:aspect-video">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                muted
                playsInline
              />
              {!scanning && (
                <div className="absolute inset-0 grid place-items-center p-6 text-center">
                  <div>
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/10 text-white">
                      <QrCode className="h-8 w-8" />
                    </div>
                    <p className="mt-4 font-medium text-white">
                      Camera preview
                    </p>
                    <p className="mt-1 max-w-sm text-sm text-slate-300">
                      Place an inventory label inside the frame.
                    </p>
                  </div>
                </div>
              )}
              {scanning && (
                <div className="scanner-frame absolute inset-[12%] rounded-xl border-2 border-emerald-400" />
              )}
              {scanning && (
                <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium text-white">
                  Scanning…
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-border p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void startCamera()}
                  disabled={scanning}
                  className="scanner-primary"
                >
                  <Camera className="h-4 w-4" /> Start camera
                </button>
                <button
                  onClick={stopCamera}
                  disabled={!scanning}
                  className="scanner-secondary"
                >
                  <Square className="h-4 w-4" /> Stop
                </button>
              </div>
              {cameraError && (
                <div className="flex gap-2 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}
              <div className="relative flex items-center gap-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>or enter a code</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <form onSubmit={submitManual} className="flex gap-2">
                <input
                  className="scanner-input"
                  placeholder="ITEM:…, UUID, or barcode value"
                  value={manualCode}
                  onChange={(event) => setManualCode(event.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                <button
                  disabled={loading || !manualCode.trim()}
                  className="scanner-secondary min-w-11"
                  aria-label="Find item"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </button>
              </form>
            </div>
          </div>

          <ItemResult
            item={result}
            transactions={transactions}
            onCreateLabel={() => setLabelOpen(true)}
          />
        </section>

        <ScanHistory
          entries={history}
          onSelect={(entry) => void lookup(entry.code)}
        />

        <section className="rounded-xl border border-dashed border-border bg-muted/25 p-4 text-sm">
          <div className="flex items-start gap-3">
            <Wifi className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Phone showcase note</p>
              <p className="mt-1 text-muted-foreground">
                A phone can use this page directly—no desktop pairing is
                required. It must open the app over HTTPS and be able to reach
                Supabase. Plain local-network HTTP may load the page but mobile
                browsers will block its camera.
              </p>
            </div>
          </div>
        </section>
      </div>

      {labelOpen && result && (
        <LabelDialog item={result} onClose={() => setLabelOpen(false)} />
      )}
      <style>{scannerStyles}</style>
    </div>
  );
}

function ScannerReadiness({
  isSecure,
  hasCameraApi,
}: {
  isSecure: boolean;
  hasCameraApi: boolean;
}) {
  const ready = isSecure && hasCameraApi;
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm ${ready ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/25" : "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/25"}`}
    >
      <div className="flex items-center gap-2">
        {ready ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        )}
        <span className="font-medium">
          {ready
            ? "Camera scanning is available"
            : "Manual lookup is available"}
        </span>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" />{" "}
          {isSecure ? "Secure page" : "HTTPS required"}
        </span>
        <span className="flex items-center gap-1">
          <Camera className="h-3.5 w-3.5" />{" "}
          {hasCameraApi ? "Camera detected" : "Camera unavailable"}
        </span>
      </div>
    </div>
  );
}

function ItemResult({
  item,
  transactions,
  onCreateLabel,
}: {
  item: ScannerItem | null;
  transactions: RecentTransaction[];
  onCreateLabel: () => void;
}) {
  if (!item) {
    return (
      <section className="grid min-h-80 place-items-center rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
            <Package className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-semibold">No item selected</h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Scan a label or enter its code to display current inventory details.
          </p>
        </div>
      </section>
    );
  }

  const lowStock = item.quantity <= item.reorder_level;
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{item.name}</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${lowStock ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"}`}
            >
              {lowStock ? "Low stock" : "In stock"}
            </span>
          </div>
          {item.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {item.description}
            </p>
          )}
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Package className="h-5 w-5" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-sm">
        <Detail label="Available" value={`${item.quantity} ${item.unit}`} />
        <Detail
          label="Reorder level"
          value={`${item.reorder_level} ${item.unit}`}
        />
        <Detail label="Classification" value={classificationLabel(item)} />
        <Detail
          label="Accountability"
          value={titleCase(item.accountability_status || "available")}
        />
        <Detail label="Category" value={item.category?.name || "—"} />
        <Detail label="Supplier" value={item.supplier?.name || "—"} />
        <Detail
          label="Acquisition cost"
          value={money(Number(item.acquisition_cost || 0))}
        />
        <Detail
          label="Updated"
          value={new Date(item.updated_at).toLocaleDateString("en-PH")}
        />
      </div>

      <div className="border-t border-border p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <History className="h-4 w-4" /> Recent activity
        </div>
        {transactions.length ? (
          <div className="space-y-2">
            {transactions.slice(0, 3).map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="truncate text-muted-foreground">
                  {transaction.type === "IN"
                    ? "Stock received"
                    : "Stock issued"}
                  {transaction.staff_name ? ` · ${transaction.staff_name}` : ""}
                </span>
                <span
                  className={`shrink-0 font-medium ${transaction.type === "IN" ? "text-emerald-600" : "text-amber-600"}`}
                >
                  {transaction.type === "IN" ? "+" : "−"}
                  {transaction.quantity}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No transactions recorded yet.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border p-4">
        <button onClick={onCreateLabel} className="scanner-primary">
          <QrCode className="h-4 w-4" /> View label
        </button>
        <Link to="/inventory" className="scanner-secondary">
          <ExternalLink className="h-4 w-4" /> Open inventory
        </Link>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}

function ScanHistory({
  entries,
  onSelect,
}: {
  entries: ScanEntry[];
  onSelect: (entry: ScanEntry) => void;
}) {
  if (!entries.length) return null;
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 font-medium">
        <History className="h-4 w-4" /> Recent scans
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelect(entry)}
            className="rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50"
          >
            <div className="truncate text-sm font-medium">{entry.name}</div>
            <div className="mt-1 flex justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">{entry.code}</span>
              <span>
                {entry.scannedAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function LabelDialog({
  item,
  onClose,
}: {
  item: ScannerItem;
  onClose: () => void;
}) {
  const [qrUrl, setQrUrl] = useState("");
  const code = useMemo(() => item.qr_code_value || `ITEM:${item.id}`, [item]);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(code, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => active && setQrUrl(url))
      .catch(() => toast.error("Unable to generate this QR label."));
    return () => {
      active = false;
    };
  }, [code]);

  function download() {
    const anchor = document.createElement("a");
    anchor.href = qrUrl;
    anchor.download = `${safeFileName(item.name)}-qr.png`;
    anchor.click();
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    toast.success("Code copied");
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="font-semibold">Inventory label</h2>
            <p className="text-xs text-muted-foreground">
              Print and attach this label to the item.
            </p>
          </div>
          <button onClick={onClose} className="scanner-secondary px-3">
            Close
          </button>
        </div>
        <div className="p-5">
          <div
            id="inventory-print-label"
            className="mx-auto max-w-xs rounded-lg border-2 border-slate-900 bg-white p-4 text-center text-slate-950"
          >
            <div className="text-xs font-bold uppercase tracking-wider">
              TESDA Inventory
            </div>
            <div className="mt-1 truncate text-base font-bold">{item.name}</div>
            {qrUrl ? (
              <img
                src={qrUrl}
                alt={`QR code for ${item.name}`}
                className="mx-auto mt-3 aspect-square w-52"
              />
            ) : (
              <div className="mx-auto mt-3 grid h-52 w-52 place-items-center bg-slate-100">
                <Loader2 className="animate-spin" />
              </div>
            )}
            <div className="mt-2 break-all font-mono text-[10px]">{code}</div>
            <div className="mt-2 text-[10px] text-slate-600">
              Scan with the Supplify inventory scanner
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              onClick={() => void copyCode()}
              className="scanner-secondary"
            >
              <Clipboard className="h-4 w-4" /> Copy
            </button>
            <button
              onClick={download}
              disabled={!qrUrl}
              className="scanner-secondary"
            >
              <Download className="h-4 w-4" /> Save
            </button>
            <button onClick={() => window.print()} className="scanner-primary">
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function cameraMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError")
      return "Camera permission was denied. Allow camera access in the browser settings and try again.";
    if (error.name === "NotFoundError")
      return "No camera was found on this device.";
    if (error.name === "NotReadableError")
      return "The camera is currently being used by another application.";
  }
  return "Unable to start the camera. You can still enter the item code manually.";
}

function classificationLabel(
  item: Pick<ScannerItem, "inventory_classification" | "semi_expendable_tier">,
) {
  if (item.inventory_classification === "ppe") return "PPE";
  if (item.inventory_classification === "semi_expendable_property")
    return item.semi_expendable_tier === "high_value"
      ? "Semi-expendable · High value"
      : "Semi-expendable · Low value";
  return "Expendable supply";
}

function money(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value || 0);
}

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeFileName(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "inventory-item"
  );
}

const scannerStyles = `
.scanner-primary,.scanner-secondary{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;border-radius:6px;padding:.55rem .85rem;font-size:.875rem;font-weight:600;transition:background-color .15s,opacity .15s}
.scanner-primary{background:var(--color-primary);color:var(--color-primary-foreground)}
.scanner-primary:hover{opacity:.9}
.scanner-secondary{border:1px solid var(--color-input);background:var(--color-card);color:var(--color-foreground)}
.scanner-secondary:hover{background:var(--color-muted)}
.scanner-primary:disabled,.scanner-secondary:disabled{opacity:.5;cursor:not-allowed}
.scanner-input{width:100%;min-width:0;border:1px solid var(--color-input);background:var(--color-card);border-radius:6px;padding:.6rem .75rem;font-size:.875rem;outline:none}
.scanner-input:focus{border-color:var(--color-ring);box-shadow:0 0 0 2px color-mix(in srgb,var(--color-ring) 20%,transparent)}
.scanner-frame{box-shadow:0 0 0 999px rgba(2,6,23,.38),0 0 24px rgba(52,211,153,.25)}
@media print{body *{visibility:hidden!important}#inventory-print-label,#inventory-print-label *{visibility:visible!important}#inventory-print-label{position:fixed;left:0;top:0;width:76mm;max-width:none!important;border-color:#0f172a!important}}
`;
