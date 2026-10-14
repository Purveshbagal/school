"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { toHallTicketData } from "@/lib/hall-tickets";
import type { HallTicketData } from "@/components/hall-ticket-card";

export type HallTicketFormState = { error?: string; success?: boolean; examId?: string } | undefined;

/** Generates a student's hall ticket for an exam, or updates the seat/block/center of the
 * one already generated (one ticket per student per exam). */
export async function saveHallTicketAction(
  _prevState: HallTicketFormState,
  formData: FormData
): Promise<HallTicketFormState> {
  const studentId = String(formData.get("studentId") || "");
  const examId = String(formData.get("examId") || "");
  const seatNo = String(formData.get("seatNo") || "").trim();
  const blockNo = String(formData.get("blockNo") || "").trim();
  const centerName = String(formData.get("centerName") || "").trim();

  if (!studentId) return { error: "Student not found" };
  if (!examId) return { error: "Please select an exam" };
  if (!seatNo) return { error: "Please enter the seat number" };

  const [student, exam, settings] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId } }),
    prisma.exam.findUnique({ where: { id: examId } }),
    prisma.schoolSettings.findUnique({ where: { id: "main" } }),
  ]);
  if (!student) return { error: "Student not found" };
  if (!exam || exam.isFinal) return { error: "Please select a valid exam" };

  // Seat numbers identify a student in the exam hall, so they must be unique across the
  // whole exam (every standard), not just within one class.
  const seatTaken = await prisma.hallTicket.findFirst({
    where: { examId, seatNo, NOT: { studentId } },
    include: { student: { select: { name: true } } },
  });
  if (seatTaken) {
    return { error: `Seat No ${seatNo} is already given to ${seatTaken.student.name} for ${exam.name}` };
  }

  const fields = { seatNo, blockNo: blockNo || null, centerName: centerName || null };
  await prisma.hallTicket.upsert({
    where: { studentId_examId: { studentId, examId } },
    update: fields,
    create: {
      ...fields,
      studentId,
      examId,
      standardId: student.standardId,
      academicYear: exam.academicYear || settings?.academicYear || "2026-27",
    },
  });

  revalidatePath("/hall-tickets", "layout");
  return { success: true, examId };
}

export async function deleteHallTicketAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.hallTicket.deleteMany({ where: { id } });
  revalidatePath("/hall-tickets", "layout");
}

/** Every hall ticket of one standard for one exam, ordered by seat number — loaded on
 * demand by "Download All" so the students page doesn't ship every photo up front. */
export async function getHallTicketsForDownloadAction(
  standardId: string,
  examId: string
): Promise<HallTicketData[]> {
  if (!standardId || !examId) return [];
  const [tickets, settings] = await Promise.all([
    prisma.hallTicket.findMany({
      where: { standardId, examId },
      include: { exam: true, student: true, standard: true },
    }),
    prisma.schoolSettings.findUnique({ where: { id: "main" } }),
  ]);
  return tickets
    .sort(
      (a, b) =>
        a.seatNo.localeCompare(b.seatNo, undefined, { numeric: true }) || a.student.name.localeCompare(b.student.name)
    )
    .map((ticket) => toHallTicketData(ticket, settings));
}
