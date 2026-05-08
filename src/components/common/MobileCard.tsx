import { cn } from "@/lib/utils";

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileCard({ children, className }: MobileCardProps) {
  return (
    <div className={cn(
      "bg-card border border-border rounded-lg p-4 space-y-3",
      className
    )}>
      {children}
    </div>
  );
}

interface MobileCardRowProps {
  label: string;
  value: React.ReactNode;
  align?: "left" | "right";
}

export function MobileCardRow({ label, value, align = "left" }: MobileCardRowProps) {
  return (
    <div className={cn("flex justify-between items-center gap-2", align === "right" && "flex-row-reverse text-right")}>
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}