"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function switchAcademicYearAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | undefined> {
  const toYear = String(formData.get("toYear") || "").trim();
  if (!toYear) return { error: "Please enter the new academic year" };

  const settings = await prisma.schoolSettings.findUnique({ where: { id: "main" } });
  const fromYear = settings?.academicYear || "2026-27";
  if (toYear === fromYear) {
    return { error: `Already on ${fromYear}. Enter a different year to switch.` };
  }

  await prisma.$transaction(
    async (tx) => {
      const standards = await tx.standard.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] });
      const standardById = new Map(standards.map((s) => [s.id, s]));

      // Next standard for each standard: its explicit `promotesToId` override if set
      // (needed when tracks diverge, e.g. a CBSE-only track rejoining the main track
      // later), otherwise the following standard by order, or itself if it's the last.
      const nextStandardId = new Map<string, string>();
      standards.forEach((standard, i) => {
        nextStandardId.set(standard.id, standard.promotesToId || standards[i + 1]?.id || standard.id);
      });

      // Auto-copy each standard's fee structure into the new year if it doesn't exist yet.
      const fromFeeStructures = await tx.feeStructure.findMany({
        where: { academicYear: fromYear },
        include: { components: true },
      });
      const toFeeStructures = await tx.feeStructure.findMany({
        where: { academicYear: toYear },
        select: { standardId: true },
      });
      const hasToStructure = new Set(toFeeStructures.map((fs) => fs.standardId));
      for (const fs of fromFeeStructures) {
        if (hasToStructure.has(fs.standardId)) continue;
        await tx.feeStructure.create({
          data: {
            standardId: fs.standardId,
            academicYear: toYear,
            totalAmount: fs.totalAmount,
            components: { create: fs.components.map((c) => ({ name: c.name, amount: c.amount })) },
          },
        });
      }

      const activeStudents = await tx.student.findMany({
        where: { status: "ACTIVE" },
        include: { payments: true, villageRef: true },
      });

      const oldFeeStructureMap = new Map(
        fromFeeStructures.map((fs) => [fs.standardId, fs.totalAmount])
      );

      const entries: {
        studentId: string;
        fromStandardId: string;
        toStandardId: string;
        fromOpeningBalance: number;
        toOpeningBalance: number;
        fromBusFeeSnapshot: number;
        toBusFeeSnapshot: number;
        fromBoard: string | null;
        toBoard: string | null;
        fromCustomFee: number | null;
        toCustomFee: number | null;
      }[] = [];

      for (const student of activeStudents) {
        const baseFee = student.customFee ?? oldFeeStructureMap.get(student.standardId) ?? 0;
        const standardFee = Math.max(0, baseFee - (student.discount || 0));
        // Use the bus fee as it was locked in at the student's last save — not a live
        // re-lookup — so this "closing" balance matches what they were actually charged.
        const oldBusFee = student.schoolBus ? student.busFeeSnapshot || 0 : 0;
        // Only this closing year's payments — anything from an even earlier year is
        // already folded into the existing openingBalance (see fees.ts for the same rule).
        const totalPaid = student.payments
          .filter((p) => p.academicYear === fromYear)
          .reduce((sum, p) => sum + p.amount, 0);
        const preSwitchDue = Math.max(
          0,
          (student.openingBalance || 0) + standardFee + oldBusFee - totalPaid
        );

        // Now refresh the bus fee snapshot to the village's current rate, so the new
        // year's fee reflects any bus fee change made since the student was last saved.
        const newBusFeeSnapshot = student.schoolBus ? student.villageRef?.busFee || 0 : 0;

        const toStandardId = nextStandardId.get(student.standardId) ?? student.standardId;
        // Only override the student's Board if the destination standard has one set —
        // an unset Board on the standard means "don't touch the student's Board".
        const toBoard = standardById.get(toStandardId)?.board || null;
        // customFee overrides the standard's live fee structure; it was set for the
        // *old* standard, so carrying it into a different standard would keep
        // charging the old amount instead of the new standard's fee. Clear it when
        // the standard actually changes; leave it alone for a same-standard "switch"
        // (e.g. last standard with no promotesTo).
        const toCustomFee = toStandardId !== student.standardId ? null : student.customFee ?? null;

        entries.push({
          studentId: student.id,
          fromStandardId: student.standardId,
          toStandardId,
          fromOpeningBalance: student.openingBalance || 0,
          toOpeningBalance: preSwitchDue,
          fromBusFeeSnapshot: student.busFeeSnapshot || 0,
          toBusFeeSnapshot: newBusFeeSnapshot,
          fromBoard: student.board,
          toBoard: toBoard || student.board,
          fromCustomFee: student.customFee ?? null,
          toCustomFee,
        });

        await tx.student.update({
          where: { id: student.id },
          data: {
            standardId: toStandardId,
            academicYear: toYear,
            openingBalance: preSwitchDue,
            busFeeSnapshot: newBusFeeSnapshot,
            customFee: toCustomFee,
            ...(toBoard ? { board: toBoard } : {}),
          },
        });
      }

      await tx.yearTransition.create({
        data: {
          fromYear,
          toYear,
          studentCount: entries.length,
          entries,
        },
      });

      await tx.schoolSettings.upsert({
        where: { id: "main" },
        update: { academicYear: toYear },
        create: { id: "main", academicYear: toYear },
      });
    },
    { timeout: 30000 }
  );

  revalidatePath("/settings");
  revalidatePath("/students");
  revalidatePath("/pending-fees");
  revalidatePath("/dashboard");
}

/**
 * A transition can only be undone while every affected student is still exactly
 * where the transition left them, and no fee payment has been recorded for any
 * of them since — i.e. nothing else in the software has touched that data.
 */
export async function isYearTransitionRevertible(transitionId: string): Promise<{
  revertible: boolean;
  reason?: string;
}> {
  const transition = await prisma.yearTransition.findUnique({ where: { id: transitionId } });
  if (!transition || transition.revertedAt) return { revertible: false };

  const latest = await prisma.yearTransition.findFirst({ orderBy: { createdAt: "desc" } });
  if (latest?.id !== transitionId) {
    return { revertible: false, reason: "A newer switch has happened since." };
  }

  for (const entry of transition.entries) {
    const student = await prisma.student.findUnique({ where: { id: entry.studentId } });
    if (
      !student ||
      student.standardId !== entry.toStandardId ||
      student.academicYear !== transition.toYear ||
      student.openingBalance !== entry.toOpeningBalance ||
      student.busFeeSnapshot !== entry.toBusFeeSnapshot ||
      (student.board || null) !== (entry.toBoard || null) ||
      (student.customFee ?? null) !== (entry.toCustomFee ?? null)
    ) {
      return {
        revertible: false,
        reason: "Some data has changed since this switch, so it can no longer be undone.",
      };
    }
    const laterPayment = await prisma.feePayment.findFirst({
      where: { studentId: entry.studentId, createdAt: { gt: transition.createdAt } },
      select: { id: true },
    });
    if (laterPayment) {
      return {
        revertible: false,
        reason: "A payment has been recorded since this switch, so it can no longer be undone.",
      };
    }
  }

  return { revertible: true };
}

export async function undoYearTransitionAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | undefined> {
  const id = String(formData.get("id"));
  const transition = await prisma.yearTransition.findUnique({ where: { id } });
  if (!transition) return { error: "Switch not found" };

  const { revertible, reason } = await isYearTransitionRevertible(id);
  if (!revertible) {
    return { error: reason || "This switch can no longer be undone." };
  }

  await prisma.$transaction(
    async (tx) => {
      for (const entry of transition.entries) {
        await tx.student.update({
          where: { id: entry.studentId },
          data: {
            standardId: entry.fromStandardId,
            academicYear: transition.fromYear,
            openingBalance: entry.fromOpeningBalance,
            busFeeSnapshot: entry.fromBusFeeSnapshot,
            board: entry.fromBoard,
            customFee: entry.fromCustomFee,
          },
        });
      }
      await tx.schoolSettings.update({
        where: { id: "main" },
        data: { academicYear: transition.fromYear },
      });
      await tx.yearTransition.update({
        where: { id },
        data: { revertedAt: new Date() },
      });
    },
    { timeout: 30000 }
  );

  revalidatePath("/settings");
  revalidatePath("/students");
  revalidatePath("/pending-fees");
  revalidatePath("/dashboard");
}
