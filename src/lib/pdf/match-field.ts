import { PROFILE_FIELDS } from "@/lib/profile-fields";

// Naam ko ek jaisa banao taaki "Father's Name", "FATHER NAME" aur "father_name"
// teeno ek hi cheez maane jaayein. Hindi (Devanagari) letters bhi bache rehte hain.
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9ऀ-ॿ]+/g, " ")
    .trim();
}

// Har normalized naam -> profile key. Ek baar banake rakh lete hain.
const LOOKUP = new Map<string, string>();
for (const field of PROFILE_FIELDS) {
  for (const name of [field.key, field.label, field.labelHi, ...field.aliases]) {
    const n = normalize(name);
    if (n && !LOOKUP.has(n)) LOOKUP.set(n, field.key);
  }
}

// PDF field ka naam -> profile key (ya null agar pehchana nahi).
export function matchFieldToProfileKey(fieldName: string): string | null {
  return LOOKUP.get(normalize(fieldName)) ?? null;
}
