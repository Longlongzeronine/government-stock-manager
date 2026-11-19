import { useAuth } from "@/contexts/AuthContext";
import type { ReactNode } from "react";

export function RoleGate({ allow, children, fallback = null }: { allow: import("@/integrations/supabase/client").AppRole[]; children: ReactNode; fallback?: ReactNode }) {
  const { roles, developerMode } = useAuth();
  if (!developerMode && !roles.some((role) => allow.includes(role))) return <>{fallback}</>;
  return <>{children}</>;
}
