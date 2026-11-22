import { createFileRoute, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { routeAccessForPath } from "@/lib/access-control";
import { useEffect } from "react";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    // Auth guard is handled client-side in AppShellGuard to avoid
    // SSR issues where browser localStorage (session) isn't available.
  },
  component: () => <AppShellGuard />,
});

function AppShellGuard() {
  const { session, loading, developerMode, accessLoading, canAccess } = useAuth();
  const router = useRouter();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const requirement = routeAccessForPath(path);
  const permitted = !requirement || canAccess(requirement.module, requirement.action ?? "view");

  useEffect(() => {
    // Wait for AuthContext to hydrate from localStorage, then redirect
    // if no session is found.
    if (!loading && !session && !developerMode) {
      router.navigate({ to: "/login" });
    }
  }, [session, loading, developerMode, router]);

  // Prevent flash of app content while checking auth
  if (loading || accessLoading || (!session && !developerMode)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!permitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-destructive">Access denied</p>
          <h1 className="mt-2 text-2xl font-semibold">This page is not assigned to your account</h1>
          <p className="mt-3 text-sm text-muted-foreground">Ask a User Access administrator to enable {requirement?.module}.{requirement?.action ?? "view"} for your account.</p>
          <button onClick={() => router.history.back()} className="mt-5 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent">Go back</button>
        </div>
      </div>
    );
  }

  return <AppShell />;
}

// Re-export Outlet so children render via AppShell's <Outlet />
export { Outlet };
