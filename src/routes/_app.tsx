import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    // This runs on both server and client. On the server, there's no
    // browser localStorage so the session is never found. We skip the
    // guard on the server and handle it client-side in the component.
    if (typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw redirect({ to: "/login" });
    }
  },
  component: () => <AppShellGuard />,
});

function AppShellGuard() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Once auth finishes loading, redirect if no session
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
