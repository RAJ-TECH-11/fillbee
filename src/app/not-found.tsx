import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
      <h1 className="text-3xl font-bold text-slate-900">Page nahi mila</h1>
      <p className="text-slate-600">Ye page maujood nahi hai, ya tumhe ise dekhne ki ijazat nahi hai.</p>
      <Link href="/dashboard" className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700">
        Dashboard par jao
      </Link>
    </main>
  );
}
