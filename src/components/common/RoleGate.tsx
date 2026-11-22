import { useAuth } from "@/contexts/AuthContext";
import type { ReactNode } from "react";

export function RoleGate({ allow = [], module, action = "view", children, fallback = null }: { allow?: import("@/integrations/supabase/client").AppRole[]; module?: string; action?: string; children: ReactNode; fallback?: ReactNode }) {
  const { roles, developerMode, canAccess } = useAuth();
  const allowed = module ? canAccess(module, action) : roles.some((role) => allow.includes(role));
  if (!developerMode && !allowed) return <>{fallback}</>;
  return <>{children}</>;
}
