import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — GovInventory" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || submitLockRef.current) return;
    submitLockRef.current = true;
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Welcome back");
      navigate({ to: "/dashboard" });
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-sidebar text-sidebar-foreground p-12">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-md bg-sidebar-primary/20 grid place-items-center">
            <Shield className="h-6 w-6 text-sidebar-primary" />
          </div>
          <div>
            <div className="font-display text-xl">GovInventory</div>
            <div className="text-xs uppercase tracking-widest text-sidebar-foreground/60">
              Republic Records System
            </div>
          </div>
        </div>
        <div>
          <h2 className="font-display text-4xl leading-tight max-w-md">
            Official record-keeping for public office supplies and equipment.
          </h2>
          <p className="mt-4 text-sm text-sidebar-foreground/70 max-w-md">
            Track materials, monitor stock movements, audit transactions, and generate reports —
            built for the operational standards of government agencies.
          </p>
        </div>
        <div className="text-xs text-sidebar-foreground/50">
          © {new Date().getFullYear()} Office of Inventory Management
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="text-2xl">Sign in</h1>
            <p className="text-sm text-muted-foreground mt-1">Authorized personnel only.</p>
          </div>
          <div className="space-y-3">
            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                autoComplete="email"
                disabled={loading}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                autoComplete="current-password"
                disabled={loading}
              />
            </Field>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-sm text-muted-foreground text-center">
            No account?{" "}
            <Link
              to="/signup"
              className="text-primary font-medium underline-offset-2 hover:underline"
            >
              Request access
            </Link>
          </p>
        </form>
      </div>

      <style>{`.input{width:100%;border:1px solid var(--color-input);background:var(--color-card);border-radius:6px;padding:.55rem .75rem;font-size:.875rem;outline:none}.input:focus{border-color:var(--color-ring);box-shadow:0 0 0 3px color-mix(in oklab,var(--color-ring) 25%,transparent)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground uppercase tracking-wider">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
