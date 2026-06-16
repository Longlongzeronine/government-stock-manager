import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Request access — Supplify" }] }),
  component: SignupPage,
});

function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
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
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Registration submitted. An admin must approve your account before you can sign in.");
      navigate({ to: "/login" });
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-5 bg-card border border-border rounded-lg p-8"
      >
        <div>
          <h1 className="text-2xl">Request access</h1>
          <p className="text-sm text-muted-foreground mt-1">
            New accounts start as viewers. An admin can upgrade access from Users & Roles.
          </p>
        </div>
        <div className="space-y-3">
          <Field label="Full name">
            <input
              className="input"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className="input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              className="input"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </Field>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
        <p className="text-sm text-muted-foreground text-center">
          Already enrolled?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
        <style>{`.input{width:100%;border:1px solid var(--color-input);background:var(--color-card);border-radius:6px;padding:.55rem .75rem;font-size:.875rem;outline:none}.input:focus{border-color:var(--color-ring);box-shadow:0 0 0 3px color-mix(in oklab,var(--color-ring) 25%,transparent)}`}</style>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
