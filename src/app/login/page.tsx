import { Suspense } from "react";
import { login, signup } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <form className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-slate-900">Login / Signup</h1>

        {/* searchParams request time par milta hai, isliye Suspense ke andar */}
        <Suspense>
          <Notices searchParams={searchParams} />
        </Suspense>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Email
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            className="rounded border border-slate-300 px-3 py-2 font-normal"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            className="rounded border border-slate-300 px-3 py-2 font-normal"
          />
        </label>

        <div className="flex gap-3">
          <button
            formAction={login}
            className="flex-1 rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700"
          >
            Login
          </button>
          <button
            formAction={signup}
            className="flex-1 rounded-lg border border-indigo-600 py-2 font-medium text-indigo-600 hover:bg-indigo-50"
          >
            Sign up
          </button>
        </div>
      </form>
    </main>
  );
}

async function Notices({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <>
      {error && (
        <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {message && (
        <p className="rounded bg-green-50 p-3 text-sm text-green-700">
          {message}
        </p>
      )}
    </>
  );
}
