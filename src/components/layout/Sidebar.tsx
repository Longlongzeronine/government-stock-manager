import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  History,
  X,
  Code2,
  KeyRound,
  ChevronDown,
  Database,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: any; module: string; action?: string; section?: "dev-space" };

export const nav: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    module: "dashboard",
  },
  {
    to: "/inventory",
    label: "Inventory",
    icon: Package,
    module: "inventory",
  },
  {
    to: "/requisitions",
    label: "Requisitions",
    icon: ClipboardList,
    module: "requisitions",
  },
  {
    to: "/scanner",
    label: "Scanner",
    icon: ScanLine,
    module: "scanner",
  },
  {
    to: "/approval",
    label: "Approval",
    icon: Shield,
    module: "approvals",
  },
  {
    to: "/ris-history",
    label: "RIS History",
    icon: History,
    module: "ris_history",
  },
  {
    to: "/forms",
    label: "Forms Flow",
    icon: FileStack,
    module: "forms",
  },
  {
    to: "/stock",
    label: "Stock In / Out",
    icon: ArrowLeftRight,
    module: "stock",
  },
  { to: "/categories", label: "Categories", icon: Tags, module: "categories" },
  {
    to: "/suppliers",
    label: "Suppliers",
    icon: Building2,
    module: "suppliers",
  },
  { to: "/assistant", label: "AI Assistant", icon: Sparkles, module: "assistant" },
  { to: "/users", label: "Accounts", icon: Users, module: "user_access", action: "manage" },
  { to: "/user-access", label: "User Access", icon: KeyRound, module: "user_access", action: "manage" },
  { to: "/audit", label: "Audit Log", icon: ScrollText, module: "audit_logs" },
  { to: "/migrations", label: "Migrations", icon: Database, module: "migrations", section: "dev-space" },
];

const primaryNav = nav.filter((item) => !item.section);
const devSpaceNav = nav.filter((item) => item.section === "dev-space");

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

function DevSpaceSection({ path, canAccess, onNavigate }: {
  path: string;
  canAccess: (module: string, action?: string) => boolean;
  onNavigate?: () => void;
}) {
  const sectionActive = path === "/migrations" || path.startsWith("/migrations/");
  const [open, setOpen] = useState(true);
  const children = devSpaceNav.filter((item) => canAccess(item.module, item.action ?? "view"));
  const visible = canAccess("dev_space", "view") && children.length > 0;

  useEffect(() => {
    if (sectionActive) setOpen(true);
  }, [sectionActive]);

  if (!visible) return null;

  return (
    <div className="mt-3 border-t border-sidebar-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="dev-space-navigation"
        className={cn(
          "flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] transition-colors",
          sectionActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/60 hover:text-sidebar-accent-foreground",
        )}
      >
        <Code2 className="h-4 w-4" />
        <span className="flex-1">Dev Space</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div id="dev-space-navigation" className="mt-1 space-y-1 pb-1">
        {children.map((item) => {
          const active = path === item.to || path.startsWith(item.to + "/");
          const Icon = item.icon;
          return <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "mx-3 flex items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>;
        })}
      </div>}
    </div>
  );
}

export function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps = {}) {
  const { role, user, signOut, developerMode, developerUsername, canAccess } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const filteredNav = primaryNav.filter((item) => canAccess(item.module, item.action ?? "view"));

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
              <img
                src="/favicon.svg"
                alt="Supplify"
                className="h-8 w-8 rounded-md"
              />
              <div>
                <div className="font-display text-sm leading-tight">
                  Supplify
                </div>
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
            <DevSpaceSection path={path} canAccess={canAccess} onNavigate={() => onMobileOpenChange(false)} />
          </nav>

          <div className="border-t border-sidebar-border p-4 text-xs">
            <div className="truncate font-medium">{user?.email ?? developerUsername}</div>
            <div className="text-sidebar-foreground/60 uppercase tracking-wider">
              {developerMode ? "Developer Mode" : role}
            </div>
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
          <img
            src="/favicon.svg"
            alt="Supplify"
            className="h-9 w-9 rounded-md"
          />
          <div>
            <div className="font-display text-base leading-tight">Supplify</div>
            <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60 leading-tight">
              Supplies & Materials Management
            </div>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {primaryNav
          .filter((item) => canAccess(item.module, item.action ?? "view"))
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
        <DevSpaceSection path={path} canAccess={canAccess} />
      </nav>
      <div className="border-t border-sidebar-border p-4 text-xs">
        <div className="truncate font-medium">{user?.email ?? developerUsername}</div>
        <div className="text-sidebar-foreground/60 uppercase tracking-wider">
          {developerMode ? "Developer Mode" : role}
        </div>
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
