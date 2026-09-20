import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";
import { getRisVerification } from "@/lib/data.functions";

export const Route = createFileRoute("/_app/verify/ris/$token")({
  head: () => ({
    meta: [
      { title: "Verify RIS - Supplify" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: VerifyRis,
});

type VerificationItem = {
  description: string;
  quantity: number;
  unit: string;
};

type VerificationRecord = {
  verification_code: string;
  ris_no: string;
  status: "approved" | "issued" | "received" | "cancelled" | "superseded";
  office: string | null;
  purpose: string | null;
  approved_by: string | null;
  issued_by: string | null;
  approved_date: string | null;
  issued_date: string | null;
  item_count: number;
  items: VerificationItem[];
  document_version: number;
  published_at: string;
  updated_at: string;
};

function VerifyRis() {
  const { token } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-ris-verification", token],
    retry: false,
    queryFn: async () => {
      return (await getRisVerification({
        data: { token },
      })) as VerificationRecord | null;
    },
  });

  if (isLoading) return <VerificationShell><LoadingState /></VerificationShell>;
  if (error || !data)
    return (
      <VerificationShell>
        <InvalidState />
      </VerificationShell>
    );

  const invalid = data.status === "cancelled" || data.status === "superseded";
  return (
    <VerificationShell>
      <main className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div
          className={`p-6 text-white sm:p-8 ${
            invalid ? "bg-destructive" : "bg-emerald-700"
          }`}
        >
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/15">
              {invalid ? (
                <AlertTriangle className="h-7 w-7" />
              ) : (
                <CheckCircle2 className="h-7 w-7" />
              )}
            </span>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">
                Authenticated Supplify Verification
              </div>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
                {invalid ? "RIS is no longer valid" : "Authentic RIS"}
              </h1>
              <p className="mt-2 text-sm text-white/80">
                This result was retrieved directly from the local RIS database.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="RIS Number" value={data.ris_no} />
            <Detail label="Current Status" value={data.status.toUpperCase()} />
            <Detail label="Verification Code" value={data.verification_code} />
            <Detail label="Document Version" value={String(data.document_version)} />
            <Detail label="Requesting Office" value={data.office || "Not specified"} />
            <Detail label="Items" value={`${data.item_count} line item(s)`} />
            <Detail label="Approved By" value={data.approved_by || "Not specified"} />
            <Detail label="Approval Date" value={displayDate(data.approved_date)} />
            <Detail label="Issued By" value={data.issued_by || "Not specified"} />
            <Detail label="Issue Date" value={displayDate(data.issued_date)} />
          </div>

          {data.purpose && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Purpose
              </h2>
              <p className="mt-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                {data.purpose}
              </p>
            </section>
          )}

          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Verified Items
            </h2>
            <div className="mt-2 overflow-hidden rounded-lg border border-border">
              {data.items.map((item, index) => (
                <div
                  key={`${item.description}-${index}`}
                  className="flex items-start justify-between gap-4 border-t border-border px-4 py-3 first:border-t-0"
                >
                  <span className="text-sm font-medium">{item.description}</span>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {item.quantity} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Confirm that this domain is the official TESDA inventory verification
              website and that the RIS number and verification code match the document.
              Last registry update: {new Date(data.updated_at).toLocaleString()}.
            </p>
          </div>
        </div>
      </main>
    </VerificationShell>
  );
}

function VerificationShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/40 px-4 py-8 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-center gap-3">
          <img src="/favicon.svg" alt="" className="h-10 w-10 rounded-lg" />
          <div>
            <div className="font-display text-lg font-bold">Supplify</div>
            <div className="text-xs text-muted-foreground">
              Authorized Document Verification
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-lg">
      <FileCheck2 className="mx-auto h-10 w-10 animate-pulse text-primary" />
      <p className="mt-4 font-medium">Checking the official RIS registry…</p>
    </div>
  );
}

function InvalidState() {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-card p-8 text-center shadow-lg">
      <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
      <h1 className="mt-4 text-2xl font-bold">RIS could not be verified</h1>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
        This QR code is invalid, the record has not been published, or the verification
        service is temporarily unavailable. Do not accept the document until its issuing
        office confirms it.
      </p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold">{value}</div>
    </div>
  );
}

function displayDate(value: string | Date | null) {
  if (!value) return "Not specified";
  const normalized = value instanceof Date ? value.toISOString().slice(0, 10) : value;
  const date = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
}
