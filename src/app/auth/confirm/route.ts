import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Email ke link se yahan aate hain (signup confirm, aage password reset bhi).
//   ?token_hash=...&type=email   (Supabase email template se, kisi bhi browser mein chalta hai)
//   ?code=...                    (Supabase ka default link, wahi browser chahiye jahan signup kiya)
//   &next=/dashboard             (kaam hone ke baad kahan bhejna hai)
const OTP_TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];

// Sirf apni site ke andar ke path par bhejo, taaki koi link se bahar ki site par na bhej sake.
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");
  const next = safeNext(params.get("next"));

  // Yahan session cookie banni hai, isliye cookie likhne ki ijazat chahiye.
  const supabase = await createClient({ canSetCookies: true });

  let error = "Link adhoora hai.";
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const result = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    error = result.error?.message ?? "";
  } else if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error?.message ?? "";
  }

  if (error) {
    redirect(`/login?error=${encodeURIComponent(`Email link kaam nahi kiya: ${error} Dobara login ya signup karo.`)}`);
  }
  redirect(next);
}
