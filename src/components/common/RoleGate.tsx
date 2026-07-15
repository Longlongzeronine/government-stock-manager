import { useAuth } from "@/contexts/AuthContext";
import type { ReactNode } from "react";

export function RoleGate({ allow, children, fallback = null }: { allow: ("admin"|"staff"|"accounting"|"viewer")[]; children: ReactNode; fallback?: ReactNode }) {
  const { role } = useAuth();
  if (!role || !allow.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}
