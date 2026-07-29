import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { listItems, listTransactions } from "@/lib/data.functions";
import { PageHeader } from "@/components/layout/AppShell";
import { Package, AlertTriangle, XCircle, ArrowLeftRight, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { Link } from "@tanstack/react-router";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Supplify" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { canWrite, isAdmin } = useAuth();
  const { data: items = [], refetch: rItems } = useQuery({
    queryKey: ["items"],
    queryFn: () => listItems(),
    refetchInterval: 3000,
  });
  const { data: txs = [], refetch: rTx } = useQuery({
    queryKey: ["tx", "recent"],
    queryFn: () => listTransactions({ data: { limit: 200 } }),
    refetchInterval: 3000,
  });

  // Live polling is handled by refetchInterval in the queries above

  const total = items.length;
  const low = items.filter((i: any) => i.quantity > 0 && i.quantity <= i.reorder_level).length;
  const out = items.filter((i: any) => i.quantity === 0).length;
  const txMonth = txs.filter((t: any) => new Date(t.created_at) >= subDays(new Date(), 30)).length;

  // 30-day usage chart (OUT only)
  const days = Array.from({ length: 30 }, (_, i) => startOfDay(subDays(new Date(), 29 - i)));
  const series = days.map((d) => {
    const key = format(d, "MMM d");
    const total = txs
      .filter(
        (t: any) => t.type === "OUT" && format(startOfDay(new Date(t.created_at)), "MMM d") === key,
      )
      .reduce((s: number, t: any) => s + t.quantity, 0);
    return { day: key, used: total };
  });

  const lowItems = items.filter((i: any) => i.quantity <= i.reorder_level).slice(0, 8);
  const recentTx = txs.slice(0, 8);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Live overview of inventory operations" />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={Package} label="Total Items" value={total} tone="navy" />
          <Stat icon={AlertTriangle} label="Low Stock" value={low} tone="warning" />
          <Stat icon={XCircle} label="Out of Stock" value={out} tone="destructive" />
          <Stat icon={ArrowLeftRight} label="Transactions (30d)" value={txMonth} tone="success" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg">Monthly Usage</h2>
                <p className="text-xs text-muted-foreground">
                  Stock-out volume per day, last 30 days
                </p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="h-48 sm:h-56 lg:h-64">
              <ResponsiveContainer>
                <LineChart data={series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid
                    stroke="var(--color-border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10 }}
                    stroke="var(--color-muted-foreground)"
                    interval={4}
                  />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="used"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 sm:p-5">
            <h2 className="text-lg mb-3">Quick Actions</h2>
            <div className="space-y-2">
              {isAdmin && (
                <Link
                  to="/inventory"
                  className="block rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                >
                  + Add new item
                </Link>
              )}
              {canWrite && (
                <Link
                  to="/stock"
                  className="block rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                >
                  Record stock movement
                </Link>
              )}
              {canWrite && (
                <Link
                  to="/suppliers"
                  className="block rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                >
                  Manage suppliers
                </Link>
              )}
              <Link
                to="/assistant"
                className="block rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
              >
                Ask the AI assistant
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-lg">
            <div className="p-4 sm:p-5 border-b border-border">
              <h2 className="text-lg">Low Stock Alerts</h2>
            </div>
            <div className="divide-y divide-border">
              {lowItems.length === 0 && (
                <div className="p-5 text-sm text-muted-foreground">
                  All items at healthy stock levels.
                </div>
              )}
              {lowItems.map((i: any) => (
                <div key={i.id} className="p-3 sm:p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-sm">{i.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {i.quantity} {i.unit} · reorder at {i.reorder_level}
                    </div>
                  </div>
                  <StatusBadge quantity={i.quantity} reorder={i.reorder_level} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg">
            <div className="p-4 sm:p-5 border-b border-border">
              <h2 className="text-lg">Recent Transactions</h2>
            </div>
            <div className="divide-y divide-border">
              {recentTx.length === 0 && (
                <div className="p-5 text-sm text-muted-foreground">
                  No transactions recorded yet.
                </div>
              )}
              {recentTx.map((t: any) => (
                <div key={t.id} className="p-3 sm:p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-sm">{t.item?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.staff_name ?? "—"} · {format(new Date(t.created_at), "MMM d, HH:mm")}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${t.type === "IN" ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"}`}
                  >
                    {t.type} {t.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: any) {
  const toneCls = {
    navy: "bg-navy text-navy-foreground",
    warning: "bg-warning/15 text-warning-foreground",
    destructive: "bg-destructive/15 text-destructive",
    success: "bg-success/15 text-success",
  }[tone as string];
  return (
    <div className="bg-card border border-border rounded-lg p-5 flex items-center gap-4">
      <div className={`h-11 w-11 rounded-md grid place-items-center ${toneCls}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
