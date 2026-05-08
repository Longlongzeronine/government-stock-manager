import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { MobileCard, MobileCardRow } from "@/components/common/MobileCard";
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  resetUserPassword,
  setUserDisabled,
  setUserRole,
} from "@/lib/admin.functions";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

type AssignableRole = "viewer" | "staff" | "admin";

export const Route = createFileRoute("/_app/users")({
  head: () => ({ meta: [{ title: "User Roles - GovInventory" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { isAdmin, session } = useAuth();
  const accessToken = session?.access_token ?? "";
  const [creating, setCreating] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    password: "",
    role: "viewer" as AssignableRole,
  });

  const { data: profiles = [], refetch } = useQuery({
    queryKey: ["profiles", "admin"],
    enabled: Boolean(isAdmin && accessToken),
    queryFn: async () => listAdminUsers({ data: { accessToken } }),
  });

  if (!isAdmin) {
    return <div className="p-8 text-sm text-muted-foreground">Admin access required.</div>;
  }

  async function setRole(uid: string, role: AssignableRole) {
    try {
      await setUserRole({ data: { accessToken, userId: uid, role } });
      toast.success("Role updated");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Role update failed");
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await createAdminUser({ data: { accessToken, ...form } });
      toast.success("User created");
      setForm({ email: "", fullName: "", password: "", role: "viewer" });
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "User creation failed");
    } finally {
      setCreating(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    setResetting(true);
    try {
      await resetUserPassword({
        data: { accessToken, userId: resetTarget.id, password: newPassword },
      });
      toast.success("Password reset");
      setResetTarget(null);
      setNewPassword("");
    } catch (e: any) {
      toast.error(e?.message ?? "Password reset failed");
    } finally {
      setResetting(false);
    }
  }

  async function toggleDisabled(uid: string, disabled: boolean) {
    try {
      await setUserDisabled({ data: { accessToken, userId: uid, disabled } });
      toast.success(disabled ? "User deactivated" : "User activated");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Status update failed");
    }
  }

  async function deleteUser(uid: string, email: string) {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    try {
      await deleteAdminUser({ data: { accessToken, userId: uid } });
      toast.success("User deleted");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "User delete failed");
    }
  }

  const isMobileView = useIsMobile();

  return (
    <div>
      <PageHeader title="Users & Roles" subtitle="Manage access for personnel" />
      <div className="p-4 sm:p-6 lg:p-8 space-y-4">
        <form
          onSubmit={createUser}
          className="bg-card border border-border rounded-lg p-4 grid gap-3 md:grid-cols-5"
        >
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="border border-input rounded-md bg-card px-3 py-2 text-sm w-full"
          />
          <input
            required
            placeholder="Full name"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="border border-input rounded-md bg-card px-3 py-2 text-sm w-full"
          />
          <input
            required
            type="password"
            minLength={6}
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="border border-input rounded-md bg-card px-3 py-2 text-sm w-full"
          />
          <RoleSelect
            value={form.role}
            onChange={(role) => setForm({ ...form, role })}
            className="border border-input rounded-md bg-card px-3 py-2 text-sm w-full"
          />
          <button
            disabled={creating}
            className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium disabled:opacity-50 w-full md:w-auto"
          >
            {creating ? "Creating..." : "Create user"}
          </button>
        </form>

        {/* Desktop Table View */}
        {!isMobileView && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((u: any) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{u.full_name ?? "-"}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">
                      <RoleSelect
                        value={u.role}
                        onChange={(role) => setRole(u.id, role)}
                        className="border border-input rounded-md bg-card px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">{u.disabled ? "disabled" : "active"}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setResetTarget({ id: u.id, email: u.email })}
                        className="px-2 py-1 rounded border border-input text-xs mr-2 cursor-pointer hover:bg-accent"
                      >
                        Reset password
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleDisabled(u.id, !u.disabled)}
                        className="px-2 py-1 rounded border border-input text-xs mr-2 cursor-pointer hover:bg-accent"
                      >
                        {u.disabled ? "Activate" : "Deactivate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteUser(u.id, u.email)}
                        className="px-2 py-1 rounded border border-destructive/40 text-destructive text-xs cursor-pointer hover:bg-destructive/10"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {profiles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-sm text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Card View */}
        {isMobileView && (
          <div className="space-y-3">
            {profiles.map((u: any) => (
              <MobileCard key={u.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-base">{u.full_name ?? "-"}</div>
                  <span className={`text-xs px-2 py-1 rounded-md border shrink-0 ${u.disabled ? "bg-muted text-muted-foreground border-border" : "bg-success/15 text-success border-success/30"}`}>
                    {u.disabled ? "disabled" : "active"}
                  </span>
                </div>
                <div className="border-t border-border pt-2 space-y-2">
                  <MobileCardRow label="Email" value={u.email} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Role</span>
                    <RoleSelect
                      value={u.role}
                      onChange={(role) => setRole(u.id, role)}
                      className="border border-input rounded-md bg-card px-2 py-1 text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setResetTarget({ id: u.id, email: u.email })}
                    className="w-full px-3 py-2 rounded-md border border-input text-sm cursor-pointer hover:bg-accent"
                  >
                    Reset password
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleDisabled(u.id, !u.disabled)}
                      className="flex-1 px-3 py-2 rounded-md border border-input text-sm cursor-pointer hover:bg-accent"
                    >
                      {u.disabled ? "Activate" : "Deactivate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteUser(u.id, u.email)}
                      className="px-3 py-2 rounded-md border border-destructive/40 text-destructive text-sm cursor-pointer hover:bg-destructive/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </MobileCard>
            ))}
            {profiles.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground bg-card border border-border rounded-lg">
                No users found.
              </div>
            )}
          </div>
        )}
      </div>

      {resetTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4">
          <form
            onSubmit={resetPassword}
            className="bg-card border border-border rounded-lg w-full max-w-sm p-6 space-y-4"
          >
            <div>
              <h2 className="text-xl">Reset password</h2>
              <p className="text-sm text-muted-foreground mt-1">{resetTarget.email}</p>
            </div>
            <input
              autoFocus
              required
              type="password"
              minLength={6}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-input rounded-md bg-card px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setResetTarget(null);
                  setNewPassword("");
                }}
                className="px-4 py-2 rounded-md border border-input text-sm cursor-pointer hover:bg-accent"
              >
                Cancel
              </button>
              <button
                disabled={resetting}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {resetting ? "Resetting..." : "Reset password"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function RoleSelect({
  value,
  onChange,
  className,
}: {
  value: AssignableRole;
  onChange: (role: AssignableRole) => void;
  className: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as AssignableRole)}
      className={className}
    >
      <option value="viewer">viewer</option>
      <option value="staff">staff</option>
      <option value="admin">admin</option>
    </select>
  );
}
