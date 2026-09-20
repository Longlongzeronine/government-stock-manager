import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
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
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for AuthContext to hydrate from localStorage, then redirect
    // if no session is found.
    if (!loading && !session) {
      router.navigate({ to: "/login" });
    }
  }, [session, loading, router]);

  // Prevent flash of app content while checking auth
  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return <AppShell />;
}

// Re-export Outlet so children render via AppShell's <Outlet />
export { Outlet };