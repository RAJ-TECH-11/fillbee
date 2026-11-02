"use client";

import Link from "next/link";

// Kisi page mein anjaan error aaye to poori app ki jagah ye dikhta hai.
// Asli error message user ko nahi dikhate (usme andar ki details ho sakti hain).
export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
      <h1 className="text-3xl font-bold text-slate-900">Kuch gadbad ho gayi</h1>
      <p className="text-slate-600">Dobara koshish karo. Baar-baar ho to thodi der baad aana.</p>
      <div className="flex gap-3">
        <button
          onClick={retry}
          className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700"
        >
          Dobara koshish karo
        </button>
        <Link href="/dashboard" className="rounded-lg border border-slate-300 px-5 py-2 font-medium text-slate-700 hover:bg-white">
          Dashboard
        </Link>
      </div>
    </main>
  );
}
