"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  IMAGE_KEYS,
  imagePathKey,
  type ImageKey,
  type ProfileData,
} from "@/lib/profile-fields";
import { MAX_IMAGE_BYTES, USER_FILES_BUCKET, detectImageMime } from "@/lib/profile-images";
import { formDataToProfileInput, profileSchema } from "@/lib/profile-schema";

export type SaveState = {
  status: "idle" | "saved" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: ProfileData;
};

export async function saveProfile(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Login expire ho gaya. Dobara login karo." };
  }

  // Browser se aaya data kabhi blindly save mat karo.
  // Zod schema sirf humari list ke fields leta hai, trim karta hai, aur check karta hai.
  const input = formDataToProfileInput(formData);
  const result = profileSchema.safeParse(input);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return {
      status: "error",
      message: "Kuch fields theek karni hain.",
      fieldErrors,
      values: input,
    };
  }

  const values: ProfileData = result.data;

  // Purana data padh ke merge karo, taaki jo keys is form mein nahi hain
  // (jaise aage "smart profile" se jude fields) wo delete na ho jaayein.
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) {
    return { status: "error", message: readError.message, values };
  }

  const merged: ProfileData = { ...(existing?.data ?? {}), ...values };
  for (const key of Object.keys(merged)) {
    if (merged[key] === "") delete merged[key];
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, data: merged }, { onConflict: "user_id" });

  if (error) {
    return { status: "error", message: error.message, values };
  }

  return { status: "saved", message: "Profile save ho gayi.", values };
}

// ---------- Photo / signature ----------

export type ImageState = { status: "idle" | "saved" | "error"; message?: string; version?: number };

async function setImagePath(key: ImageKey, path: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: "Login expire ho gaya. Dobara login karo." };

  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) return { supabase, user, error: readError.message };

  const data: ProfileData = { ...(existing?.data ?? {}) };
  if (path) data[imagePathKey(key)] = path;
  else delete data[imagePathKey(key)];

  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, data }, { onConflict: "user_id" });
  return { supabase, user, error: error?.message ?? null };
}

export async function uploadProfileImage(
  key: ImageKey,
  _prev: ImageState,
  formData: FormData,
): Promise<ImageState> {
  if (!IMAGE_KEYS.has(key)) return { status: "error", message: "Galat image type." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Login expire ho gaya. Dobara login karo." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Image chuno." };
  if (file.size > MAX_IMAGE_BYTES) return { status: "error", message: "Image 1 MB se chhoti honi chahiye." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectImageMime(bytes);
  if (!mime) return { status: "error", message: "Sirf PNG ya JPG image chalegi." };

  // Path: <user id>/<photo|signature>.<ext>  (RLS sirf apne folder ki ijazat deta hai)
  const ext = mime === "image/png" ? "png" : "jpg";
  const path = `${user.id}/${key}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(USER_FILES_BUCKET)
    .upload(path, bytes, { contentType: mime, upsert: true });
  if (uploadError) return { status: "error", message: `Upload fail: ${uploadError.message}` };

  // Pehle doosre format (png/jpg) mein thi to wo purani file hata do.
  const other = `${user.id}/${key}.${ext === "png" ? "jpg" : "png"}`;
  await supabase.storage.from(USER_FILES_BUCKET).remove([other]);

  const { error } = await setImagePath(key, path);
  if (error) return { status: "error", message: error };

  revalidatePath("/profile");
  return { status: "saved", message: "Upload ho gaya.", version: Date.now() };
}

export async function removeProfileImage(key: ImageKey): Promise<ImageState> {
  if (!IMAGE_KEYS.has(key)) return { status: "error", message: "Galat image type." };

  const { supabase, user, error } = await setImagePath(key, null);
  if (!user) return { status: "error", message: error ?? "Login required" };
  if (error) return { status: "error", message: error };

  await supabase.storage
    .from(USER_FILES_BUCKET)
    .remove([`${user.id}/${key}.png`, `${user.id}/${key}.jpg`]);

  revalidatePath("/profile");
  return { status: "saved", message: "Hata diya.", version: Date.now() };
}
