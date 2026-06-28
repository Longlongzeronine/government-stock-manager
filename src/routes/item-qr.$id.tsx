import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, Printer, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/item-qr/$id")({
  head: () => ({ meta: [{ title: "Item QR Detail — Supplify" }] }),
  component: ItemQrDetail,
});

function ItemQrDetail() {
  const { id } = Route.useParams();
  const { session, loading } = useAuth();
  const [qrDataUrl, setQrDataUrl] = useState("");
  const qrUrl = useMemo(() => {
    if (typeof window === "undefined") return `/item-qr/${id}`;
    return `${window.location.origin}/item-qr/${id}`;
  }, [id]);

  const { data: item, isLoading } = useQuery({
    queryKey: ["item-qr", id],
    enabled: Boolean(session),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*, category:categories(id,name), supplier:suppliers(id,name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    QRCode.toDataURL(qrUrl, { margin: 1, width: 320, errorCorrectionLevel: "M" }).then(setQrDataUrl);
  }, [qrUrl]);

  if (loading) return <Centered text="Checking access..." />;
  if (!session) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-8">
        <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-6 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-3 text-xl font-semibold">Protected Item QR</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to view this item record.</p>
          <Link to="/login" className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Sign in
          </Link>
        </div>
      </div>
    );
  }
  if (isLoading) return <Centered text="Loading item..." />;
  if (!item) return <Centered text="Item not found." />;

  const totalCost = Number(item.total_cost ?? Number(item.quantity ?? 0) * Number(item.unit_value ?? 0));

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl space-y-4 print:max-w-none">
        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <Link to="/inventory" className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-accent">
            <ArrowLeft className="h-4 w-4" /> Inventory
          </Link>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            <Printer className="h-4 w-4" /> Print QR
          </button>
        </div>

        <section className="rounded-lg border border-border bg-white p-5 text-black shadow-sm print:border-0 print:shadow-none">
          <div className="grid gap-5 md:grid-cols-[260px_1fr]">
            <div className="rounded-md border border-black/20 p-3 text-center">
              {qrDataUrl ? <img src={qrDataUrl} alt={`QR for ${item.name}`} className="mx-auto h-56 w-56" /> : <div className="grid h-56 place-items-center text-sm">Generating QR</div>}
              <div className="mt-2 break-all text-[10px] text-black/70">{qrUrl}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-black/60">Supplify Item QR</div>
              <h1 className="mt-1 text-2xl font-bold tracking-normal">{item.name}</h1>
              <p className="mt-1 text-sm text-black/70">{item.description || "No description"}</p>
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <Info label="Stock No." value={item.stock_number || "—"} />
                <Info label="Property No." value={item.property_number || "—"} />
                <Info label="Type" value={item.item_type === "material" ? "Semi-expendable / Material" : "Inventory Supply"} />
                <Info label="Fund Cluster" value={item.fund_cluster || "—"} />
                <Info label="Quantity" value={`${item.quantity} ${item.unit}`} />
                <Info label="Unit Value" value={peso(item.unit_value)} />
                <Info label="Total Cost" value={peso(totalCost)} />
                <Info label="Reorder Point" value={item.reorder_level} />
                <Info label="Category" value={item.category?.name || "—"} />
                <Info label="Supplier" value={item.supplier?.name || "—"} />
                <Info label="UACS Object Code" value={item.uacs_object_code || "—"} />
                <Info label="Office/Station" value={item.office || "—"} />
                <Info label="Accountable Officer" value={item.accountable_officer || "—"} />
                <Info label="Useful Life" value={item.estimated_useful_life || "—"} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="border-b border-black/15 pb-1">
      <div className="text-[10px] uppercase tracking-wider text-black/55">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Centered({ text }: { text: string }) {
  return <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">{text}</div>;
}

function peso(value: any) {
  return Number(value ?? 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  });
}
