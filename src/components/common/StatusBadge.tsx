import { cn } from "@/lib/utils";

export function StatusBadge({ quantity, reorder }: { quantity: number; reorder: number }) {
  let label = "Normal";
  let cls = "bg-success/15 text-success border-success/30";
  if (quantity === 0) { label = "Out of Stock"; cls = "bg-destructive/15 text-destructive border-destructive/30"; }
  else if (quantity <= Math.max(1, Math.floor(reorder / 2))) { label = "Critical"; cls = "bg-destructive/15 text-destructive border-destructive/30"; }
  else if (quantity <= reorder) { label = "Low"; cls = "bg-warning/20 text-warning-foreground border-warning/40"; }
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", cls)}>{label}</span>;
}
