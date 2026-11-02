import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/current-profile";
import { inspectPdf } from "@/lib/pdf/fill-pdf";
import { createClient } from "@/lib/supabase/server";
import { downloadTemplatePdf, listTemplates } from "@/lib/templates";

export default function FormsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">Forms</h1>
          <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:underline">
            &larr; Dashboard
          </Link>
        </div>
        <p className="text-slate-600">Form kholo, preview dekho, khali details bharo aur download karo.</p>
        <Suspense fallback={<p className="text-slate-500">Loading forms...</p>}>
          <FormList />
        </Suspense>
      </div>
    </main>
  );
}

async function FormList() {
  const current = await getCurrentUserProfile();
  if (!current) redirect("/login");

  const supabase = await createClient();
  // Admin ko draft bhi milte hain, isliye yahan sirf published dikhate hain.
  const templates = (await listTemplates(supabase)).filter((t) => t.is_published);

  if (templates.length === 0) {
    return <p className="rounded-xl bg-white p-6 text-slate-500 shadow-sm">Abhi koi form available nahi hai.</p>;
  }

  const cards = await Promise.all(
    templates.map(async (template) => {
      const pdf = await downloadTemplatePdf(supabase, template.storage_path);
      const reports = await inspectPdf(pdf, current.profile, template.field_map, template.boxes);
      return {
        template,
        total: reports.length,
        filled: reports.filter((r) => r.status === "filled").length,
        empty: reports.filter((r) => r.status === "empty").length,
      };
    }),
  );

  return (
    <>
      {cards.map(({ template, total, filled, empty }) => (
        <Link
          key={template.id}
          href={`/forms/${template.id}`}
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-6 shadow-sm hover:ring-2 hover:ring-indigo-200"
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{template.title}</h2>
            {template.description && <p className="text-sm text-slate-600">{template.description}</p>}
            <p className="mt-1 text-sm text-slate-700">
              <span className="font-semibold">{filled}</span> of {total} bharenge
              {empty > 0 && <span className="text-amber-700"> · {empty} profile mein khali</span>}
            </p>
          </div>
          <span className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Kholo</span>
        </Link>
      ))}
    </>
  );
}
