import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFName,
  PDFRadioGroup,
  PDFRef,
  PDFTextField,
  StandardFonts,
  type PDFField,
  type PDFFont,
} from "pdf-lib";
import {
  IMAGE_KEYS,
  PROFILE_FIELDS,
  imagePathKey,
  type ImageKey,
  type ProfileData,
} from "@/lib/profile-fields";
import { fontkit, isLatin1, unicodeFontBytes, unicodeFontSupports } from "./fonts";
import { matchFieldToProfileKey } from "./match-field";

// PDF field ka naam -> profile key, ya null (mat bharo).
// Jo field map mein nahi hai, uska naam se apne aap match dhoondha jata hai.
export type FieldMap = Record<string, string | null>;

// Scanned/bina-fields wale PDF par admin ka banaya box.
// page 0 se shuru; x, y, width, height PDF points mein, neeche-baayein kone se.
export type Box = {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  key: string;
};

// User ki photo/signature (box mein lagane ke liye).
export type ProfileImages = Partial<
  Record<ImageKey, { bytes: Uint8Array; mime: "image/png" | "image/jpeg" }>
>;

type FillOptions = {
  images?: ProfileImages;
  // true: bhara hua text PDF ka pakka hissa ban jaata hai (fields edit nahi ho sakte).
  flatten?: boolean;
};

export type FieldReport = {
  field: string; // PDF ke andar field ka naam
  key: string | null; // profile ka key jisse juda hai
  status: "filled" | "empty" | "unmatched" | "skipped" | "unsupported";
  note?: string;
};

const DATE_KEYS = new Set(
  PROFILE_FIELDS.filter((f) => f.type === "date").map((f) => f.key),
);
const PROFILE_KEYS = new Set(PROFILE_FIELDS.map((f) => f.key));

// Profile mein date "2004-05-17" hoti hai, Indian forms "17/05/2004" maangte hain.
function formatValue(key: string, value: string): string {
  if (DATE_KEYS.has(key)) {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  return value;
}

function fieldKind(field: PDFField) {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFDropdown) return "dropdown";
  if (field instanceof PDFRadioGroup) return "radio";
  if (field instanceof PDFCheckBox) return "checkbox";
  return "other";
}

// Saved map pehle, warna naam se auto-match.
function resolveKey(name: string, fieldMap: FieldMap = {}): string | null {
  if (Object.hasOwn(fieldMap, name)) {
    const key = fieldMap[name];
    return key && PROFILE_KEYS.has(key) ? key : null;
  }
  return matchFieldToProfileKey(name);
}

async function loadPdf(pdfBytes: Uint8Array) {
  try {
    return await PDFDocument.load(pdfBytes);
  } catch {
    throw new Error("PDF khul nahi rahi (kharab ya password-protected file).");
  }
}

// Har page ka size (points mein). Box editor aur box validation ke liye.
export async function getPdfPageSizes(pdfBytes: Uint8Array) {
  const doc = await loadPdf(pdfBytes);
  return doc.getPages().map((p) => p.getSize());
}

// Box mein text: jitna bada ho sake utna, lekin box se bahar na jaaye.
function fitFontSize(font: PDFFont, text: string, box: Box) {
  let size = Math.min(12, box.height * 0.7);
  while (size > 6 && font.widthOfTextAtSize(text, size) > box.width - 4) {
    size -= 0.5;
  }
  return size;
}

// Admin ke liye: PDF ke saare fields, unka type aur auto-match.
export async function listPdfFields(pdfBytes: Uint8Array) {
  const doc = await loadPdf(pdfBytes);
  return doc.getForm().getFields().map((field) => ({
    name: field.getName(),
    kind: fieldKind(field),
    autoKey: matchFieldToProfileKey(field.getName()),
  }));
}

// Bina bhare report: kaunsa field kis profile key se juda aur bharega ya nahi.
export async function inspectPdf(
  pdfBytes: Uint8Array,
  profile: ProfileData = {},
  fieldMap: FieldMap = {},
  boxes: Box[] = [],
) {
  return (await fillPdfInternal(pdfBytes, profile, fieldMap, boxes, {}, false)).reports;
}

export async function fillPdf(
  pdfBytes: Uint8Array,
  profile: ProfileData,
  fieldMap: FieldMap = {},
  boxes: Box[] = [],
  options: FillOptions = {},
) {
  const { reports, bytes } = await fillPdfInternal(pdfBytes, profile, fieldMap, boxes, options, true);
  return { reports, bytes: bytes! };
}

// Image ko box ke andar fit karo, shape (aspect ratio) bigade bina, beech mein.
function fitImage(imgW: number, imgH: number, box: Box) {
  const scale = Math.min(box.width / imgW, box.height / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  return {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height,
  };
}

async function fillPdfInternal(
  pdfBytes: Uint8Array,
  profile: ProfileData,
  fieldMap: FieldMap,
  boxes: Box[],
  options: FillOptions,
  write: boolean,
) {
  const doc = await loadPdf(pdfBytes);
  const form = doc.getForm();
  const reports: FieldReport[] = [];

  // Fonts zaroorat padne par hi load karo.
  // English ke liye PDF ki apni Helvetica, Hindi ke liye Noto Sans Devanagari.
  let latinFont: PDFFont | null = null;
  let unicodeFont: PDFFont | null = null;
  async function fontFor(text: string) {
    if (isLatin1(text)) {
      latinFont ??= await doc.embedFont(StandardFonts.Helvetica);
      return latinFont;
    }
    if (!unicodeFont) {
      doc.registerFontkit(fontkit);
      unicodeFont = await doc.embedFont(unicodeFontBytes(), { subset: true });
    }
    return unicodeFont;
  }

  // null = likh sakte hain, warna wajah.
  function cannotWrite(text: string) {
    if (isLatin1(text) || unicodeFontSupports(text)) return null;
    return "is bhasha ke akshar abhi support nahi (sirf English aur Hindi)";
  }

  for (const field of form.getFields()) {
    const name = field.getName();
    const key = resolveKey(name, fieldMap);

    if (!key) {
      const skipped = Object.hasOwn(fieldMap, name) && fieldMap[name] === null;
      reports.push({ field: name, key: null, status: skipped ? "skipped" : "unmatched" });
      continue;
    }

    const raw = profile[key]?.trim();
    if (!raw) {
      reports.push({ field: name, key, status: "empty" });
      continue;
    }

    const value = formatValue(key, raw);
    const problem = cannotWrite(value);
    if (problem) {
      reports.push({ field: name, key, status: "unsupported", note: problem });
      continue;
    }

    if (field instanceof PDFTextField) {
      if (write) {
        field.setText(value);
        // Hindi ho to field ka dikhne wala hissa Hindi font se banao.
        if (!isLatin1(value)) field.updateAppearances(await fontFor(value));
      }
      reports.push({ field: name, key, status: "filled" });
    } else if (field instanceof PDFDropdown || field instanceof PDFRadioGroup) {
      const option = field
        .getOptions()
        .find((o) => o.toLowerCase() === value.toLowerCase());
      if (!option) {
        reports.push({ field: name, key, status: "unsupported", note: `"${value}" option nahi mila` });
        continue;
      }
      if (write) {
        field.select(option);
        if (field instanceof PDFDropdown && !isLatin1(option)) {
          field.updateAppearances(await fontFor(option));
        }
      }
      reports.push({ field: name, key, status: "filled" });
    } else {
      const kind = field instanceof PDFCheckBox ? "Checkbox" : "Is type ka field";
      reports.push({ field: name, key, status: "unsupported", note: `${kind} abhi support nahi` });
    }
  }

  // Boxes: page par seedha text likhna (scanned forms ke liye).
  const pages = doc.getPages();
  for (const [i, box] of boxes.entries()) {
    const name = `Box ${i + 1} (page ${box.page + 1})`;
    const page = pages[box.page];
    if (!page || !(PROFILE_KEYS.has(box.key) || IMAGE_KEYS.has(box.key))) {
      reports.push({ field: name, key: null, status: "unsupported", note: "galat box" });
      continue;
    }

    // Photo / signature box
    if (IMAGE_KEYS.has(box.key)) {
      const key = box.key as ImageKey;
      if (!profile[imagePathKey(key)]) {
        reports.push({ field: name, key, status: "empty" });
        continue;
      }
      if (write) {
        const img = options.images?.[key];
        if (!img) {
          reports.push({ field: name, key, status: "unsupported", note: "image load nahi hui" });
          continue;
        }
        try {
          const embedded =
            img.mime === "image/png" ? await doc.embedPng(img.bytes) : await doc.embedJpg(img.bytes);
          page.drawImage(embedded, fitImage(embedded.width, embedded.height, box));
        } catch {
          reports.push({ field: name, key, status: "unsupported", note: "image kharab hai" });
          continue;
        }
      }
      reports.push({ field: name, key, status: "filled" });
      continue;
    }

    const raw = profile[box.key]?.trim();
    if (!raw) {
      reports.push({ field: name, key: box.key, status: "empty" });
      continue;
    }

    const value = formatValue(box.key, raw);
    const problem = cannotWrite(value);
    if (problem) {
      reports.push({ field: name, key: box.key, status: "unsupported", note: problem });
      continue;
    }

    const font = await fontFor(value);
    const size = fitFontSize(font, value, box);
    const tooLong = font.widthOfTextAtSize(value, size) > box.width - 4;
    if (write) {
      page.drawText(value, {
        x: box.x + 2,
        y: box.y + (box.height - size) / 2 + size * 0.2,
        size,
        font,
      });
    }
    reports.push({
      field: name,
      key: box.key,
      status: "filled",
      ...(tooLong && { note: "text box se lamba hai, box bada karo" }),
    });
  }

  if (!write) return { reports, bytes: undefined };

  if (!options.flatten) return { reports, bytes: await doc.save() };

  // Flatten: fields hata kar unka dikhne wala text page ka hissa bana do.
  form.flatten();
  // pdf-lib field objects hata deta hai, lekin page ki "Annots" list mein unke
  // references chhod deta hai. Tute references kuch PDF readers mein error dete hain.
  for (const page of doc.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    const alive = annots
      .asArray()
      .filter((item) => !(item instanceof PDFRef) || doc.context.lookup(item) !== undefined);
    if (alive.length === 0) page.node.delete(PDFName.of("Annots"));
    else page.node.set(PDFName.of("Annots"), doc.context.obj(alive));
  }
  return { reports, bytes: await doc.save() };
}
