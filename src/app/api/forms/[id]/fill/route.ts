import { getCurrentUserProfile } from "@/lib/current-profile";
import { fillPdf } from "@/lib/pdf/fill-pdf";
import { loadProfileImages } from "@/lib/profile-images";
import { createClient } from "@/lib/supabase/server";
import { downloadTemplatePdf, getTemplate } from "@/lib/templates";

// GET /api/forms/<template id>/fill
//   ?flatten=1  final PDF (fields pakke ho jaate hain, edit nahi ho sakte)
//   ?inline=1   browser mein dikhao (preview), download mat karo
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const search = new URL(request.url).searchParams;
  const flatten = search.get("flatten") === "1";
  const inline = search.get("inline") === "1";

  const current = await getCurrentUserProfile();
  if (!current) {
    return new Response("Login required", { status: 401 });
  }

  // RLS: normal user ko sirf published form milta hai.
  const supabase = await createClient();
  const template = await getTemplate(supabase, id);
  if (!template) {
    return new Response("Form not found", { status: 404 });
  }

  const [pdf, images] = await Promise.all([
    downloadTemplatePdf(supabase, template.storage_path),
    loadProfileImages(supabase, current.profile),
  ]);
  const { bytes } = await fillPdf(pdf, current.profile, template.field_map, template.boxes, {
    images,
    flatten,
  });

  const base = template.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "form";
  const fileName = `${base}-${flatten ? "final" : "filled"}.pdf`;

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${fileName}"`,
      // Personal data hai: browser ya beech ka koi server ise cache na kare.
      "Cache-Control": "private, no-store",
    },
  });
}
