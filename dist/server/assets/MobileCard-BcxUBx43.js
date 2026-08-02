import { W as jsxRuntimeExports } from "./server-DkTiwXTO.js";
import { a as cn } from "./AppShell-a1FTjCXc.js";
function MobileCard({ children, className }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn(
    "bg-card border border-border rounded-lg p-4 space-y-3",
    className
  ), children });
}
function MobileCardRow({ label, value, align = "left" }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("flex justify-between items-center gap-2", align === "right" && "flex-row-reverse text-right"), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium", children: value })
  ] });
}
export {
  MobileCard as M,
  MobileCardRow as a
};
