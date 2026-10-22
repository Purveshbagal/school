/**
 * Converts common academic-year spellings to the same key.
 * Examples: `2026-27`, `2026 – 27`, and `2026/2027` all become `2026-27`.
 */
export function academicYearKey(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  const match = text.match(/(\d{4})\D+(\d{2}|\d{4})/);
  if (!match) return text.toLowerCase().replace(/\s+/g, "");
  return `${match[1]}-${match[2].slice(-2)}`;
}

export function sameAcademicYear(
  left: string | null | undefined,
  right: string | null | undefined
): boolean {
  const leftKey = academicYearKey(left);
  return leftKey.length > 0 && leftKey === academicYearKey(right);
}
