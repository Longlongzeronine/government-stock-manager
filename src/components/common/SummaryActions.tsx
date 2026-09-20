import { Download, Printer } from "lucide-react";

export function SummaryActions({
  onExport,
  onPrint,
}: {
  onExport: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-border bg-card p-1">
      <button
        type="button"
        onClick={onExport}
        className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        title="Export summary"
      >
        <Download className="h-3.5 w-3.5" /> Export
      </button>
      <button
        type="button"
        onClick={onPrint}
        className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        title="Print summary"
      >
        <Printer className="h-3.5 w-3.5" /> Print
      </button>
    </div>
  );
}
