"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dayKey } from "@/lib/tracking";
import { studentAttendanceDayBounds } from "@/lib/student-attendance";
import { isObjectId } from "@/lib/driver-auth";

type AttendanceActionState = { error?: string; success?: boolean };

export async function saveStudentAttendanceAction(
  _previousState: AttendanceActionState | undefined,
  formData: FormData
): Promise<AttendanceActionState> {
  const session = await getSession();
  if (session?.role !== "admin") return { error: "Only an admin can manage student attendance." };

  const standardId = String(formData.get("standardId") || "");
  const day = String(formData.get("date") || "");
  const bounds = studentAttendanceDayBounds(day);
  if (!isObjectId(standardId)) return { error: "Select a valid standard." };
  if (!bounds) return { error: "Select a valid attendance date." };
  if (day > dayKey(Date.now())) return { error: "Attendance cannot be marked for a future date." };

  const studentIds = formData.getAll("studentId").map(String);
  const uniqueStudentIds = [...new Set(studentIds)];
  if (studentIds.length === 0 || uniqueStudentIds.length !== studentIds.length || !studentIds.every(isObjectId)) {
    return { error: "The student list is invalid. Refresh the page and try again." };
  }

  const students = await prisma.student.findMany({
    where: { standardId, status: "ACTIVE" },
    select: { id: true },
  });
  const rosterIds = new Set(students.map(({ id }) => id));
  if (students.length !== uniqueStudentIds.length || uniqueStudentIds.some((id) => !rosterIds.has(id))) {
    return { error: "The class roster changed. Refresh the page before saving." };
  }

  const entries = uniqueStudentIds.map((studentId) => ({
    studentId,
    status: String(formData.get(`attendance_${studentId}`) || ""),
  }));
  if (entries.some(({ status }) => status !== "PRESENT" && status !== "ABSENT")) {
    return { error: "Choose Present or Absent for every student before saving." };
  }

  await prisma.$transaction(
    entries.map(({ studentId, status }) =>
      prisma.studentAttendance.upsert({
        where: { studentId_date: { studentId, date: bounds.start } },
        create: { studentId, date: bounds.start, status, recordedBy: session.username },
        update: { status, recordedBy: session.username },
      })
    )
  );

  revalidatePath("/student-attendance");
  return { success: true };
}
