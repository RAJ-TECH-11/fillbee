import { z } from "zod";
import { PROFILE_FIELDS, type ProfileField } from "./profile-fields";

const MAX_FIELD_LENGTH = 200;

// Ek field ka rule: text trim karo, khali chalega,
// warna length, pattern aur options check karo.
function fieldSchema(field: ProfileField) {
  return z
    .string()
    .trim()
    .max(MAX_FIELD_LENGTH, `Maximum ${MAX_FIELD_LENGTH} characters`)
    .refine((v) => v === "" || !field.pattern || field.pattern.test(v), {
      message: `Enter a ${field.patternHint}`,
    })
    .refine((v) => v === "" || !field.options || field.options.includes(v), {
      message: "Choose one of the options",
    });
}

// Poora profile schema fields ki list se apne aap banta hai.
// Naya field list mein jodo, validation khud aa jayegi.
export const profileSchema = z.object(
  Object.fromEntries(PROFILE_FIELDS.map((f) => [f.key, fieldSchema(f)])),
);

// FormData ko schema ke liye plain object mein badlo.
// Jo field nahi aaya ya file hai, use khali string maan lo.
export function formDataToProfileInput(formData: FormData) {
  return Object.fromEntries(
    PROFILE_FIELDS.map((f) => {
      const raw = formData.get(f.key);
      return [f.key, typeof raw === "string" ? raw : ""];
    }),
  ) as Record<string, string>;
}

// Sirf kuch fields ka schema (form page par sirf khali fields bharne ke liye).
export function partialProfileSchema(keys: string[]) {
  return z.object(
    Object.fromEntries(
      PROFILE_FIELDS.filter((f) => keys.includes(f.key)).map((f) => [f.key, fieldSchema(f)]),
    ),
  );
}
