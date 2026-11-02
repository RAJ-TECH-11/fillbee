"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { IMAGE_FIELDS, PROFILE_FIELDS, SECTIONS, type SectionKey } from "@/lib/profile-fields";

// Ye type fill-pdf.ts ke Box jaisa hi hai (client file server code import nahi karti).
export type Box = {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  key: string;
};

type PageSize = { width: number; height: number };
type Draft = { page: number; startX: number; startY: number; x: number; y: number };

const SECTION_KEYS = Object.keys(SECTIONS) as SectionKey[];
const LABELS: Record<string, string> = Object.fromEntries(
  [...PROFILE_FIELDS, ...IMAGE_FIELDS].map((f) => [f.key, f.label]),
);
const MIN_BOX_PX = 8;

// Screen par PDF page dikhane ke liye kitna chauda (pixels).
function useDisplayWidth() {
  const [width, setWidth] = useState(700);
  useEffect(() => {
    const update = () => setWidth(Math.min(700, window.innerWidth - 64));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return width;
}

export function BoxEditor({
  pdfUrl,
  pageSizes,
  initialBoxes,
}: {
  pdfUrl: string;
  pageSizes: PageSize[];
  initialBoxes: Box[];
}) {
  const [boxes, setBoxes] = useState<Box[]>(initialBoxes);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  // Tez drag mein state update hone se pehle pointerup aa sakta hai,
  // isliye chalu draft ref mein bhi rakhte hain aur aakhri point event se lete hain.
  const draftRef = useRef<Draft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const displayWidth = useDisplayWidth();

  // pdf.js se har page ko canvas par draw karo.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const doc = await pdfjs.getDocument({ url: pdfUrl }).promise;
        for (let i = 0; i < doc.numPages && !cancelled; i++) {
          const page = await doc.getPage(i + 1);
          const canvas = canvases.current[i];
          if (!canvas) continue;
          const cssScale = displayWidth / page.getViewport({ scale: 1 }).width;
          const ratio = window.devicePixelRatio || 1;
          const viewport = page.getViewport({ scale: cssScale * ratio });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvas, viewport }).promise;
        }
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfUrl, displayWidth]);

  // Mouse/touch se box kheenchna. Screen pixels -> PDF points.
  function pointerPos(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    return { x, y };
  }

  function onPointerDown(page: number, e: PointerEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return; // box par click = select, draw nahi
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointerPos(e);
    const next = { page, startX: p.x, startY: p.y, x: p.x, y: p.y };
    draftRef.current = next;
    setDraft(next);
    setSelected(null);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!draftRef.current) return;
    const next = { ...draftRef.current, ...pointerPos(e) };
    draftRef.current = next;
    setDraft(next);
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const start = draftRef.current;
    if (!start) return;
    draftRef.current = null;
    setDraft(null);

    const end = pointerPos(e);
    const left = Math.min(start.startX, end.x);
    const top = Math.min(start.startY, end.y);
    const width = Math.abs(end.x - start.startX);
    const height = Math.abs(end.y - start.startY);
    if (width < MIN_BOX_PX || height < MIN_BOX_PX) return;

    const size = pageSizes[start.page];
    const scale = displayWidth / size.width;
    const round = (n: number) => Math.round(n * 100) / 100;
    const box: Box = {
      id: crypto.randomUUID().slice(0, 8),
      page: start.page,
      x: round(left / scale),
      y: round(size.height - (top + height) / scale),
      width: round(width / scale),
      height: round(height / scale),
      key: "",
    };
    setBoxes((all) => [...all, box]);
    setSelected(box.id);
  }

  const updateKey = (id: string, key: string) =>
    setBoxes((all) => all.map((b) => (b.id === id ? { ...b, key } : b)));
  const remove = (id: string) => setBoxes((all) => all.filter((b) => b.id !== id));

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm">
      <input type="hidden" name="boxes" value={JSON.stringify(boxes)} />
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Boxes (scanned forms ke liye)</h2>
        <p className="text-sm text-slate-600">
          Page par mouse se kheench kar box banao, phir neeche list mein chuno ki usme kya likhna hai.
          Text ke liye box khali line ke theek upar banao. Photo/signature ke liye unki khali jagah par.
        </p>
      </div>

      {loadError && <p className="rounded bg-red-50 p-3 text-sm text-red-700">PDF load nahi hui: {loadError}</p>}

      {pageSizes.map((size, pageIndex) => {
        const scale = displayWidth / size.width;
        const height = size.height * scale;
        return (
          <div key={pageIndex} className="flex flex-col gap-1">
            <p className="text-xs font-medium text-slate-500">Page {pageIndex + 1}</p>
            <div className="relative border border-slate-300" style={{ width: displayWidth, height }}>
              <canvas
                ref={(el) => {
                  canvases.current[pageIndex] = el;
                }}
                className="absolute inset-0"
                style={{ width: displayWidth, height }}
              />
              <div
                data-page={pageIndex}
                className="absolute inset-0 cursor-crosshair touch-none"
                onPointerDown={(e) => onPointerDown(pageIndex, e)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              >
                {boxes
                  .filter((b) => b.page === pageIndex)
                  .map((b) => (
                    <button
                      type="button"
                      key={b.id}
                      onClick={() => setSelected(b.id)}
                      className={`absolute overflow-hidden border-2 text-left text-[10px] leading-tight ${
                        selected === b.id
                          ? "border-indigo-600 bg-indigo-200/40"
                          : b.key
                            ? "border-emerald-600 bg-emerald-200/30"
                            : "border-red-500 bg-red-200/30"
                      }`}
                      style={{
                        left: b.x * scale,
                        top: (size.height - b.y - b.height) * scale,
                        width: b.width * scale,
                        height: b.height * scale,
                      }}
                    >
                      <span className="px-0.5 text-slate-800">{b.key ? LABELS[b.key] : "?"}</span>
                    </button>
                  ))}
                {draft?.page === pageIndex && (
                  <div
                    className="pointer-events-none absolute border-2 border-dashed border-indigo-600 bg-indigo-200/30"
                    style={{
                      left: Math.min(draft.startX, draft.x),
                      top: Math.min(draft.startY, draft.y),
                      width: Math.abs(draft.x - draft.startX),
                      height: Math.abs(draft.y - draft.startY),
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}

      {boxes.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {boxes.map((b, i) => (
            <li
              key={b.id}
              className={`flex flex-wrap items-center justify-between gap-3 py-2 ${selected === b.id ? "bg-indigo-50" : ""}`}
            >
              <button type="button" onClick={() => setSelected(b.id)} className="text-sm font-medium text-slate-800">
                Box {i + 1} · page {b.page + 1}
              </button>
              <div className="flex items-center gap-2">
                <select
                  value={b.key}
                  onChange={(e) => updateKey(b.id, e.target.value)}
                  aria-label={`Profile field for box ${i + 1}`}
                  className={`rounded border px-2 py-1.5 text-sm ${b.key ? "border-slate-300" : "border-red-500"}`}
                >
                  <option value="">Field chuno</option>
                  <optgroup label="Photo / Signature">
                    {IMAGE_FIELDS.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </optgroup>
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
                <button
                  type="button"
                  onClick={() => remove(b.id)}
                  className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
