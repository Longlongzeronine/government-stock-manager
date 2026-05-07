import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/users")({
  head: () => ({ meta: [{ title: "User Roles — GovInventory" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { isAdmin } = useAuth();
  const { data: profiles = [], refetch } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data: p } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: r } = await supabase.from("user_roles").select("user_id, role");
      const byUser: Record<string, string[]> = {};
      (r ?? []).forEach((row: any) => { (byUser[row.user_id] ||= []).push(row.role); });
      return (p ?? []).map((u: any) => ({ ...u, roles: byUser[u.id] ?? [] }));
    },
  });

  if (!isAdmin) return <div className="p-8 text-sm text-muted-foreground">Admin access required.</div>;

  async function setRole(uid: string, role: string) {
    await supabase.from("user_roles").delete().eq("user_id", uid);
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
    if (error) return toast.error(error.message);
    toast.success("Role updated"); refetch();
  }

  return (
    <div>
      <PageHeader title="Users & Roles" subtitle="Manage access for personnel" />
      <div className="p-6 lg:p-8">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Email</th><th className="text-left px-4 py-3">Role</th></tr></thead>
            <tbody>
              {profiles.map((u: any) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{u.full_name ?? "—"}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <select value={u.roles[0] ?? "viewer"} onChange={e => setRole(u.id, e.target.value)} className="border border-input rounded-md bg-card px-2 py-1 text-sm">
                      <option value="admin">admin</option>
                      <option value="staff">staff</option>
                      <option value="viewer">viewer</option>
                    </select>
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && (<tr><td colSpan={3} className="p-12 text-center text-sm text-muted-foreground">No users found.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
