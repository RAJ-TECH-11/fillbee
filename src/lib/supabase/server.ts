import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { io } from "next/cache";

// Server (server component / server action) ke liye Supabase client.
// Login session cookies mein rehta hai.
//
// canSetCookies: sirf login, signup aur logout ko true chahiye (wahi session banate/hatate hain).
// Baaki jagah session refresh proxy.ts har request par karta hai. Agar data wale server
// actions bhi cookie likhein, to Next.js page dobara render karta hai aur dev mode mein
// "Received an underlying cookies object..." wala Next.js bug aata hai.
export async function createClient({ canSetCookies = false } = {}) {
  const cookieStore = await cookies();
  // Supabase token expiry check ke liye Date.now() padhta hai. io() Next.js ko
  // batata hai ki ye value prerender mein capture nahi karni (request par turant resolve).
  await io();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          if (!canSetCookies) return;
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component se cookie set nahi hoti. Proxy session refresh
            // sambhalta hai, isliye yahan ignore karna safe hai.
          }
        },
      },
    },
  );
}
