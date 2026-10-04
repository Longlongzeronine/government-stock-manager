import { createFileRoute, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    // Auth guard is handled client-side in AppShellGuard to avoid
    // SSR issues where browser localStorage (session) isn't available.
  },
  component: () => <AppShellGuard />,
});

function AppShellGuard() {
  const { session, loading, developerMode } = useAuth();
  const router = useRouter();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const requiresDeveloper = ["/requisitions", "/stock", "/developer"].some(
    (restricted) => path === restricted || path.startsWith(`${restricted}/`),
  );

  useEffect(() => {
    // Wait for AuthContext to hydrate from localStorage, then redirect
    // if no session is found.
    if (!loading && !session && !developerMode) {
      router.navigate({ to: "/login" });
    }
  }, [session, loading, developerMode, router]);

  useEffect(() => {
    if (!loading && requiresDeveloper && !developerMode) {
      router.navigate({ to: "/dashboard" });
    }
  }, [loading, requiresDeveloper, developerMode, router]);

  // Prevent flash of app content while checking auth
  if (loading || (!session && !developerMode)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (requiresDeveloper && !developerMode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center">
        <h1 className="text-2xl font-semibold">ACCESS DENIED</h1>
        <p className="mt-2 text-sm text-muted-foreground">Returning to User Dashboard…</p>
      </div>
    );
  }

  return <AppShell />;
}

// Re-export Outlet so children render via AppShell's <Outlet />
export { Outlet };
