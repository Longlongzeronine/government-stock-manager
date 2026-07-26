import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, Search, Square } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { getItem } from "@/lib/data.functions";

export const Route = createFileRoute("/_app/scanner")({
  head: () => ({ meta: [{ title: "Scanner - Supplify" }] }),
  component: Scanner,
});

function Scanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<any | null>(null);

  async function lookup(code: string) {
    const value = code.trim();
    if (!value) return;
    const item = await getItem({ data: { id: value } });
    if (!item) {
      toast.error("No item found for this code.");
      return;
    }
    setResult(item);
    toast.success("Item found");
  }

  async function startCamera() {
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) {
      toast.error("This browser does not support camera barcode detection. Use manual lookup.");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    streamRef.current = stream;
    setScanning(true);
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    const detector = new Detector({ formats: ["qr_code", "code_128", "ean_13", "ean_8", "upc_a", "upc_e"] });
    const scan = async () => {
      if (!videoRef.current || !streamRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0) {
          stopCamera();
          lookup(codes[0].rawValue);
          return;
        }
      } catch {
        stopCamera();
        toast.error("Unable to scan from the camera.");
        return;
      }
      requestAnimationFrame(scan);
    };
    requestAnimationFrame(scan);
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }

  return (
    <div>
      <PageHeader title="Scanner" subtitle="Scan or lookup item QR/barcode values" />
      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="overflow-hidden rounded-lg border border-border bg-black">
              <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={startCamera} disabled={scanning} className="scanner-primary">
                  <Camera className="h-4 w-4" /> Start
                </button>
                <button onClick={stopCamera} disabled={!scanning} className="scanner-secondary">
                  <Square className="h-4 w-4" /> Stop
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  className="scanner-input"
                  placeholder="Scan code or enter item id/barcode"
                  value={manualCode}
                  onChange={(event) => setManualCode(event.target.value)}
                />
                <button onClick={() => lookup(manualCode)} className="scanner-secondary">
                  <Search className="h-4 w-4" />
                </button>
              </div>
              {result && (
                <div className="rounded-lg border border-border bg-background p-3 text-sm">
                  <div className="font-semibold">{result.name}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>Qty: {result.quantity} {result.unit}</div>
                    <div>Cost: {money(Number(result.acquisition_cost || 0))}</div>
                    <div>Class: {classificationLabel(result)}</div>
                    <div>Barcode: {result.barcode_value || "-"}</div>
                  </div>
                  <Link to="/inventory" className="mt-3 inline-flex text-sm font-medium text-primary">
                    Open inventory
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
      <style>{`
.scanner-primary,.scanner-secondary{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;border-radius:6px;padding:.55rem .85rem;font-size:.875rem;font-weight:600}
.scanner-primary{background:var(--color-primary);color:var(--color-primary-foreground)}
.scanner-secondary{border:1px solid var(--color-input);background:var(--color-card);color:var(--color-foreground)}
.scanner-primary:disabled,.scanner-secondary:disabled{opacity:.55;cursor:not-allowed}
.scanner-input{width:100%;border:1px solid var(--color-input);background:var(--color-card);border-radius:6px;padding:.55rem .7rem;font-size:.875rem;outline:none}
      `}</style>
    </div>
  );
}

function classificationLabel(item: any) {
  if (item.inventory_classification === "ppe") return "PPE";
  if (item.inventory_classification === "semi_expendable_property") {
    return item.semi_expendable_tier === "high_value" ? "Semi-Exp. High" : "Semi-Exp. Low";
  }
  return "Expendable";
}

function money(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value || 0);
}
