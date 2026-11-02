import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-indigo-50 to-white px-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight text-slate-900">
        Fillbee 🐝
      </h1>
      <p className="text-sm font-medium uppercase tracking-widest text-indigo-600">
        Smart Form Filler
      </p>
      <p className="max-w-md text-lg text-slate-600">
        Ek baar profile banao, har form apne aap bharo.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white shadow transition hover:bg-indigo-700"
      >
        Get Started
      </Link>
    </main>
  );
}
