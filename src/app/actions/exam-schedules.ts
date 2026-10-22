"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isObjectId } from "@/lib/driver-auth";
import { dayBounds } from "@/lib/tracking";

const TIMETABLE_PATH = "/exams/timetable";
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

async function canManageTimetable(): Promise<boolean> {
  const session = await getSession();
  return Boolean(session && (session.role === "admin" || session.permissions.includes(TIMETABLE_PATH)));
}

export async function createExamScheduleAction(
  _prevState: { error?: string; ok?: number } | undefined,
  formData: FormData
): Promise<{ error?: string; ok?: number }> {
  if (!(await canManageTimetable())) return { error: "Not authorized" };

  const examId = String(formData.get("examId") || "");
  const standardId = String(formData.get("standardId") || "");
  const subject = String(formData.get("subject") || "").trim();
  const day = String(formData.get("date") || "");
  const startTime = String(formData.get("startTime") || "");
  const endTime = String(formData.get("endTime") || "");

  if (!isObjectId(standardId)) return { error: "Select a standard" };
  if (!isObjectId(examId)) return { error: "Select an exam" };
  const bounds = dayBounds(day);
  if (!bounds) return { error: "Select the exam date" };
  if (startTime && !TIME_PATTERN.test(startTime)) return { error: "Start time is not valid" };
  if (endTime && !TIME_PATTERN.test(endTime)) return { error: "End time is not valid" };
  if (startTime && endTime && endTime <= startTime) return { error: "End time must be after the start time" };
  if (subject.length > 100) return { error: "Subject is too long" };

  const [exam, standard] = await Promise.all([
    prisma.exam.findUnique({ where: { id: examId }, select: { isFinal: true } }),
    prisma.standard.findUnique({ where: { id: standardId }, select: { id: true } }),
  ]);
  if (!exam || exam.isFinal) return { error: "Selected exam no longer exists" };
  if (!standard) return { error: "Selected standard no longer exists" };

  const duplicate = await prisma.examSchedule.findFirst({
    where: { examId, standardId, date: bounds.start, subject: subject || null },
    select: { id: true },
  });
  if (duplicate) return { error: "This paper is already in the timetable for that day" };

  await prisma.examSchedule.create({
    data: {
      examId,
      standardId,
      subject: subject || null,
      date: bounds.start,
      startTime: startTime || null,
      endTime: endTime || null,
    },
  });
  revalidatePath(TIMETABLE_PATH);
  return { ok: Date.now() };
}

export async function deleteExamScheduleAction(formData: FormData): Promise<{ error?: string } | void> {
  if (!(await canManageTimetable())) return { error: "Not authorized" };
  const id = String(formData.get("id") || "");
  if (!isObjectId(id)) return { error: "Entry not found" };
  await prisma.examSchedule.deleteMany({ where: { id } });
  revalidatePath(TIMETABLE_PATH);
}
