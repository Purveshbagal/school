import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
} from "date-fns";

export const RANGE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "month", label: "Current Month" },
  { value: "last-month", label: "Previous Month" },
  { value: "30days", label: "Last 30 Days" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
] as const;

export type PaymentRange = (typeof RANGE_OPTIONS)[number]["value"];

/** Simplified range set for the teacher salary+advance combined history widget. */
export const TEACHER_HISTORY_RANGE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "month", label: "This Month" },
  { value: "last-3-months", label: "Last 3 Months" },
  { value: "last-6-months", label: "Last 6 Months" },
  { value: "year", label: "This Year" },
] as const;

export function resolveDateRange(
  range: string | undefined,
  from?: string,
  to?: string
): { start?: Date; end?: Date } {
  const now = new Date();

  switch (range) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    case "week":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
    case "month":
      return { start: startOfMonth(now), end: endOfDay(now) };
    case "last-month": {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    case "30days":
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    case "last-3-months":
      return { start: startOfMonth(subMonths(now, 2)), end: endOfDay(now) };
    case "last-6-months":
      return { start: startOfMonth(subMonths(now, 5)), end: endOfDay(now) };
    case "year":
      return { start: startOfYear(now), end: endOfDay(now) };
    case "custom":
      if (from && to) {
        return { start: startOfDay(new Date(from)), end: endOfDay(new Date(to)) };
      }
      return {};
    default:
      return {};
  }
}
