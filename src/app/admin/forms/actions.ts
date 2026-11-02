"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdmin } from "@/lib/admin";
import { getPdfPageSizes, listPdfFields, type Box, type FieldMap } from "@/lib/pdf/fill-pdf";
import { IMAGE_KEYS, PROFILE_FIELDS } from "@/lib/profile-fields";
import {
  MAX_PDF_BYTES,
  TEMPLATE_BUCKET,
  downloadTemplatePdf,
  getTemplate,
} from "@/lib/templates";

export type AdminFormState = {
  status: "idle" | "error" | "saved";
  message?: string;
  // Edit page: jo values save hui (ya submit hui), form wahi dikhata hai.
  values?: {
    title: string;
    description: string;
    isPublished: boolean;
    fieldMap: FieldMap;
    boxes: Box[];
  };
  // Har save par naya number, taaki form naye sire se bane (dropdown sahi value dikhaye).
  version?: number;
};

const PROFILE_KEYS = new Set(PROFILE_FIELDS.map((f) => f.key));

const MAX_BOXES = 300;
const boxSchema = z.object({
  id: z.string().min(1).max(40),
  page: z.number().int().min(0),
  x: z.number().finite().min(0),
  y: z.number().finite().min(0),
  width: z.number().finite().min(2),
  height: z.number().finite().min(2),
  key: z.string().max(60),
});

// Browser se aaye boxes: JSON sahi ho, page aur size PDF ke andar hon, aur har box ka field chuna ho.
function parseBoxes(
  raw: FormDataEntryValue | null,
  pageSizes: { width: number; height: number }[],
): { boxes: Box[]; error?: string } {
  let json: unknown = [];
  try {
    json = JSON.parse(typeof raw === "string" && raw ? raw : "[]");
  } catch {
    return { boxes: [], error: "Boxes ka data kharab hai, page reload karo." };
  }
  const parsed = z.array(boxSchema).max(MAX_BOXES, `Max ${MAX_BOXES} boxes`).safeParse(json);
  if (!parsed.success) return { boxes: [], error: "Boxes ka data galat hai." };

  const boxes = parsed.data;
  for (const [i, b] of boxes.entries()) {
    const size = pageSizes[b.page];
    if (!size || b.x + b.width > size.width + 1 || b.y + b.height > size.height + 1) {
      return { boxes, error: `Box ${i + 1} page ke bahar hai.` };
    }
    if (!PROFILE_KEYS.has(b.key) && !IMAGE_KEYS.has(b.key)) {
      return { boxes, error: `Box ${i + 1} ke liye profile field chuno.` };
    }
  }
  return { boxes };
}

const detailsSchema = z.object({
  title: z.string().trim().min(3, "Title kam se kam 3 characters").max(120, "Title max 120 characters"),
  description: z.string().trim().max(300, "Description max 300 characters"),
});

// ---------- Naya form upload ----------
export async function uploadTemplate(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await getAdmin();
  if (!admin) return { status: "error", message: "Sirf admin form add kar sakta hai." };

  const details = detailsSchema.safeParse({
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
  });
  if (!details.success) {
    return { status: "error", message: details.error.issues[0].message };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "PDF file chuno." };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { status: "error", message: "PDF 4 MB se chhoti honi chahiye." };
  }

  // File ka naam ya type bharose ke layak nahi, asli bytes check karo.
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    return { status: "error", message: "Ye PDF file nahi hai." };
  }

  let fields;
  try {
    fields = await listPdfFields(bytes);
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
  // Shuruaati mapping: jo naam se pehchane gaye wo jud jaate hain, baaki null.
  const fieldMap: FieldMap = Object.fromEntries(fields.map((f) => [f.name, f.autoKey]));

  const storagePath = `${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await admin.supabase.storage
    .from(TEMPLATE_BUCKET)
    .upload(storagePath, bytes, { contentType: "application/pdf" });
  if (uploadError) {
    return { status: "error", message: `Upload fail: ${uploadError.message}` };
  }

  const { data, error } = await admin.supabase
    .from("form_templates")
    .insert({
      title: details.data.title,
      description: details.data.description,
      storage_path: storagePath,
      field_map: fieldMap,
      created_by: admin.user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    // Database mein entry nahi bani to file bhi hata do, kachra na bache.
    await admin.supabase.storage.from(TEMPLATE_BUCKET).remove([storagePath]);
    return { status: "error", message: `Save fail: ${error?.message ?? "unknown"}` };
  }

  revalidatePath("/admin/forms");
  redirect(`/admin/forms/${data.id}`);
}

// ---------- Mapping, details aur publish save ----------
export async function saveTemplate(
  id: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await getAdmin();
  if (!admin) return { status: "error", message: "Sirf admin edit kar sakta hai." };

  const template = await getTemplate(admin.supabase, id);
  if (!template) return { status: "error", message: "Form nahi mila." };

  // Sirf wahi fields lo jo PDF mein sach mein hain, aur sirf asli profile keys.
  const pdf = await downloadTemplatePdf(admin.supabase, template.storage_path);
  const fields = await listPdfFields(pdf);
  const fieldMap: FieldMap = {};
  for (const field of fields) {
    const value = formData.get(`map:${field.name}`);
    fieldMap[field.name] =
      typeof value === "string" && PROFILE_KEYS.has(value) ? value : null;
  }

  const { boxes, error: boxError } = parseBoxes(formData.get("boxes"), await getPdfPageSizes(pdf));

  const values = {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    isPublished: formData.get("is_published") === "on",
    fieldMap,
    boxes,
  };

  if (boxError) {
    return { status: "error", message: boxError, values, version: Date.now() };
  }

  const details = detailsSchema.safeParse(values);
  if (!details.success) {
    return { status: "error", message: details.error.issues[0].message, values, version: Date.now() };
  }

  const { error } = await admin.supabase
    .from("form_templates")
    .update({
      title: details.data.title,
      description: details.data.description,
      field_map: fieldMap,
      boxes,
      is_published: values.isPublished,
    })
    .eq("id", id);

  if (error) return { status: "error", message: error.message, values, version: Date.now() };

  revalidatePath("/admin/forms");
  revalidatePath("/forms");
  return {
    status: "saved",
    message: "Save ho gaya.",
    values: { ...values, title: details.data.title, description: details.data.description },
    version: Date.now(),
  };
}

// ---------- Form delete ----------
export async function deleteTemplate(id: string) {
  const admin = await getAdmin();
  if (!admin) return;

  const template = await getTemplate(admin.supabase, id);
  if (!template) redirect("/admin/forms");

  const { error } = await admin.supabase.from("form_templates").delete().eq("id", id);
  if (!error) {
    await admin.supabase.storage.from(TEMPLATE_BUCKET).remove([template.storage_path]);
  }

  revalidatePath("/admin/forms");
  revalidatePath("/forms");
  redirect("/admin/forms");
}
