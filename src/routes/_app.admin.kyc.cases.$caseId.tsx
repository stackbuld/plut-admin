import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { kycQueries } from "@/api/kyc";
import type {
  KycCaseDocumentDto,
  KycCasePersonalInfoDto,
  KycCaseProviderLogDto,
  KycCaseTimelineDto,
} from "@/api/types/kyc.types";
import { KycCaseStatusBadge } from "@/components/plut/kyc/KycCaseStatusBadge";
import { KycCaseActions } from "@/components/plut/kyc/KycCaseActions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime, truncId } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/kyc/cases/$caseId")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(kycQueries.caseDetail(params.caseId));
  },
  component: KycCaseDetail,
});

function KycCaseDetail() {
  const { caseId } = Route.useParams();
  const { data: c, isLoading } = useQuery(kycQueries.caseDetail(caseId));

  if (isLoading || !c) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        to="/admin/kyc/cases"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to cases
      </Link>

      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <KycCaseStatusBadge status={c.status} />
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {c.type} · {c.targetTier}
              </span>
            </div>
            <p className="mt-2 font-mono text-xs text-muted-foreground">{truncId(c.caseId, 24)}</p>
            {c.externalReference && (
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                Ref: {c.externalReference}
              </p>
            )}
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Submitted {formatDateTime(c.submittedAt)}</p>
          </div>
        </div>

        {c.rejectionReason && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {c.rejectionReason}
          </div>
        )}

        <KycCaseActions kycCase={c} />
      </div>

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">Documents ({c.documents.length})</TabsTrigger>
          <TabsTrigger value="personal-info">Personal Info</TabsTrigger>
          <TabsTrigger value="raw-response">Raw Response ({c.providerLogs.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <DocumentsPanel documents={c.documents} />
        </TabsContent>
        <TabsContent value="personal-info">
          <PersonalInfoPanel info={c.personalInfo} />
        </TabsContent>
        <TabsContent value="raw-response">
          <RawResponsePanel logs={c.providerLogs} />
        </TabsContent>
        <TabsContent value="timeline">
          <TimelinePanel events={c.timeline} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DocumentsPanel({ documents }: { documents: KycCaseDocumentDto[] }) {
  if (documents.length === 0) {
    return (
      <Panel>
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          No documents uploaded.
        </p>
      </Panel>
    );
  }
  return (
    <div className="space-y-4">
      {documents.map((d) => (
        <Panel key={d.id} title={d.type}>
          <div className="flex flex-wrap gap-4 p-3">
            <DocThumb url={d.fileUrl1} label="Front" />
            {d.fileUrl2 && <DocThumb url={d.fileUrl2} label="Back" />}
            {d.metaFileUrls.map((m, i) => (
              <DocThumb key={i} url={m.fileUrl} label={m.title} />
            ))}
          </div>
          <div className="divide-y divide-border border-t border-border">
            {d.documentIdNumber && <Row label="Document #" value={d.documentIdNumber} mono />}
            <Row label="File name" value={d.fileName} mono />
            <Row label="Content type" value={d.contentType} />
            <Row label="Uploaded" value={formatDateTime(d.uploadedAt)} />
          </div>
        </Panel>
      ))}
    </div>
  );
}

function DocThumb({ url, label }: { url: string; label: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="group block">
      <div className="relative h-28 w-28 overflow-hidden rounded-lg border bg-background">
        <img src={url} alt={label} className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex">
          <ExternalLink className="h-4 w-4 text-white" />
        </div>
      </div>
      <p className="mt-1 text-center text-[11px] text-muted-foreground">{label}</p>
    </a>
  );
}

const PERSONAL_INFO_FIELDS: { key: keyof KycCasePersonalInfoDto; label: string }[] = [
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "middleName", label: "Middle name" },
  { key: "dateOfBirth", label: "Date of birth" },
  { key: "gender", label: "Gender" },
  { key: "country", label: "Country" },
  { key: "nationality", label: "Nationality" },
  { key: "phoneNumber", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "residentialAddress", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "postalCode", label: "Postal code" },
  { key: "maritalStatus", label: "Marital status" },
  { key: "documentType", label: "Document type" },
  { key: "documentNumber", label: "Document number" },
];

// Only populated once the user has done Tier2's address/utility-bill verification — rendered as a
// separate block so it doesn't clutter the base identity fields for users who haven't done it yet.
const ADDRESS_VERIFICATION_FIELDS: { key: keyof KycCasePersonalInfoDto; label: string }[] = [
  { key: "addressFormatted", label: "Verified address" },
  { key: "addressLatitude", label: "Latitude" },
  { key: "addressLongitude", label: "Longitude" },
];

function PersonalInfoPanel({ info }: { info: KycCasePersonalInfoDto | null }) {
  if (!info) {
    return (
      <Panel>
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          Not synced yet — use the sync action above.
        </p>
      </Panel>
    );
  }
  const hasAddressVerification = ADDRESS_VERIFICATION_FIELDS.some(({ key }) => info[key]);

  return (
    <div className="space-y-4">
      <Panel title={`Synced from ${info.provider} · ${formatDateTime(info.fetchedAt)}`}>
        {PERSONAL_INFO_FIELDS.map(({ key, label }) => (
          <Row key={key} label={label} value={info[key] as string | null} />
        ))}
      </Panel>
      {hasAddressVerification && (
        <Panel title="Address verification (Tier2)">
          {ADDRESS_VERIFICATION_FIELDS.map(({ key, label }) => (
            <Row key={key} label={label} value={info[key] as string | null} />
          ))}
          {info.isAddressRecent !== null && (
            <Row label="Utility bill recent" value={info.isAddressRecent ? "Yes" : "No"} />
          )}
        </Panel>
      )}
    </div>
  );
}

function RawResponsePanel({ logs }: { logs: KycCaseProviderLogDto[] }) {
  if (logs.length === 0) {
    return (
      <Panel>
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          No provider calls recorded yet.
        </p>
      </Panel>
    );
  }
  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="rounded-lg border bg-background p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold">
              {log.provider} · {log.operation}
            </span>
            <span
              className={
                "rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                (log.success ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")
              }
            >
              {log.success ? "Success" : "Failed"}
            </span>
            <span className="text-xs text-muted-foreground">{formatDateTime(log.occurredAt)}</span>
          </div>
          {log.rawResponse && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                Raw response
              </summary>
              <pre className="mt-2 max-h-80 overflow-auto rounded bg-secondary/60 p-2 text-[11px]">
                {formatJson(log.rawResponse)}
              </pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

function formatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function TimelinePanel({ events }: { events: KycCaseTimelineDto[] }) {
  if (events.length === 0) {
    return (
      <Panel>
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">No events yet.</p>
      </Panel>
    );
  }
  return (
    <Panel>
      {events.map((t, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
        >
          <span>
            {t.previousStatus} → <span className="font-semibold">{t.newStatus}</span>
            {t.comment && <span className="text-muted-foreground"> — {t.comment}</span>}
          </span>
          <span className="text-xs text-muted-foreground">{formatDateTime(t.occurredAt)}</span>
        </div>
      ))}
    </Panel>
  );
}

function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="mt-2 rounded-2xl border bg-card p-5">
      {title && (
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      )}
      <div className="divide-y divide-border rounded-lg border bg-background">{children}</div>
    </section>
  );
}

function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : ""}>{value}</span>
    </div>
  );
}
