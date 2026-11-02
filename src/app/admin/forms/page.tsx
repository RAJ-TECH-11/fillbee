import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdmin } from "@/lib/admin";
import { listTemplates } from "@/lib/templates";
import { UploadForm } from "./upload-form";

export default function AdminFormsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">Admin: Forms</h1>
          <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:underline">
            &larr; Dashboard
          </Link>
        </div>
        <Suspense fallback={<p className="text-slate-500">Loading...</p>}>
          <AdminForms />
        </Suspense>
      </div>
    </main>
  );
}

async function AdminForms() {
  const admin = await getAdmin();
  // Admin nahi hai to page "exist hi nahi karta" (404), taaki admin URL ka pata na chale.
  if (!admin) notFound();

  const templates = await listTemplates(admin.supabase);

  return (
    <>
      <p className="text-sm text-slate-600">
        Practice ke liye{" "}
        <a href="/samples/sample-application-form.pdf" className="font-medium text-indigo-600 hover:underline" download>
          fillable sample
        </a>{" "}
        ya{" "}
        <a href="/samples/sample-bank-kyc-form.pdf" className="font-medium text-indigo-600 hover:underline" download>
          scanned-jaisa sample (bina fields)
        </a>{" "}
        download karke upload kar sakte ho.
      </p>

      <UploadForm />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Saare forms ({templates.length})</h2>
        {templates.length === 0 && <p className="text-sm text-slate-500">Abhi koi form nahi hai.</p>}
        {templates.map((t) => {
          const total = Object.keys(t.field_map).length;
          const mapped = Object.values(t.field_map).filter(Boolean).length;
          return (
            <Link
              key={t.id}
              href={`/admin/forms/${t.id}`}
              className="flex items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm hover:ring-2 hover:ring-indigo-200"
            >
              <div>
                <p className="font-medium text-slate-900">{t.title}</p>
                <p className="text-sm text-slate-500">
                  {total > 0 && `${mapped} of ${total} fields jude hain`}
                  {total > 0 && t.boxes.length > 0 && " · "}
                  {t.boxes.length > 0 && `${t.boxes.length} boxes`}
                  {total === 0 && t.boxes.length === 0 && "Koi field ya box nahi, boxes banao"}
                </p>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${t.is_published ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}
              >
                {t.is_published ? "Published" : "Draft"}
              </span>
            </Link>
          );
        })}
      </section>
    </>
  );
}
