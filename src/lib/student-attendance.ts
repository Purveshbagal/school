import { dayBounds, dayKey } from "@/lib/tracking";

export function studentAttendanceDayBounds(day: string) {
  const bounds = dayBounds(day);
  return bounds && dayKey(bounds.start) === day ? bounds : null;
}

export function studentAttendanceToday() {
  return dayKey(Date.now());
}
