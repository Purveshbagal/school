const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Exam dates are saved from <input type="date"> values (UTC midnight), so read them back
// in UTC — local getters would shift the day in timezones behind UTC.

/** e.g. 2026-04-06 -> "06-Apr-2026", the format printed on hall tickets. */
export function formatTicketDate(date: Date | string): string {
  const d = new Date(date);
  return `${String(d.getUTCDate()).padStart(2, "0")}-${MONTHS_SHORT[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

/** "06-Apr-2026 to 11-Apr-2026", or a single date for a one-day exam. */
export function formatExamDateRange(start: Date | string, end: Date | string | null | undefined): string {
  const from = formatTicketDate(start);
  if (!end) return from;
  const to = formatTicketDate(end);
  return from === to ? from : `${from} to ${to}`;
}

/** "APRIL-2026" — the month/year suffix in the hall ticket title. */
export function examMonthLabel(start: Date | string): string {
  const d = new Date(start);
  return `${MONTHS_LONG[d.getUTCMonth()].toUpperCase()}-${d.getUTCFullYear()}`;
}

/** Exams whose academicYear predates that field (null) are treated as belonging to the current year. */
export function examBelongsToYear(examYear: string | null, year: string, currentYear: string): boolean {
  return examYear === year || (examYear === null && year === currentYear);
}

/** Distinct academic years, newest first, always including the current one. */
export function sortYears(currentYear: string, years: (string | null | undefined)[]): string[] {
  const set = new Set<string>([currentYear]);
  for (const y of years) if (y) set.add(y);
  return [...set].sort((a, b) => b.localeCompare(a));
}

type TicketRecord = {
  id: string;
  seatNo: string;
  blockNo: string | null;
  centerName: string | null;
  exam: { name: string; examDate: Date; examEndDate: Date | null };
  student: { name: string; photoUrl: string | null };
  standard: { name: string };
};

/** Flattens a HallTicket (with exam/student/standard included) into what HallTicketCard renders. */
export function toHallTicketData(
  ticket: TicketRecord,
  school: { name?: string | null; address?: string | null } | null
) {
  return {
    id: ticket.id,
    schoolName: school?.name || "School Name",
    schoolAddress: school?.address || null,
    examName: ticket.exam.name,
    examDate: ticket.exam.examDate,
    examEndDate: ticket.exam.examEndDate,
    studentName: ticket.student.name,
    standardName: ticket.standard.name,
    photoUrl: ticket.student.photoUrl,
    seatNo: ticket.seatNo,
    blockNo: ticket.blockNo,
    centerName: ticket.centerName,
  };
}
