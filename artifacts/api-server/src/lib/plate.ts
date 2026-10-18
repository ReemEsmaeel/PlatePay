const plateCharacterMap: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "ا": "A", "أ": "A", "إ": "A", "آ": "A", "ب": "B", "ت": "T",
  "ث": "TH", "ج": "J", "ح": "H", "خ": "KH", "د": "D", "ذ": "DH",
  "ر": "R", "ز": "Z", "س": "S", "ش": "SH", "ص": "SS", "ض": "DAD",
  "ط": "T", "ظ": "THZ", "ع": "AA", "غ": "GH", "ف": "F", "ق": "Q",
  "ك": "K", "ل": "L", "م": "M", "ن": "N", "ه": "H", "ة": "H",
  "و": "W", "ي": "Y", "ى": "Y",
};

export function normalizePlate(value: string) {
  return Array.from(value.trim().toUpperCase())
    .map((character) => plateCharacterMap[character] ?? character)
    .join("")
    .replace(/[\s\p{P}\p{S}\u200E\u200F\u202A-\u202E]/gu, "");
}
