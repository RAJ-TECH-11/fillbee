"use client";

import { useActionState } from "react";
import {
  PROFILE_FIELDS,
  SECTIONS,
  type ProfileData,
  type SectionKey,
} from "@/lib/profile-fields";
import { saveProfile, type SaveState } from "./actions";

// Client component: kyunki isme state hai (saving..., errors).
// useActionState server action ka result yahan wapas laata hai.
export function ProfileForm({ initial }: { initial: ProfileData }) {
  const [state, formAction, pending] = useActionState<SaveState, FormData>(
    saveProfile,
    { status: "idle" },
  );

  // Save ya error ke baad bhi user ki bhari values dikhti rahein.
  const values = state.values ?? initial;
  const sectionKeys = Object.keys(SECTIONS) as SectionKey[];

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {sectionKeys.map((section) => (
        <fieldset key={section} className="rounded-xl bg-white p-6 shadow-sm">
          <legend className="px-1 text-lg font-semibold text-slate-900">
            {SECTIONS[section]}
          </legend>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            {PROFILE_FIELDS.filter((f) => f.section === section).map((field) => {
              const error = state.fieldErrors?.[field.key];
              const common = {
                id: field.key,
                name: field.key,
                defaultValue: values[field.key] ?? "",
                "aria-invalid": error ? true : undefined,
                className: `rounded border px-3 py-2 font-normal ${error ? "border-red-500" : "border-slate-300"}`,
              };

              return (
                <label
                  key={field.key}
                  htmlFor={field.key}
                  className="flex flex-col gap-1 text-sm font-medium text-slate-700"
                >
                  <span>
                    {field.label}{" "}
                    <span className="font-normal text-slate-400">
                      ({field.labelHi})
                    </span>
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
        </fieldset>
      ))}

      <div className="sticky bottom-0 flex items-center gap-4 bg-slate-50/90 py-4 backdrop-blur">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save profile"}
        </button>
        {state.message && (
          <p
            role="status"
            className={state.status === "error" ? "text-sm text-red-600" : "text-sm text-green-700"}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
