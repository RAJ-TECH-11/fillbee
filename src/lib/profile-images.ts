import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileImages } from "@/lib/pdf/fill-pdf";
import { IMAGE_FIELDS, imagePathKey, type ProfileData } from "@/lib/profile-fields";

export const USER_FILES_BUCKET = "user-files";
export const MAX_IMAGE_BYTES = 1024 * 1024; // 1 MB

type ImageMime = "image/png" | "image/jpeg";

// File ka naam ya type bharose ke layak nahi, pehle bytes dekho.
export function detectImageMime(bytes: Uint8Array): ImageMime | null {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  return null;
}

const mimeFromPath = (path: string): ImageMime =>
  path.endsWith(".png") ? "image/png" : "image/jpeg";

// Form bharne ke liye user ki photo/signature Storage se lao.
export async function loadProfileImages(supabase: SupabaseClient, profile: ProfileData) {
  const images: ProfileImages = {};
  await Promise.all(
    IMAGE_FIELDS.map(async ({ key }) => {
      const path = profile[imagePathKey(key)];
      if (!path) return;
      const { data } = await supabase.storage.from(USER_FILES_BUCKET).download(path);
      if (data) {
        images[key] = { bytes: new Uint8Array(await data.arrayBuffer()), mime: mimeFromPath(path) };
      }
    }),
  );
  return images;
}

// Profile page par dikhane ke liye 1 ghante ke temporary links.
export async function signedImageUrls(supabase: SupabaseClient, profile: ProfileData) {
  const urls: Partial<Record<(typeof IMAGE_FIELDS)[number]["key"], string>> = {};
  await Promise.all(
    IMAGE_FIELDS.map(async ({ key }) => {
      const path = profile[imagePathKey(key)];
      if (!path) return;
      const { data } = await supabase.storage.from(USER_FILES_BUCKET).createSignedUrl(path, 60 * 60);
      if (data) urls[key] = data.signedUrl;
    }),
  );
  return urls;
}
