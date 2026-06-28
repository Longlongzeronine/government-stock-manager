import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Keyboard, ScanLine } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_app/scan")({
  head: () => ({ meta: [{ title: "Scan QR — Supplify" }] }),
  component: ScanQr,
});

function ScanQr() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState("Camera ready.");
  const [manual, setManual] = useState("");
  const [scanning, setScanning] = useState(false);
  const detectorSupported = typeof window !== "undefined" && "BarcodeDetector" in window;

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function startCamera() {
    if (!detectorSupported) {
      setStatus("Browser QR detector not available. Paste QR link/code below.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      setStatus("Scanning...");
      scanLoop();
    } catch (error: any) {
      setStatus(error?.message || "Camera permission denied.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }

  async function scanLoop() {
    const BarcodeDetectorCtor = (window as any).BarcodeDetector;
    const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
    let active = true;
    const tick = async () => {
      if (!active || !videoRef.current || !streamRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        const raw = codes?.[0]?.rawValue;
        if (raw) {
          active = false;
          stopCamera();
          openQr(raw);
          return;
        }
      } catch {
        setStatus("Scanner had trouble reading frame. Try brighter light.");
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function openQr(raw: string) {
    const id = parseQrId(raw.trim());
    if (!id) {
      setStatus("Invalid Supplify QR. Expected /item-qr/:id.");
      return;
    }
    navigate({ to: "/item-qr/$id", params: { id } });
  }

  return (
    <div>
      <PageHeader title="Scan QR" subtitle="Scan item QR codes and open protected item detail page" />
      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8">
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="aspect-video bg-black">
            <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-3">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ScanLine className="h-4 w-4" /> {status}
            </div>
            <div className="flex gap-2">
              <button onClick={startCamera} disabled={scanning} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                <Camera className="h-4 w-4" /> Start
              </button>
              <button onClick={stopCamera} className="rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
                Stop
              </button>
            </div>
          </div>
        </section>

        <aside className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Keyboard className="h-4 w-4" /> Manual fallback
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Paste QR URL or item UUID when camera scanning is unavailable.
          </p>
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="/item-qr/item-id"
            className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button onClick={() => openQr(manual)} className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            Open item
          </button>
          {!detectorSupported && (
            <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
              Native scanner unsupported in this browser. Use Chrome/Edge or manual entry.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function parseQrId(raw: string) {
  const uuidish = /^[0-9a-fA-F-]{16,}$/;
  if (uuidish.test(raw)) return raw;
  try {
    const url = raw.startsWith("http") ? new URL(raw) : new URL(raw, window.location.origin);
    const match = url.pathname.match(/^\/item-qr\/([^/]+)$/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    const match = raw.match(/\/item-qr\/([^/]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }
}
