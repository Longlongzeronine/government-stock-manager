import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createCategory, createItem, updateItem } from "@/lib/data.functions";
import { classifyInventoryItem } from "@/lib/item-classification";

const ITEM_MONTH_KEYS = [
  "jan_quantity", "feb_quantity", "mar_quantity", "apr_quantity",
  "may_quantity", "jun_quantity", "jul_quantity", "aug_quantity",
  "sep_quantity", "oct_quantity", "nov_quantity", "dec_quantity",
] as const;

type ItemDialogProps = {
  editing: any | null;
  cats: any[];
  onClose: () => void;
  onSaved: (item?: any) => void | Promise<void>;
  onCategoryCreated?: () => void;
  initialName?: string;
  initialDescription?: string;
};

export function ItemDialog({
  editing,
  cats,
  onClose,
  onSaved,
  onCategoryCreated,
  initialName = "",
  initialDescription = "",
}: ItemDialogProps) {
  const [form, setForm] = useState<any>(() => ({
    barcode_value: editing?.barcode_value ?? "",
    name: editing?.name ?? initialName,
    description: editing?.description ?? initialDescription,
    category_id: editing?.category_id ?? "",
    supplier_id: editing?.supplier_id ?? "",
    item_type: editing?.item_type ?? "supply",
    acquisition_cost: editing?.acquisition_cost ?? 0,
    unit: editing?.unit ?? "pieces",
    reorder_level: editing?.reorder_level ?? 10,
    ...Object.fromEntries(ITEM_MONTH_KEYS.map((key) => [key, Number(editing?.[key] ?? 0)])),
  }));
  const [localCats, setLocalCats] = useState<any[]>(() => cats || []);
  const [saving, setSaving] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => setLocalCats(cats || []), [cats]);

  const dialogClassification = classifyInventoryItem(form.item_type, form.acquisition_cost);

  async function createCategoryInline() {
    const name = newCategory.trim();
    if (!name) return;
    setCreatingCategory(true);
    try {
      const created = await createCategory({ data: { name } });
      if (!created) return;
      setLocalCats((prev) => [created, ...prev.filter((category: any) => category.id !== created.id)]);
      setForm((current: any) => ({ ...current, category_id: created.id }));
      setNewCategory("");
      setAddingCategory(false);
      onCategoryCreated?.();
      toast.success(`Category "${name}" created`);
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to create category");
    } finally {
      setCreatingCategory(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const payload = {
      barcode_value: form.barcode_value?.trim() || null,
      name: String(form.name || "").trim(),
      description: form.description || null,
      category_id: form.category_id || null,
      category_name: localCats.find((category: any) => String(category.id) === String(form.category_id))?.name || null,
      supplier_id: form.supplier_id || null,
      item_type: form.item_type || "supply",
      acquisition_cost: Number(form.acquisition_cost) || 0,
      unit: form.unit,
      reorder_level: Number(form.reorder_level) || 10,
      // Monthly requirement fields are hidden. Preserve current on-hand stock
      // when editing; newly created items start at zero until received in IAR.
      quantity: Number(editing?.quantity) || 0,
      ...Object.fromEntries(ITEM_MONTH_KEYS.map((key) => [key, Number(form[key]) || 0])),
    };

    try {
      let savedItem: any;
      if (editing) {
        savedItem = await updateItem({ data: { ...payload, id: editing.id } });
      } else {
        savedItem = await createItem({ data: payload });
        if (savedItem?.legacySchemaUsed) {
          toast.warning("Item saved. Online Supabase schema needs update for all fields.");
        }
      }
      toast.success(editing ? "Item updated" : "Item created");
      await onSaved(savedItem);
    } catch (error: any) {
      toast.error(error?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm">
      <form onSubmit={save} className="max-h-[90dvh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-lg border border-border bg-card p-4 sm:p-6">
        <h2 className="text-xl">{editing ? "Edit item" : "Add new item"}</h2>
        <p className="text-xs text-muted-foreground">Fields match the APP-CSE 2026 template columns.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Code">
            <input className="dlg-input" placeholder="PS-DBM code (e.g. 1234-5678)" value={form.barcode_value} onChange={(event) => setForm({ ...form, barcode_value: event.target.value })} />
          </Field>
          <Field label="Unit of Measure">
            <input className="dlg-input" list="item-unit-options" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} />
            <datalist id="item-unit-options"><option value="pieces" /><option value="gallon" /><option value="bottle" /><option value="pack" /><option value="box" /><option value="ream" /><option value="roll" /><option value="set" /><option value="unit" /><option value="ticket" /></datalist>
          </Field>
          <Field label="Item Name" full>
            <input className="dlg-input" required placeholder="Generic name, e.g. Paper" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </Field>
          <Field label="Product Description" full>
            <textarea className="dlg-input min-h-20" placeholder="Optional size, brand, model, or other distinguishing details" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </Field>
          <Field label="Unit Price">
            <input type="number" min={0} step="0.01" className="dlg-input" value={form.acquisition_cost} onChange={(event) => setForm({ ...form, acquisition_cost: event.target.value as any })} />
          </Field>
          <Field label="Item Type">
            <select className="dlg-input" value={form.item_type} onChange={(event) => setForm({ ...form, item_type: event.target.value })}>
              <option value="supply">Supply (Expendable)</option>
              <option value="material">Material (Semi-Expendable / PPE)</option>
            </select>
          </Field>
          <Field label="Classification">
            <div className="dlg-input flex items-center justify-between gap-2">
              <span className="font-medium">{classificationLabel(dialogClassification)}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Auto from type &amp; cost</span>
            </div>
          </Field>
          <Field label="Category">
            {addingCategory ? (
              <div className="flex gap-2">
                <input className="dlg-input" placeholder="New category name" value={newCategory} autoFocus onChange={(event) => setNewCategory(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void createCategoryInline(); } }} />
                <button type="button" disabled={creatingCategory || !newCategory.trim()} onClick={() => void createCategoryInline()} className="whitespace-nowrap rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{creatingCategory ? "Creating…" : "Create"}</button>
                <button type="button" onClick={() => { setAddingCategory(false); setNewCategory(""); }} className="whitespace-nowrap rounded-md border border-input px-3 py-2 text-sm">Cancel</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select className="dlg-input" value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })}>
                  <option value="">—</option>
                  {localCats.map((category: any) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <button type="button" onClick={() => setAddingCategory(true)} title="Create a new category" className="whitespace-nowrap rounded-md border border-input px-3 text-sm hover:bg-accent">+ New</button>
              </div>
            )}
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border border-input px-4 py-2 text-sm">Cancel</button>
          <button disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
        </div>
        <style>{`.dlg-input{box-sizing:border-box;width:100%;border:1px solid var(--color-input);background:var(--color-card);border-radius:6px;padding:.5rem .7rem;font-size:.875rem;outline:none}.dlg-input:focus{border-color:var(--color-ring);box-shadow:0 0 0 3px color-mix(in oklab,var(--color-ring) 25%,transparent)}`}</style>
      </form>
    </div>
  );
}

function classificationLabel(item: { inventory_classification?: string; semi_expendable_tier?: string | null }) {
  if (item.inventory_classification === "ppe") return "PPE";
  if (item.inventory_classification === "semi_expendable_property") {
    return item.semi_expendable_tier === "high_value" ? "Semi-Exp. High" : "Semi-Exp. Low";
  }
  return "Expendable";
}

function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <label className={`block ${full ? "col-span-full" : ""}`}><span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span><div className="mt-1.5">{children}</div></label>;
}
