import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { MobileCard, MobileCardRow } from "@/components/common/MobileCard";
import {
  approveUser,
  createAdminUser,
  declineUser,
  deleteAdminUser,
  listAdminUsers,
  listRoleMatrix,
  resetUserPassword,
  setRoleFormPermission,
  setUserDisabled,
  setUserRole,
  type Role,
} from "@/lib/admin.functions";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

type AssignableRole = Role;
const assignableRoles: { value: AssignableRole; label: string }[] = [
  { value: "regular_user", label: "Regular User" },
  { value: "permanent_employee", label: "Permanent Employee" },
  { value: "supply_officer", label: "Supply Officer" },
  { value: "inspection_officer", label: "Inspection Officer" },
  { value: "financial_analyst", label: "Financial Analyst" },
  { value: "admin", label: "Administrator" },
];
const employmentStatuses = ["Permanent", "Casual", "Contractual", "Job Order"] as const;

export const Route = createFileRoute("/_app/users")({
  head: () => ({ meta: [{ title: "User Roles — Supplify" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { isAdmin, developerMode, session } = useAuth();
  const accessToken = session?.access_token ?? "";
  const [creating, setCreating] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AssignableRole | "all">("all");
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    password: "",
    roles: ["regular_user"] as AssignableRole[],
    employmentStatus: "Casual" as typeof employmentStatuses[number],
  });
  const { data: matrix, refetch: refetchMatrix } = useQuery({
    queryKey: ["roles", "form-matrix"],
    enabled: Boolean(isAdmin && accessToken),
    queryFn: async () => listRoleMatrix({ data: { accessToken } }),
  });

  const { data: profiles = [], refetch, isLoading, error } = useQuery({
    queryKey: ["profiles", "admin"],
    enabled: Boolean(isAdmin && accessToken),
    queryFn: async () => listAdminUsers({ data: { accessToken } }),
  });

  if (!isAdmin || !accessToken) {
    return <div className="p-8 text-sm text-muted-foreground">{developerMode ? "User management requires a signed-in Supabase admin account." : "Admin access required."}</div>;
  }

  async function setUserAccess(uid: string, roles: AssignableRole[], employmentStatus: typeof employmentStatuses[number]) {
    try {
      await setUserRole({ data: { accessToken, userId: uid, roles, employmentStatus } });
      toast.success("User access updated");
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
      setForm({ email: "", fullName: "", password: "", roles: ["regular_user"], employmentStatus: "Casual" });
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
  const filteredProfiles = profiles.filter((u: any) => {
    const matchesSearch = `${u.full_name ?? ""} ${u.email ?? ""}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch && (roleFilter === "all" || u.roles.includes(roleFilter));
  });

  return (
    <div>
      <PageHeader title="Users & Roles" subtitle="Assign multiple roles, employment status, and form access" />
      <div className="p-4 sm:p-6 lg:p-8 space-y-4">
        <form
          onSubmit={createUser}
          className="bg-card border border-border rounded-lg p-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6"
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
          <RoleMultiSelect value={form.roles} onChange={(roles) => setForm({ ...form, roles })} />
          <select value={form.employmentStatus} onChange={(e) => setForm({ ...form, employmentStatus: e.target.value as typeof form.employmentStatus })} className="border border-input rounded-md bg-card px-3 py-2 text-sm w-full">
            {employmentStatuses.map((status) => <option key={status}>{status}</option>)}
          </select>
          <button
            disabled={creating}
            className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium disabled:opacity-50 w-full md:w-auto"
          >
            {creating ? "Creating..." : "Create user"}
          </button>
        </form>

        <section className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div><h2 className="font-semibold">Form access matrix</h2><p className="text-xs text-muted-foreground">Changes apply to next request. Administrator keeps full access.</p></div>
          {!matrix ? <p className="text-sm text-muted-foreground">Loading permissions…</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="text-left p-2">Form</th>{matrix.roles.map((role: any) => <th key={role.code} className="p-2 text-center">{role.label}</th>)}</tr></thead><tbody>{matrix.forms.map((item: any) => <tr key={item.form_key} className="border-t border-border"><td className="p-2"><span className="text-xs text-muted-foreground">{item.section}</span><br />{item.label}</td>{matrix.roles.map((role: any) => { const allowed = matrix.permissions.some((permission: any) => permission.role_code === role.code && permission.form_key === item.form_key && permission.can_access); return <td className="p-2 text-center" key={role.code}><input aria-label={`${role.label} can access ${item.section} ${item.label}`} type="checkbox" checked={allowed} disabled={role.is_system_admin} onChange={async (event) => { try { await setRoleFormPermission({ data: { accessToken, role: role.code, formKey: item.form_key, canAccess: event.target.checked } }); await refetchMatrix(); } catch (e: any) { toast.error(e?.message ?? "Permission update failed"); } }} /></td>; })}</tr>)}</tbody></table></div>}
        </section>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" className="border border-input rounded-md bg-card px-3 py-2 text-sm" />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as AssignableRole | "all")} className="border border-input rounded-md bg-card px-3 py-2 text-sm"><option value="all">All roles</option>{assignableRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select>
        </div>

        {/* Desktop Table View */}
        {!isMobileView && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Employment Status</th>
                  <th className="text-left px-4 py-3">Roles</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="p-12 text-center text-sm text-muted-foreground">Loading users...</td></tr>
                ) : error ? (
                  <tr><td colSpan={5} className="p-8 text-center text-sm text-destructive">Could not load users: {error.message}</td></tr>
                ) : null}
                {filteredProfiles.map((u: any) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-4 py-3"><div className="font-medium">{u.full_name ?? "-"}</div><div className="text-xs text-muted-foreground">{u.email}</div></td>
                    <td className="px-4 py-3"><select value={u.employment_status} onChange={(e) => setUserAccess(u.id, u.roles, e.target.value as typeof employmentStatuses[number])} className="border border-input rounded-md bg-card px-2 py-1 text-sm">{employmentStatuses.map((status) => <option key={status}>{status}</option>)}</select></td>
                    <td className="px-4 py-3"><RoleMultiSelect value={u.roles} onChange={(roles) => setUserAccess(u.id, roles, u.employment_status)} /></td>
                    <td className="px-4 py-3">
                      {u.status === "pending" ? (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-warning/15 text-warning-foreground border border-warning/30">pending</span>
                      ) : u.status === "declined" || u.disabled ? (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">inactive</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-success/15 text-success border border-success/30">active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {u.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await approveUser({ data: { accessToken, userId: u.id } });
                                toast.success("User approved");
                                refetch();
                              } catch (e: any) {
                                toast.error(e?.message ?? "Approve failed");
                              }
                            }}
                            className="px-2 py-1 rounded border border-success/50 text-success text-xs mr-2 cursor-pointer hover:bg-success/10"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await declineUser({ data: { accessToken, userId: u.id } });
                                toast.success("User declined");
                                refetch();
                              } catch (e: any) {
                                toast.error(e?.message ?? "Decline failed");
                              }
                            }}
                            className="px-2 py-1 rounded border border-destructive/40 text-destructive text-xs mr-2 cursor-pointer hover:bg-destructive/10"
                          >
                            Decline
                          </button>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
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
                {!isLoading && !error && filteredProfiles.length === 0 && (
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
            {isLoading && <div className="p-12 text-center text-sm text-muted-foreground bg-card border border-border rounded-lg">Loading users...</div>}
            {error && <div className="p-8 text-center text-sm text-destructive bg-card border border-border rounded-lg">Could not load users: {error.message}</div>}
            {filteredProfiles.map((u: any) => (
              <MobileCard key={u.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-base">{u.full_name ?? "-"}</div>
                  {u.status === "pending" ? (
                    <span className="text-xs px-2 py-1 rounded-md shrink-0 bg-warning/15 text-warning-foreground border border-warning/30">pending</span>
                  ) : u.status === "declined" || u.disabled ? (
                    <span className="text-xs px-2 py-1 rounded-md shrink-0 bg-muted text-muted-foreground border border-border">inactive</span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-md shrink-0 bg-success/15 text-success border border-success/30">active</span>
                  )}
                </div>
                <div className="border-t border-border pt-2 space-y-2">
                  <MobileCardRow label="Email" value={u.email} />
                  <div><span className="text-xs uppercase tracking-wider text-muted-foreground">Employment Status</span><select value={u.employment_status} onChange={(e) => setUserAccess(u.id, u.roles, e.target.value as typeof employmentStatuses[number])} className="mt-1 w-full border border-input rounded-md bg-card px-2 py-1 text-sm">{employmentStatuses.map((status) => <option key={status}>{status}</option>)}</select></div>
                  <RoleMultiSelect value={u.roles} onChange={(roles) => setUserAccess(u.id, roles, u.employment_status)} />
                </div>
                <div className="flex flex-col gap-2 pt-2 border-t border-border">
                  {u.status === "pending" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await approveUser({ data: { accessToken, userId: u.id } });
                            toast.success("User approved");
                            refetch();
                          } catch (e: any) {
                            toast.error(e?.message ?? "Approve failed");
                          }
                        }}
                        className="flex-1 px-3 py-2 rounded-md border border-success/50 text-success text-sm cursor-pointer hover:bg-success/10"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await declineUser({ data: { accessToken, userId: u.id } });
                            toast.success("User declined");
                            refetch();
                          } catch (e: any) {
                            toast.error(e?.message ?? "Decline failed");
                          }
                        }}
                        className="flex-1 px-3 py-2 rounded-md border border-destructive/40 text-destructive text-sm cursor-pointer hover:bg-destructive/10"
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </MobileCard>
            ))}
            {!isLoading && !error && filteredProfiles.length === 0 && (
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

function RoleMultiSelect({
  value,
  onChange,
}: {
  value: AssignableRole[];
  onChange: (roles: AssignableRole[]) => void;
}) {
  return (
    <details className="relative min-w-40 rounded-md border border-input bg-card px-2 py-1">
      <summary className="cursor-pointer text-sm">{value.map((role) => assignableRoles.find((item) => item.value === role)?.label ?? role).join(", ") || "Select roles"}</summary>
      <div className="absolute left-0 top-full z-20 mt-1 max-h-64 min-w-56 overflow-auto rounded-md border border-border bg-card p-2 shadow-lg">
        {assignableRoles.map((role) => <label key={role.value} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"><input type="checkbox" checked={value.includes(role.value)} disabled={value.length === 1 && value[0] === role.value} onChange={(event) => onChange(event.target.checked ? [...value, role.value] : value.filter((selected) => selected !== role.value))} />{role.label}</label>)}
      </div>
    </details>
  );
}
