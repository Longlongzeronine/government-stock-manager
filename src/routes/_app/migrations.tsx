import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Filter, Loader2, Play, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { listMigrationStatus, runPendingMigrations } from "@/lib/migration.functions";

export const Route = createFileRoute("/_app/migrations")({
  head: () => ({ meta: [{ title: "Migrations — Supplify Dev Space" }] }),
  component: MigrationsPage,
});

function MigrationsPage() {
  const { canAccess } = useAuth();
  const [confirmation, setConfirmation] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [running, setRunning] = useState(false);
  const canRun = canAccess("migrations", "run");
  const query = useQuery({
    queryKey: ["dev-space", "migrations"],
    queryFn: () => listMigrationStatus(),
    enabled: canAccess("migrations", "view"),
    refetchOnWindowFocus: false,
  });
  const data: any = query.data;
  const files = useMemo(() => (data?.files ?? []).filter((file: any) => (
    (filter === "all" || file.status === filter)
    && (!search.trim() || `${file.filename} ${file.name}`.toLowerCase().includes(search.trim().toLowerCase()))
  )), [data?.files, filter, search]);
  const confirmed = confirmation.trim().toUpperCase() === "RUN";
  const pendingCount = Number(data?.pending ?? 0);
  const runBlockedReason = !canRun
    ? "This account does not have the migrations.run permission."
    : query.isLoading
      ? "Checking the migration database connection…"
      : !data?.ready
        ? "Migration database unavailable. Configure MIGRATION_DATABASE_URL on the server, then refresh."
        : pendingCount === 0
          ? "There are no pending migrations."
          : !confirmed
            ? "Type RUN in the confirmation field first."
            : null;

  async function run() {
    if (runBlockedReason || running) return;
    setRunning(true);
    try {
      const result = await runPendingMigrations({ data: { confirmation } });
      toast.success(result.ran ? `${result.ran} migration${result.ran === 1 ? "" : "s"} executed` : "Database is already up to date");
      setConfirmation("");
      await query.refetch();
    } catch (error: any) {
      toast.error(error?.message ?? "Migration failed");
    } finally {
      setRunning(false);
    }
  }

  const runButton = (label: string, compact = false) => <button
    type="button"
    onClick={() => void run()}
    disabled={Boolean(runBlockedReason) || running}
    title={runBlockedReason ?? `Run ${pendingCount} pending migration${pendingCount === 1 ? "" : "s"}`}
    className={`inline-flex items-center justify-center gap-2 rounded-md bg-primary font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 ${compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}`}
  >
    {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
    {label}
  </button>;

  return <div>
    <PageHeader
      title="Migrations"
      subtitle="Review database migration status and run bundled Supplify changes"
      actions={runButton(pendingCount > 0 ? `Run Pending (${pendingCount})` : "Run Pending")}
    />
    <div className="space-y-4 bg-muted/25 p-4 sm:p-6 lg:p-8">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total Files" value={data?.total ?? "—"} />
        <Stat label="Pending" value={data?.pending ?? "—"} tone="pending" />
        <Stat label="Executed" value={data?.executed ?? "—"} tone="success" />
        <Stat label="Latest Version" value={data?.latestBatch ?? "—"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Database</p>
          <h2 className="mt-1 font-semibold">Environment Status</h2>
          <dl className="mt-3 divide-y divide-border text-sm">
            <Row label="Connection" value={data?.connection ?? "checking"} />
            <Row label="Database" value={data?.database ?? "checking"} />
            <Row label="Migration tracking" value={data?.ready ? "Ready" : "Unavailable"} />
          </dl>
          {data?.error && <p className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{data.error}</p>}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</p>
          <h2 className="mt-1 font-semibold">Run Pending Migrations</h2>
          <label htmlFor="migration-confirmation" className="mt-3 block text-xs font-semibold">Confirmation</label>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
            <input
              id="migration-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="Type RUN"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            {runButton("Run Pending")}
          </div>
          <p className={`mt-3 rounded-lg border p-3 text-xs ${runBlockedReason ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
            {runBlockedReason ?? `Ready to execute ${pendingCount} pending migration${pendingCount === 1 ? "" : "s"}. Each file runs in its own transaction.`}
          </p>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <div className="mr-auto"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Files</p><h2 className="font-semibold">Migration Status</h2></div>
          <label className="relative"><Filter className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-md border border-input bg-background py-2 pl-9 pr-8 text-sm"><option value="all">All</option><option value="pending">Pending</option><option value="executed">Executed</option></select></label>
          <label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search migration" className="rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm" /></label>
          <button type="button" onClick={() => void query.refetch()} className="rounded-md border border-input p-2 hover:bg-accent" aria-label="Refresh"><RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3 text-left">Migration</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Version</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
            <tbody>
              {query.isLoading && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">Loading migration state…</td></tr>}
              {files.map((file: any) => <tr key={file.filename} className="border-t border-border">
                <td className="px-4 py-3"><p className="font-medium text-primary">{file.name}</p><p className="text-xs text-muted-foreground">{file.filename}</p></td>
                <td className="px-4 py-3 tabular-nums">{file.date}</td>
                <td className="px-4 py-3"><span className={`inline-flex min-w-24 justify-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${file.status === "executed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{file.status}</span></td>
                <td className="px-4 py-3 tabular-nums">{file.version}</td>
                <td className="px-4 py-3 text-right">{file.status === "pending" ? runButton("Run", true) : <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-800"><Check className="h-3 w-3" />Applied</span>}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>;
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-semibold tabular-nums ${tone === "pending" ? "text-amber-700" : tone === "success" ? "text-emerald-700" : "text-primary"}`}>{value}</p></div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 py-2"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>;
}
