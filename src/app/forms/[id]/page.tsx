import { Suspense } from "react";
import { createHash } from "node:crypto";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/current-profile";
import { inspectPdf, type FieldReport } from "@/lib/pdf/fill-pdf";
import { IMAGE_FIELDS, IMAGE_KEYS, PROFILE_FIELDS } from "@/lib/profile-fields";
import { createClient } from "@/lib/supabase/server";
import { downloadTemplatePdf, getTemplate } from "@/lib/templates";
import { MissingForm } from "./missing-form";

const LABELS: Record<string, string> = Object.fromEntries(
  [...PROFILE_FIELDS, ...IMAGE_FIELDS].map((f) => [f.key, f.label]),
);

export default function FormPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Link href="/forms" className="text-sm font-medium text-indigo-600 hover:underline">
          &larr; Saare forms
        </Link>
        <Suspense fallback={<p className="text-slate-500">Loading form...</p>}>
          <FormDetail params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function FormDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = await getCurrentUserProfile();
  if (!current) redirect("/login");

  const supabase = await createClient();
  const template = await getTemplate(supabase, id);
  if (!template || !template.is_published) notFound();

  const pdf = await downloadTemplatePdf(supabase, template.storage_path);
  const reports = await inspectPdf(pdf, current.profile, template.field_map, template.boxes);

  const filled = reports.filter((r) => r.status === "filled").length;
  const emptyKeys = [...new Set(reports.filter((r) => r.status === "empty" && r.key).map((r) => r.key!))];
  const missingText = emptyKeys.filter((k) => !IMAGE_KEYS.has(k));
  const missingImages = emptyKeys.filter((k) => IMAGE_KEYS.has(k));

  // Profile ya form badle to preview naya load ho (iframe ka URL badal jaata hai).
  const version = createHash("sha1")
    .update(JSON.stringify(current.profile) + template.updated_at)
    .digest("hex")
    .slice(0, 10);
  const fillUrl = `/api/forms/${template.id}/fill`;

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{template.title}</h1>
        {template.description && <p className="mt-1 text-slate-600">{template.description}</p>}
        <p className="mt-2 text-sm text-slate-700">
          <span className="font-semibold">{filled}</span> of {reports.length} jagah tumhari profile se bharengi.
        </p>
      </div>

      {missingText.length > 0 && <MissingForm formId={template.id} keys={missingText} />}

      {missingImages.length > 0 && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Is form mein {missingImages.map((k) => LABELS[k]).join(" aur ")} ki jagah hai.{" "}
          <Link href="/profile" className="font-medium underline">
            Profile mein upload karo
          </Link>
          .
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Preview</h2>
          <div className="flex flex-wrap gap-2">
            <a
              href={`${fillUrl}?flatten=1`}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Download final PDF
            </a>
            <a
              href={fillUrl}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Editable PDF
            </a>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          <b>Final</b>: text pakka ho jaata hai, print ya upload ke liye best. <b>Editable</b>: PDF reader mein
          fields badal sakte ho.
        </p>
        <iframe
          key={version}
          src={`${fillUrl}?inline=1&flatten=1&v=${version}`}
          title={`${template.title} preview`}
          className="h-[70vh] w-full rounded border border-slate-200"
        />
      </section>

      <details className="rounded-xl bg-white p-6 shadow-sm">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">Har field ki report</summary>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {reports.map((r) => (
            <ReportRow key={r.field} report={r} />
          ))}
        </ul>
      </details>
    </>
  );
}

const STATUS_STYLE: Record<FieldReport["status"], { text: string; className: string }> = {
  filled: { text: "Bharega", className: "bg-green-100 text-green-800" },
  empty: { text: "Profile mein khali", className: "bg-amber-100 text-amber-800" },
  unmatched: { text: "Pehchana nahi", className: "bg-slate-100 text-slate-600" },
  skipped: { text: "Khali rahega", className: "bg-slate-100 text-slate-600" },
  unsupported: { text: "Support nahi", className: "bg-red-100 text-red-700" },
};

function ReportRow({ report }: { report: FieldReport }) {
  const style = STATUS_STYLE[report.status];
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="text-slate-800">
        {report.field}
        {report.key && <span className="text-slate-400"> &rarr; {LABELS[report.key] ?? report.key}</span>}
        {report.note && <span className="text-slate-400"> ({report.note})</span>}
      </span>
      <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${style.className}`}>{style.text}</span>
    </li>
  );
}
