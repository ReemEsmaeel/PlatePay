const plateCharacterMap: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

export function normalizePlate(value: string) {
  // Only equivalent numerals and separators are normalized. Do not guess
  // Arabic-to-Latin letter mappings, which could identify a different vehicle.
  return Array.from(value.normalize("NFKC").trim().toUpperCase())
    .map((character) => plateCharacterMap[character] ?? character)
    .join("")
    .replace(/[\s\p{P}\p{S}\u200E\u200F\u202A-\u202E]/gu, "");
}

// A demo vehicle cannot collide with, or receive payments from, a real account.
export function plateForScenario(value: string, scenario?: string | null) {
  const normalized = normalizePlate(value);
  return scenario && normalized.length >= 2 ? `DEMO:${scenario}:${normalized}` : normalized;
}
