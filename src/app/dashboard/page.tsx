import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { signout } from "../login/actions";

// Page khud static rehta hai (turant dikhta hai).
// Sirf UserInfo cookies padhta hai, isliye wo Suspense ke andar stream hota hai.
export default function Dashboard() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
      <Suspense fallback={<p className="text-slate-500">Loading...</p>}>
        <UserInfo />
      </Suspense>
    </main>
  );
}

async function UserInfo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proxy pehle hi bachata hai, lekin yahan dobara check karna zaroori hai.
  // Security ka rule: kabhi sirf ek jagah par bharosa mat karo.
  if (!user) redirect("/login");

  const isAdmin = await isCurrentUserAdmin();

  return (
    <>
      <p className="text-slate-600">
        Logged in as <span className="font-medium">{user.email}</span>
      </p>
      <Link
        href="/profile"
        className="w-fit rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
      >
        My profile
      </Link>
      <Link
        href="/forms"
        className="w-fit rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
      >
        Fill a form
      </Link>
      {isAdmin && (
        <Link
          href="/admin/forms"
          className="w-fit rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-800 hover:bg-slate-50"
        >
          Admin panel
        </Link>
      )}
      <form action={signout}>
        <button className="rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-900">
          Logout
        </button>
      </form>
    </>
  );
}
