"use client";

import { useActionState } from "react";
import { IMAGE_FIELDS, type ImageKey } from "@/lib/profile-fields";
import { removeProfileImage, uploadProfileImage, type ImageState } from "./actions";

const HINTS: Record<ImageKey, string> = {
  photo: "Passport size photo, saaf background. PNG ya JPG, max 1 MB.",
  signature: "Safed kaagaz par sign karke photo lo, ya transparent PNG. Max 1 MB.",
};

export function ImageUploads({ urls }: { urls: Partial<Record<ImageKey, string>> }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Photo aur signature</h2>
        <p className="text-sm text-slate-600">Jin forms mein photo ya signature ki jagah hai, wahan ye apne aap lagenge.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {IMAGE_FIELDS.map((f) => (
          <ImageCard key={f.key} imageKey={f.key} label={`${f.label} (${f.labelHi})`} url={urls[f.key]} />
        ))}
      </div>
    </section>
  );
}

function ImageCard({ imageKey, label, url }: { imageKey: ImageKey; label: string; url?: string }) {
  const [uploadState, upload, uploading] = useActionState<ImageState, FormData>(
    uploadProfileImage.bind(null, imageKey),
    { status: "idle" },
  );
  const [removeState, remove, removing] = useActionState<ImageState, FormData>(
    async () => removeProfileImage(imageKey),
    { status: "idle" },
  );
  const latest = (removeState.version ?? 0) > (uploadState.version ?? 0) ? removeState : uploadState;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="flex h-36 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50">
        {url ? (
          // Signed URL har baar alag hota hai, isliye next/image ki zaroorat nahi.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="max-h-32 max-w-full object-contain" />
        ) : (
          <span className="text-xs text-slate-400">Abhi upload nahi hui</span>
        )}
      </div>
      <p className="text-xs text-slate-500">{HINTS[imageKey]}</p>

      <form action={upload} className="flex flex-wrap items-center gap-2">
        <input
          name="file"
          type="file"
          accept="image/png,image/jpeg"
          required
          aria-label={`${label} file`}
          className="max-w-full text-xs"
        />
        <button
          type="submit"
          disabled={uploading}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {uploading ? "Uploading..." : url ? "Badlo" : "Upload"}
        </button>
      </form>

      {url && (
        <form action={remove}>
          <button
            type="submit"
            disabled={removing}
            className="rounded border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            {removing ? "Hata rahe hain..." : "Hatao"}
          </button>
        </form>
      )}

      {latest.message && (
        <p role="status" className={latest.status === "error" ? "text-xs text-red-600" : "text-xs text-green-700"}>
          {latest.message}
        </p>
      )}
    </div>
  );
}
