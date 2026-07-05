import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  ScanLine,
  ClipboardList,
  FileStack,
  Tags,
  Building2,
  Users,
  ScrollText,
  Sparkles,
  LogOut,
  Shield,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type R = "admin" | "staff" | "accounting" | "viewer";
export const nav: { to: string; label: string; icon: any; roles: R[] }[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "staff", "accounting", "viewer"],
  },
  { to: "/inventory", label: "Inventory", icon: Package, roles: ["admin", "staff", "accounting", "viewer"] },
  { to: "/scanner", label: "Scanner", icon: ScanLine, roles: ["admin", "staff", "accounting", "viewer"] },
  { to: "/requisitions", label: "Requisitions", icon: ClipboardList, roles: ["admin", "staff"] },
  { to: "/forms", label: "Forms Flow", icon: FileStack, roles: ["admin", "staff", "accounting"] },
  { to: "/stock", label: "Stock In / Out", icon: ArrowLeftRight, roles: ["admin", "staff", "accounting"] },
  { to: "/categories", label: "Categories", icon: Tags, roles: ["admin"] },
  { to: "/suppliers", label: "Suppliers", icon: Building2, roles: ["admin", "staff", "accounting", "viewer"] },
  { to: "/users", label: "Users", icon: Users, roles: ["admin"] },
  { to: "/audit", label: "Audit Log", icon: ScrollText, roles: ["admin"] },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps = {}) {
  const { role, user, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const filteredNav = nav.filter((n) => role && n.roles.includes(role));

  // If mobileOpen is provided, render mobile drawer
  if (mobileOpen !== undefined && onMobileOpenChange) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-40"
          onClick={() => onMobileOpenChange(false)}
        />
        {/* Drawer */}
        <div className="fixed inset-y-0 left-0 w-64 bg-sidebar text-sidebar-foreground flex flex-col z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
            <div className="flex items-center gap-2.5">
              <img src="/favicon.svg" alt="Supplify" className="h-8 w-8 rounded-md" />
              <div>
              <div className="font-display text-sm leading-tight">Supplify</div>
              <div className="text-[9px] uppercase tracking-wider text-sidebar-foreground/60 leading-tight">
                Supplies & Materials Management
              </div>
              </div>
            </div>
            <button
              onClick={() => onMobileOpenChange(false)}
              className="p-2 rounded-md hover:bg-sidebar-accent/60"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-3">
            {filteredNav.map((n) => {
              const active = path === n.to || path.startsWith(n.to + "/");
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => onMobileOpenChange(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 text-sm font-medium border-l-2 border-transparent",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-primary"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
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
              onClick={async () => {
                await signOut();
                navigate({ to: "/login" });
              }}
              className="mt-3 inline-flex items-center gap-2 text-sidebar-foreground/80 hover:text-sidebar-accent-foreground"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside className="hidden md:flex w-64 shrink-0 h-screen sticky top-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="Supplify" className="h-9 w-9 rounded-md" />
          <div>
            <div className="font-display text-base leading-tight">Supplify</div>
            <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60 leading-tight">
              Supplies & Materials Management
            </div>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {nav
          .filter((n) => role && n.roles.includes(role))
          .map((n) => {
            const active = path === n.to || path.startsWith(n.to + "/");
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 px-5 py-2.5 text-sm font-medium border-l-2 border-transparent",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
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
          onClick={async () => {
            await signOut();
            navigate({ to: "/login" });
          }}
          className="mt-3 inline-flex items-center gap-2 text-sidebar-foreground/80 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </aside>
  );
}
