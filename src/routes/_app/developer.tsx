import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftRight, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/_app/developer")({
  head: () => ({ meta: [{ title: "Developer Mode - Supplify" }] }),
  component: DeveloperModePage,
});

function DeveloperModePage() {
  const { developerUsername } = useAuth();

  return (
    <div>
      <PageHeader
        title="Developer Mode"
        subtitle={`Signed in as ${developerUsername ?? "developer"}`}
      />
      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2 lg:p-8">
        <Link
          to="/requisitions"
          className="flex items-center gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:bg-accent"
        >
          <ClipboardList className="h-5 w-5 text-primary" />
          <span>
            <span className="block font-medium">Requisitions</span>
            <span className="text-sm text-muted-foreground">Create and manage requisition forms</span>
          </span>
        </Link>
        <Link
          to="/stock"
          className="flex items-center gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:bg-accent"
        >
          <ArrowLeftRight className="h-5 w-5 text-primary" />
          <span>
            <span className="block font-medium">Stock In / Out</span>
            <span className="text-sm text-muted-foreground">Review and record stock movements</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
