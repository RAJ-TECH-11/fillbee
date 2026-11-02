"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Ye functions server par chalte hain, browser par nahi.
// Form submit hone par seedha inhe call kiya jata hai.

// Network band/DNS fail hone par raw "fetch failed" dikhane ki jagah friendly message do.
// Asli auth errors (galat password etc.) jaise the waise rehte hain.
function authErrorMessage(message: string) {
  return /fetch failed/i.test(message)
    ? "Server se connect nahi ho paya. Internet check karke dobara try karo."
    : message;
}

export async function login(formData: FormData) {
  const supabase = await createClient({ canSetCookies: true });

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(authErrorMessage(error.message))}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient({ canSetCookies: true });

  // Confirm email ka link isi site ke /auth/confirm par aaye (local ya live, dono par).
  const origin = (await headers()).get("origin");
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
    options: origin ? { emailRedirectTo: `${origin}/auth/confirm?next=/dashboard` } : undefined,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(authErrorMessage(error.message))}`);
  }

  // Email confirmation on hai to session nahi milta, user ko email check karna hoga.
  if (!data.session) {
    redirect(
      `/login?message=${encodeURIComponent("Account ban gaya. Email check karke confirm karo, phir login karo.")}`,
    );
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signout() {
  const supabase = await createClient({ canSetCookies: true });
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
