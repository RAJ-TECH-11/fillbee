"use client";

import { useActionState } from "react";
import { PROFILE_FIELDS } from "@/lib/profile-fields";
import { saveMissingFields, type MissingState } from "./actions";

// Form ke jo fields profile mein khali hain, unhe yahin bharo.
export function MissingForm({ formId, keys }: { formId: string; keys: string[] }) {
  const [state, action, pending] = useActionState<MissingState, FormData>(
    saveMissingFields.bind(null, formId),
    { status: "idle" },
  );
  const fields = PROFILE_FIELDS.filter((f) => keys.includes(f.key));

  return (
    <form action={action} className="flex flex-col gap-4 rounded-xl bg-amber-50 p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Ye details profile mein khali hain</h2>
        <p className="text-sm text-slate-600">
          Yahan bharo, profile mein save ho jayengi aur form mein bhi aa jayengi. Jo nahi pata, khali chhod do.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const error = state.fieldErrors?.[field.key];
          const common = {
            id: `missing-${field.key}`,
            name: field.key,
            defaultValue: state.values?.[field.key] ?? "",
            "aria-invalid": error ? true : undefined,
            className: `rounded border bg-white px-3 py-2 font-normal ${error ? "border-red-500" : "border-slate-300"}`,
          };
          return (
            <label key={field.key} htmlFor={common.id} className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              <span>
                {field.label} <span className="font-normal text-slate-400">({field.labelHi})</span>
              </span>
              {field.type === "select" ? (
                <select {...common}>
                  <option value="">Select</option>
                  {field.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  {...common}
                  type={field.type === "number" ? "text" : field.type}
                  inputMode={field.type === "number" ? "numeric" : undefined}
                />
              )}
              {error && <span className="text-xs text-red-600">{error}</span>}
            </label>
          );
        })}
      </div>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save aur form update karo"}
        </button>
        {state.message && (
          <p role="status" className={state.status === "error" ? "text-sm text-red-600" : "text-sm text-green-700"}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
