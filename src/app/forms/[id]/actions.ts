"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_FIELDS, type ProfileData } from "@/lib/profile-fields";
import { partialProfileSchema } from "@/lib/profile-schema";

export type MissingState = {
  status: "idle" | "saved" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: ProfileData;
};

const PROFILE_KEYS = new Set(PROFILE_FIELDS.map((f) => f.key));

// Form page se sirf khali fields bharna. Baaki profile ko chhuta bhi nahi.
export async function saveMissingFields(
  formId: string,
  _prev: MissingState,
  formData: FormData,
): Promise<MissingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Login expire ho gaya. Dobara login karo." };

  // Sirf wahi keys jo form mein aayi aur asli profile fields hain.
  const keys = [...new Set([...formData.keys()].filter((k) => PROFILE_KEYS.has(k)))];
  const input = Object.fromEntries(
    keys.map((k) => {
      const v = formData.get(k);
      return [k, typeof v === "string" ? v : ""];
    }),
  );

  const result = partialProfileSchema(keys).safeParse(input);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { status: "error", message: "Kuch fields theek karni hain.", fieldErrors, values: input };
  }

  // Khali chhodi gayi fields save mat karo, sirf bhari hui.
  const filled = Object.fromEntries(
    Object.entries(result.data as Record<string, string>).filter(([, v]) => v !== ""),
  );
  if (Object.keys(filled).length === 0) {
    return { status: "error", message: "Kam se kam ek detail bharo.", values: input };
  }

  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) return { status: "error", message: readError.message, values: input };

  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, data: { ...(existing?.data ?? {}), ...filled } }, { onConflict: "user_id" });
  if (error) return { status: "error", message: error.message, values: input };

  revalidatePath(`/forms/${formId}`);
  revalidatePath("/forms");
  revalidatePath("/profile");
  return { status: "saved", message: `${Object.keys(filled).length} detail profile mein save ho gayi.` };
}
