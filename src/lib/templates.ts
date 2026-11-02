import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Box, FieldMap } from "@/lib/pdf/fill-pdf";

export const TEMPLATE_BUCKET = "form-templates";
export const MAX_PDF_BYTES = 4 * 1024 * 1024; // 4 MB

type FormTemplate = {
  id: string;
  title: string;
  description: string;
  storage_path: string;
  field_map: FieldMap;
  boxes: Box[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

const COLUMNS =
  "id, title, description, storage_path, field_map, boxes, is_published, created_at, updated_at";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (id: string) => UUID.test(id);

// RLS: normal user ko sirf published forms milte hain, admin ko sab.
export async function listTemplates(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("form_templates")
    .select(COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as FormTemplate[];
}

export async function getTemplate(supabase: SupabaseClient, id: string) {
  if (!isUuid(id)) return null;
  const { data, error } = await supabase
    .from("form_templates")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as FormTemplate | null) ?? null;
}

export async function downloadTemplatePdf(supabase: SupabaseClient, path: string) {
  const { data, error } = await supabase.storage.from(TEMPLATE_BUCKET).download(path);
  if (error || !data) throw new Error(`PDF download nahi hui: ${error?.message ?? "unknown"}`);
  return new Uint8Array(await data.arrayBuffer());
}
