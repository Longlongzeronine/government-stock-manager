import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { MobileCard, MobileCardRow } from "@/components/common/MobileCard";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/_app/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — Supplify" }] }),
  component: Suppliers,
});

function Suppliers() {
  const { canWrite, isAdmin } = useAuth();
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => (await supabase.from("suppliers").select("*").order("name")).data ?? [],
  });
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  async function del(id: string) {
    if (!confirm("Delete this supplier?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["suppliers"] });
  }

  const isMobileView = useIsMobile();

  return (
    <div>
      <PageHeader title="Suppliers" subtitle={`${rows.length} suppliers on file`} actions={canWrite && (
        <button onClick={() => { setEditing(null); setOpen(true); }} className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90"><Plus className="h-4 w-4" /> Add supplier</button>
      )} />
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Desktop Table View */}
        {!isMobileView && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Contact</th><th className="text-left px-4 py-3">Address</th><th className="text-left px-4 py-3">Notes</th><th></th></tr></thead>
              <tbody>
                {rows.map((s: any) => (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3">{s.contact ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.address ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.notes ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {canWrite && (<div className="inline-flex gap-1">
                        <button onClick={() => { setEditing(s); setOpen(true); }} className="p-1.5 rounded hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
                        {isAdmin && <button onClick={() => del(s.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
                      </div>)}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (<tr><td colSpan={5} className="p-12 text-center text-sm text-muted-foreground">No suppliers yet.</td></tr>)}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Card View */}
        {isMobileView && (
          <div className="space-y-3">
            {rows.map((s: any) => (
              <MobileCard key={s.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-base">{s.name}</div>
                  {canWrite && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditing(s); setOpen(true); }} className="p-1.5 rounded hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
                      {isAdmin && <button onClick={() => del(s.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                  )}
                </div>
                <div className="border-t border-border pt-2 space-y-2">
                  {s.contact && <MobileCardRow label="Contact" value={s.contact} />}
                  {s.address && <MobileCardRow label="Address" value={s.address} />}
                  {s.notes && (
                    <div className="pt-1">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">Notes</span>
                      <p className="text-sm mt-1">{s.notes}</p>
                    </div>
                  )}
                </div>
              </MobileCard>
            ))}
            {rows.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground bg-card border border-border rounded-lg">
                No suppliers yet.
              </div>
            )}
          </div>
        )}
      </div>
      {open && <SupDialog editing={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["suppliers"] }); }} />}
    </div>
  );
}

function SupDialog({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState({ name: editing?.name ?? "", contact: editing?.contact ?? "", address: editing?.address ?? "", notes: editing?.notes ?? "" });
  const [saving, setSaving] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const { error } = editing
      ? await supabase.from("suppliers").update(form).eq("id", editing.id)
      : await supabase.from("suppliers").insert(form);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved"); onSaved();
  }
  return (
    <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm grid place-items-center z-50 p-4">
      <form onSubmit={save} className="bg-card border border-border rounded-lg w-full max-w-md p-6 space-y-4">
        <h2 className="text-xl">{editing ? "Edit supplier" : "Add supplier"}</h2>
        <label className="block"><span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Name</span><input required className="dlg-input mt-1.5" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label className="block"><span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Contact</span><input className="dlg-input mt-1.5" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></label>
        <label className="block"><span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Address</span><input className="dlg-input mt-1.5" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
        <label className="block"><span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Notes</span><textarea rows={2} className="dlg-input mt-1.5" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-input text-sm">Cancel</button><button disabled={saving} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">{saving?"Saving…":"Save"}</button></div>
        <style>{`.dlg-input{width:100%;border:1px solid var(--color-input);background:var(--color-card);border-radius:6px;padding:.5rem .7rem;font-size:.875rem;outline:none}.dlg-input:focus{border-color:var(--color-ring);box-shadow:0 0 0 3px color-mix(in oklab,var(--color-ring) 25%,transparent)}`}</style>
      </form>
    </div>
  );
}
