import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdmin } from "@/lib/admin";
import { getPdfPageSizes, listPdfFields } from "@/lib/pdf/fill-pdf";
import { TEMPLATE_BUCKET, downloadTemplatePdf, getTemplate } from "@/lib/templates";
import { deleteTemplate } from "../actions";
import { EditForm } from "./edit-form";

export default function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">Edit form</h1>
          <Link href="/admin/forms" className="text-sm font-medium text-indigo-600 hover:underline">
            &larr; All forms
          </Link>
        </div>
        <Suspense fallback={<p className="text-slate-500">Loading...</p>}>
          <EditTemplate params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function EditTemplate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await getAdmin();
  if (!admin) notFound();

  const template = await getTemplate(admin.supabase, id);
  if (!template) notFound();

  const pdf = await downloadTemplatePdf(admin.supabase, template.storage_path);
  const [fields, pageSizes] = await Promise.all([listPdfFields(pdf), getPdfPageSizes(pdf)]);

  // Private PDF ko browser mein dikhane ke liye 1 ghante ka temporary link.
  const { data: signed, error } = await admin.supabase.storage
    .from(TEMPLATE_BUCKET)
    .createSignedUrl(template.storage_path, 60 * 60);
  if (error || !signed) throw new Error(`PDF link nahi bana: ${error?.message}`);

  return (
    <>
      <EditForm
        id={template.id}
        title={template.title}
        description={template.description}
        isPublished={template.is_published}
        fieldMap={template.field_map}
        boxes={template.boxes}
        fields={fields}
        pdfUrl={signed.signedUrl}
        pageSizes={pageSizes}
      />
      <form action={deleteTemplate.bind(null, template.id)} className="border-t border-slate-200 pt-6">
        <button className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
          Delete this form
        </button>
      </form>
    </>
  );
}
