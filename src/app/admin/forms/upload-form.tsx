"use client";

import { useActionState } from "react";
import { uploadTemplate, type AdminFormState } from "./actions";

export function UploadForm() {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    uploadTemplate,
    { status: "idle" },
  );

  return (
    <form action={action} className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Naya form add karo</h2>

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Title
        <input
          name="title"
          required
          minLength={3}
          maxLength={120}
          placeholder="e.g. SBI Mobile Number Change"
          className="rounded border border-slate-300 px-3 py-2 font-normal"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Description
        <input
          name="description"
          maxLength={300}
          placeholder="Ye form kis kaam ka hai"
          className="rounded border border-slate-300 px-3 py-2 font-normal"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Fillable PDF (max 4 MB)
        <input
          name="file"
          type="file"
          accept="application/pdf"
          required
          className="text-sm font-normal"
        />
      </label>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? "Uploading..." : "Upload"}
        </button>
        {state.message && (
          <p role="status" className="text-sm text-red-600">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
