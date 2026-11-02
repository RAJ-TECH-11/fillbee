// @pdf-lib/fontkit ka Hindi (Indic) shaping code `regeneratorRuntime` maangta hai,
// jo package ke saath nahi aata. Ise fontkit se pehle load karna zaroori hai.
import "regenerator-runtime/runtime.js";
import fontkit from "@pdf-lib/fontkit";
import { readFileSync } from "node:fs";
import path from "node:path";

export { fontkit };

// Noto Sans Devanagari (SIL Open Font License, assets/fonts/OFL.txt).
// Isme Hindi ke saath English letters, numbers aur ₹ bhi hain.
const FONT_PATH = path.join(process.cwd(), "assets", "fonts", "NotoSansDevanagari-Regular.ttf");

let cachedBytes: Uint8Array | null = null;
let cachedFont: ReturnType<typeof fontkit.create> | null = null;

export function unicodeFontBytes(): Uint8Array {
  cachedBytes ??= new Uint8Array(readFileSync(FONT_PATH));
  return cachedBytes;
}

// Kya PDF ki default font (Helvetica) ye text likh sakti hai? (English/Latin)
export function isLatin1(text: string): boolean {
  return /^[\x20-\x7e -ÿ]*$/.test(text);
}

// Kya Hindi font mein is text ke saare akshar hain?
// (Tamil, Bengali, emoji jaise akshar abhi support nahi.)
export function unicodeFontSupports(text: string): boolean {
  cachedFont ??= fontkit.create(Buffer.from(unicodeFontBytes()));
  for (const char of text) {
    const cp = char.codePointAt(0)!;
    if (cp === 0x200c || cp === 0x200d) continue; // zero-width joiners
    if (!cachedFont.hasGlyphForCodePoint(cp)) return false;
  }
  return true;
}
