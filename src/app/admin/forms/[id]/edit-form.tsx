"use client";

import { useActionState } from "react";
import { PROFILE_FIELDS, SECTIONS, type SectionKey } from "@/lib/profile-fields";
import { saveTemplate, type AdminFormState } from "../actions";
import { BoxEditor, type Box } from "./box-editor";

type PdfField = { name: string; kind: string; autoKey: string | null };

type Props = {
  id: string;
  title: string;
  description: string;
  isPublished: boolean;
  fieldMap: Record<string, string | null>;
  boxes: Box[];
  fields: PdfField[];
  pdfUrl: string;
  pageSizes: { width: number; height: number }[];
};

const SECTION_KEYS = Object.keys(SECTIONS) as SectionKey[];

export function EditForm({ id, title, description, isPublished, fieldMap, boxes, fields, pdfUrl, pageSizes }: Props) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    saveTemplate.bind(null, id),
    { status: "idle" },
  );

  // Save ke baad wahi values dikhao jo abhi save hui hain.
  // React <select> ki defaultValue sirf pehli baar lagti hai, isliye har save par
  // `key` badal kar form naye sire se banate hain.
  const v = state.values ?? { title, description, isPublished, fieldMap, boxes };

  return (
    <form key={state.version ?? 0} action={action} className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Title
          <input
            name="title"
            defaultValue={v.title}
            required
            minLength={3}
            maxLength={120}
            className="rounded border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Description
          <input
            name="description"
            defaultValue={v.description}
            maxLength={300}
            className="rounded border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" name="is_published" defaultChecked={v.isPublished} className="h-4 w-4" />
          Published (users ko dikhega)
        </label>
      </section>

      {fields.length === 0 && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Is PDF mein fillable fields nahi hain (jaise scanned form). Neeche page par boxes banao.
        </p>
      )}

      {fields.length > 0 && (
      <section className="flex flex-col gap-2 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Field mapping</h2>
        <p className="text-sm text-slate-600">
          Har PDF field ke liye chuno ki profile ki kaunsi detail usme bharni hai.
        </p>
        <ul className="divide-y divide-slate-100">
          {fields.map((field) => {
            const current = Object.hasOwn(v.fieldMap, field.name)
              ? v.fieldMap[field.name]
              : field.autoKey;
            return (
              <li key={field.name} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{field.name}</p>
                  <p className="text-xs text-slate-400">
                    {field.kind}
                    {field.autoKey && " · auto-match mila"}
                  </p>
                </div>
                <select
                  name={`map:${field.name}`}
                  defaultValue={current ?? ""}
                  aria-label={`Profile field for ${field.name}`}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Mat bharo</option>
                  {SECTION_KEYS.map((section) => (
                    <optgroup key={section} label={SECTIONS[section]}>
                      {PROFILE_FIELDS.filter((f) => f.section === section).map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      </section>
      )}

      <BoxEditor pdfUrl={pdfUrl} pageSizes={pageSizes} initialBoxes={v.boxes} />

      <div className="sticky bottom-0 flex items-center gap-4 bg-slate-50/90 py-4 backdrop-blur">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save"}
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
