import { r as reactExports, W as jsxRuntimeExports } from "./server-DkTiwXTO.js";
import { L as Link, t as toast } from "./router-CfAHfNkT.js";
import { c as createLucideIcon, P as PageHeader } from "./AppShell-a1FTjCXc.js";
import { g as getItem } from "./data.functions-BJW9FjRX.js";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-onWpx3op.js";
import "./use-mobile-BiTvKiC1.js";
const __iconNode$2 = [
  [
    "path",
    {
      d: "M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z",
      key: "18u6gg"
    }
  ],
  ["circle", { cx: "12", cy: "13", r: "3", key: "1vg3eu" }]
];
const Camera = createLucideIcon("camera", __iconNode$2);
const __iconNode$1 = [
  ["path", { d: "m21 21-4.34-4.34", key: "14j7rj" }],
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }]
];
const Search = createLucideIcon("search", __iconNode$1);
const __iconNode = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }]
];
const Square = createLucideIcon("square", __iconNode);
function Scanner() {
  const videoRef = reactExports.useRef(null);
  const streamRef = reactExports.useRef(null);
  const [scanning, setScanning] = reactExports.useState(false);
  const [manualCode, setManualCode] = reactExports.useState("");
  const [result, setResult] = reactExports.useState(null);
  async function lookup(code) {
    const value = code.trim();
    if (!value) return;
    const item = await getItem({
      data: {
        id: value
      }
    });
    if (!item) {
      toast.error("No item found for this code.");
      return;
    }
    setResult(item);
    toast.success("Item found");
  }
  async function startCamera() {
    const Detector = window.BarcodeDetector;
    if (!Detector) {
      toast.error("This browser does not support camera barcode detection. Use manual lookup.");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment"
      },
      audio: false
    });
    streamRef.current = stream;
    setScanning(true);
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    const detector = new Detector({
      formats: ["qr_code", "code_128", "ean_13", "ean_8", "upc_a", "upc_e"]
    });
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Scanner", subtitle: "Scan or lookup item QR/barcode values" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4 p-4 sm:p-6 lg:p-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "rounded-lg border border-border bg-card p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-hidden rounded-lg border border-border bg-black", children: /* @__PURE__ */ jsxRuntimeExports.jsx("video", { ref: videoRef, className: "aspect-video w-full object-cover", muted: true, playsInline: true }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: startCamera, disabled: scanning, className: "scanner-primary", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { className: "h-4 w-4" }),
            " Start"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: stopCamera, disabled: !scanning, className: "scanner-secondary", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Square, { className: "h-4 w-4" }),
            " Stop"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "scanner-input", placeholder: "Scan code or enter item id/barcode", value: manualCode, onChange: (event) => setManualCode(event.target.value) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => lookup(manualCode), className: "scanner-secondary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "h-4 w-4" }) })
        ] }),
        result && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border bg-background p-3 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-semibold", children: result.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 grid grid-cols-2 gap-2 text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              "Qty: ",
              result.quantity,
              " ",
              result.unit
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              "Cost: ",
              money(Number(result.acquisition_cost || 0))
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              "Class: ",
              classificationLabel(result)
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              "Barcode: ",
              result.barcode_value || "-"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/inventory", className: "mt-3 inline-flex text-sm font-medium text-primary", children: "Open inventory" })
        ] })
      ] })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `
.scanner-primary,.scanner-secondary{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;border-radius:6px;padding:.55rem .85rem;font-size:.875rem;font-weight:600}
.scanner-primary{background:var(--color-primary);color:var(--color-primary-foreground)}
.scanner-secondary{border:1px solid var(--color-input);background:var(--color-card);color:var(--color-foreground)}
.scanner-primary:disabled,.scanner-secondary:disabled{opacity:.55;cursor:not-allowed}
.scanner-input{width:100%;border:1px solid var(--color-input);background:var(--color-card);border-radius:6px;padding:.55rem .7rem;font-size:.875rem;outline:none}
      ` })
  ] });
}
function classificationLabel(item) {
  if (item.inventory_classification === "ppe") return "PPE";
  if (item.inventory_classification === "semi_expendable_property") {
    return item.semi_expendable_tier === "high_value" ? "Semi-Exp. High" : "Semi-Exp. Low";
  }
  return "Expendable";
}
function money(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(value || 0);
}
export {
  Scanner as component
};
