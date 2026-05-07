import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Package, ArrowLeftRight, Tags, Building2, Users, ScrollText, Sparkles, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin","staff","viewer"] as const },
  { to: "/inventory", label: "Inventory", icon: Package, roles: ["admin","staff","viewer"] as const },
  { to: "/stock", label: "Stock In / Out", icon: ArrowLeftRight, roles: ["admin","staff","viewer"] as const },
  { to: "/categories", label: "Categories", icon: Tags, roles: ["admin","staff","viewer"] as const },
  { to: "/suppliers", label: "Suppliers", icon: Building2, roles: ["admin","staff","viewer"] as const },
  { to: "/assistant", label: "AI Assistant", icon: Sparkles, roles: ["admin","staff","viewer"] as const },
  { to: "/users", label: "Users", icon: Users, roles: ["admin"] as const },
  { to: "/audit", label: "Audit Log", icon: ScrollText, roles: ["admin"] as const },
];

export function Sidebar() {
  const { role, user, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: s => s.location.pathname });

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-sidebar-primary/15 grid place-items-center">
            <Shield className="h-5 w-5 text-sidebar-primary" />
          </div>
          <div>
            <div className="font-display text-base leading-tight">GovInventory</div>
            <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Republic Records System</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {nav.filter(n => role && n.roles.includes(role)).map(n => {
          const active = path === n.to || path.startsWith(n.to + "/");
          const Icon = n.icon;
          return (
            <Link key={n.to} to={n.to} className={cn(
              "flex items-center gap-3 px-5 py-2.5 text-sm font-medium border-l-2 border-transparent",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-primary" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}>
              <Icon className="h-4 w-4" />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4 text-xs">
        <div className="truncate font-medium">{user?.email}</div>
        <div className="text-sidebar-foreground/60 uppercase tracking-wider">{role}</div>
        <button
          onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
          className="mt-3 inline-flex items-center gap-2 text-sidebar-foreground/80 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </aside>
  );
}
