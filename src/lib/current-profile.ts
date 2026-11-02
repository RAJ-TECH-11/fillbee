import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ProfileData } from "@/lib/profile-fields";

// Logged-in user aur uski profile ek saath. User nahi hai to null.
export async function getCurrentUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // RLS ki wajah se ye query sirf isi user ki row laa sakti hai.
  const { data, error } = await supabase
    .from("profiles")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const profile: ProfileData = { email: user.email ?? "", ...(data?.data ?? {}) };
  return { user, profile };
}
