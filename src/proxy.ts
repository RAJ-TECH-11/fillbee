import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Har request se pehle chalta hai:
// 1. Login session refresh karta hai (token expire na ho)
// 2. Bina login ke protected pages (/dashboard, /profile, /forms, /admin) kholne par /login par bhej deta hai
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Purana/invalid refresh token (jaise project pause hone ke baad) har request par error deta rehta hai.
  // Aise me stale auth cookies hata do, user ko logged out maano.
  const hasStaleSession =
    !!error &&
    (error.code === "refresh_token_not_found" ||
      error.code === "refresh_token_already_used" ||
      /refresh token/i.test(error.message));
  const clearStaleCookies = (res: NextResponse) => {
    if (!hasStaleSession) return;
    request.cookies
      .getAll()
      .filter(
        ({ name }) =>
          name.startsWith("sb-") &&
          name.includes("-auth-token") &&
          !name.endsWith("-code-verifier"),
      )
      .forEach(({ name }) => res.cookies.delete(name));
  };

  const protectedPaths = ["/dashboard", "/profile", "/forms", "/admin"];
  const isProtected = protectedPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirectResponse = NextResponse.redirect(url);
    clearStaleCookies(redirectResponse);
    return redirectResponse;
  }

  clearStaleCookies(response);
  return response;
}

export const config = {
  matcher: [
    // Static files aur images ko chhod kar baaki sab routes
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
