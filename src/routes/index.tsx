import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) throw redirect({ to: "/dashboard" });
    } catch (e) {
      // If this is already a Router redirect (from the session check above),
      // let it propagate normally
      if (e && typeof e === "object" && "code" in e && (e as any).code === "REDIRECT") {
        throw e;
      }
      // Otherwise (e.g., SSR where browser localStorage is unavailable),
      // fall through to the login redirect below
    }
    throw redirect({ to: "/login" });
  },
  component: () => null,
});
