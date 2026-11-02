import "server-only";
import { createClient } from "@/lib/supabase/server";

// Logged-in user admin hai to { supabase, user }, warna null.
// Asli suraksha database ki RLS policies karti hain; ye check sirf UI ke liye hai.
export async function getAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || isAdmin !== true) return null;

  return { supabase, user };
}

export async function isCurrentUserAdmin() {
  return (await getAdmin()) !== null;
}
