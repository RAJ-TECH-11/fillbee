// Profile ke saare fields ek jagah.
// Yahi list profile form banati hai, server par validation karti hai,
// aur aage (Step 5-8) form templates ke boxes ko profile se match karegi.
// `aliases` woh shabd hain jo forms par is field ke liye likhe hote hain.

export type FieldType = "text" | "date" | "tel" | "email" | "select" | "number";

export type ProfileField = {
  key: string;
  label: string;
  labelHi: string;
  section: SectionKey;
  type: FieldType;
  options?: string[];
  pattern?: RegExp;
  patternHint?: string;
  aliases: string[];
};

export const SECTIONS = {
  personal: "Personal details",
  family: "Family",
  address: "Address",
  education: "Education",
} as const;

export type SectionKey = keyof typeof SECTIONS;

export const PROFILE_FIELDS: ProfileField[] = [
  // Personal
  { key: "full_name", label: "Full name", labelHi: "पूरा नाम", section: "personal", type: "text", aliases: ["name", "applicant name", "name of applicant", "candidate name", "नाम"] },
  { key: "dob", label: "Date of birth", labelHi: "जन्म तिथि", section: "personal", type: "date", aliases: ["dob", "date of birth", "birth date", "जन्म तिथि"] },
  { key: "gender", label: "Gender", labelHi: "लिंग", section: "personal", type: "select", options: ["Male", "Female", "Other"], aliases: ["gender", "sex", "लिंग"] },
  { key: "phone", label: "Mobile number", labelHi: "मोबाइल नंबर", section: "personal", type: "tel", pattern: /^[6-9]\d{9}$/, patternHint: "10 digit mobile number", aliases: ["mobile", "mobile no", "phone", "contact number", "मोबाइल"] },
  { key: "email", label: "Email", labelHi: "ईमेल", section: "personal", type: "email", pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternHint: "valid email", aliases: ["email", "e-mail", "email id", "ईमेल"] },

  // Family
  { key: "father_name", label: "Father's name", labelHi: "पिता का नाम", section: "family", type: "text", aliases: ["father's name", "father name", "s/o", "son of", "पिता का नाम"] },
  { key: "mother_name", label: "Mother's name", labelHi: "माता का नाम", section: "family", type: "text", aliases: ["mother's name", "mother name", "माता का नाम"] },
  { key: "guardian_name", label: "Guardian's name", labelHi: "अभिभावक का नाम", section: "family", type: "text", aliases: ["guardian", "guardian name", "अभिभावक"] },

  // Address
  { key: "address_line", label: "Address (house, street, area)", labelHi: "पता", section: "address", type: "text", aliases: ["address", "residential address", "permanent address", "पता"] },
  { key: "city", label: "City / Village", labelHi: "शहर / गाँव", section: "address", type: "text", aliases: ["city", "village", "town", "शहर", "गाँव"] },
  { key: "district", label: "District", labelHi: "ज़िला", section: "address", type: "text", aliases: ["district", "ज़िला", "जिला"] },
  { key: "state", label: "State", labelHi: "राज्य", section: "address", type: "text", aliases: ["state", "राज्य"] },
  { key: "pincode", label: "PIN code", labelHi: "पिन कोड", section: "address", type: "text", pattern: /^\d{6}$/, patternHint: "6 digit PIN code", aliases: ["pin", "pincode", "pin code", "postal code", "पिन कोड"] },

  // Education
  { key: "tenth_board", label: "10th board", labelHi: "10वीं बोर्ड", section: "education", type: "text", aliases: ["10th board", "matriculation board", "ssc board"] },
  { key: "tenth_year", label: "10th passing year", labelHi: "10वीं उत्तीर्ण वर्ष", section: "education", type: "number", pattern: /^(19|20)\d{2}$/, patternHint: "year like 2020", aliases: ["10th year", "year of passing 10th"] },
  { key: "tenth_percent", label: "10th percentage", labelHi: "10वीं प्रतिशत", section: "education", type: "text", pattern: /^\d{1,3}(\.\d{1,2})?$/, patternHint: "number like 85.4", aliases: ["10th percentage", "10th marks"] },
  { key: "twelfth_board", label: "12th board", labelHi: "12वीं बोर्ड", section: "education", type: "text", aliases: ["12th board", "intermediate board", "hsc board"] },
  { key: "twelfth_year", label: "12th passing year", labelHi: "12वीं उत्तीर्ण वर्ष", section: "education", type: "number", pattern: /^(19|20)\d{2}$/, patternHint: "year like 2022", aliases: ["12th year", "year of passing 12th"] },
  { key: "twelfth_percent", label: "12th percentage", labelHi: "12वीं प्रतिशत", section: "education", type: "text", pattern: /^\d{1,3}(\.\d{1,2})?$/, patternHint: "number like 78.2", aliases: ["12th percentage", "12th marks"] },
  { key: "college_name", label: "College / University", labelHi: "कॉलेज / विश्वविद्यालय", section: "education", type: "text", aliases: ["college", "institute", "university", "कॉलेज"] },
  { key: "course", label: "Course (e.g. B.Tech CSE)", labelHi: "पाठ्यक्रम", section: "education", type: "text", aliases: ["course", "programme", "branch", "पाठ्यक्रम"] },
  { key: "enrollment_no", label: "Enrollment / Roll number", labelHi: "नामांकन संख्या", section: "education", type: "text", aliases: ["enrollment no", "roll no", "registration no", "नामांकन"] },
];

export type ProfileData = Record<string, string>;

// Photo aur signature: ye text nahi, image hain. Sirf boxes mein lagti hain.
// Profile data mein inka storage path "__photo" / "__signature" key par rehta hai.
export const IMAGE_FIELDS = [
  { key: "photo", label: "Photo", labelHi: "फ़ोटो" },
  { key: "signature", label: "Signature", labelHi: "हस्ताक्षर" },
] as const;

export type ImageKey = (typeof IMAGE_FIELDS)[number]["key"];
export const IMAGE_KEYS = new Set<string>(IMAGE_FIELDS.map((f) => f.key));
export const imagePathKey = (key: ImageKey) => `__${key}`;
