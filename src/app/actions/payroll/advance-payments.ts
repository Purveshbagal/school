"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeLedgerEntry } from "@/lib/ledger";
import { recomputePayrollTotals } from "@/lib/payroll-recompute";
import {
  applyToInstallment,
  buildInstallmentSchedule,
  reverseAppliedInstallmentsForAdvance,
  reverseOneInstallment,
} from "@/lib/advance-installments";
import { formatCurrency } from "@/lib/utils";
import { nextPeriod } from "@/lib/payroll-engine";
import type { Prisma } from "@/generated/prisma/client";

function revalidateAdvancePaths(teacherId: string) {
  revalidatePath("/advance-payments");
  revalidatePath(`/advance-payments/${teacherId}`);
  revalidatePath(`/payroll/${teacherId}`);
  revalidatePath("/payroll");
  revalidatePath("/salary-slips");
}

/**
 * Applies each newly-created installment immediately if a payroll already exists for
 * its (teacherId, month, year) and is unlocked — otherwise an advance given after that
 * month's payroll was generated just sits as "outstanding" and never reduces what's
 * already shown as due for a month that's already due. Installments with no existing
 * payroll yet stay PENDING and are picked up naturally when that period is generated.
 */
async function applyDueInstallments(
  tx: Prisma.TransactionClient,
  teacherId: string,
  installments: { id: string; advancePaymentId: string; month: number; year: number; amount: number; appliedAmount: number }[],
  createdBy?: string
) {
  for (const installment of installments) {
    const payroll = await tx.payroll.findUnique({
      where: { teacherId_month_year: { teacherId, month: installment.month, year: installment.year } },
    });
    if (!payroll || payroll.deletedAt || payroll.locked) continue;

    const consume = Math.min(installment.amount - installment.appliedAmount, payroll.netPayable);
    if (consume <= 0) continue;

    await tx.payroll.update({ where: { id: payroll.id }, data: { advanceApplied: { increment: consume } } });
    await applyToInstallment(tx, installment, payroll, consume, createdBy);
    await recomputePayrollTotals(tx, payroll.id);
  }
}

export async function addAdvanceAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const teacherId = String(formData.get("teacherId") || "");
  const amount = Number(formData.get("amount") || 0);
  const emiAmount = Number(formData.get("emiAmount") || 0);
  const date = formData.get("date") ? new Date(String(formData.get("date"))) : new Date();
  const note = String(formData.get("note") || "").trim();

  if (!teacherId) return { error: "Please select a staff member" };
  if (!amount || amount <= 0) return { error: "Please enter a valid amount" };
  if (!emiAmount || emiAmount <= 0) return { error: "Please enter a valid monthly deduction (EMI) amount" };

  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) return { error: "Staff member not found" };

  const session = await getSession();
  const schedule = buildInstallmentSchedule(amount, emiAmount, date);

  await prisma.$transaction(async (tx) => {
    const advance = await tx.advancePayment.create({
      data: { teacherId, amount, date, note: note || undefined, deletedAt: null, createdBy: session?.username },
    });
    await writeLedgerEntry(tx, {
      teacherId,
      type: "ADVANCE_GIVEN",
      amount,
      description: `Advance of ${formatCurrency(amount)} given${note ? ` — ${note}` : ""} — deducting ${formatCurrency(emiAmount)}/month`,
      refId: advance.id,
      createdBy: session?.username,
    });

    await tx.advanceInstallment.createMany({
      data: schedule.map((s) => ({
        advancePaymentId: advance.id,
        teacherId,
        month: s.month,
        year: s.year,
        amount: s.amount,
        deletedAt: null,
        createdBy: session?.username,
      })),
    });
    const installments = await tx.advanceInstallment.findMany({ where: { advancePaymentId: advance.id } });

    await applyDueInstallments(tx, teacherId, installments, session?.username);
  });

  revalidateAdvancePaths(teacherId);
  redirect("/advance-payments");
}

export async function updateAdvanceAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const id = String(formData.get("id") || "");
  const teacherId = String(formData.get("teacherId") || "");
  const amount = Number(formData.get("amount") || 0);
  const emiAmount = Number(formData.get("emiAmount") || 0);
  const date = formData.get("date") ? new Date(String(formData.get("date"))) : new Date();
  const note = String(formData.get("note") || "").trim();

  if (!amount || amount <= 0) return { error: "Please enter a valid amount" };
  if (!emiAmount || emiAmount <= 0) return { error: "Please enter a valid monthly deduction (EMI) amount" };

  const advance = await prisma.advancePayment.findUnique({ where: { id } });
  if (!advance || advance.deletedAt) return { error: "Advance not found" };

  const session = await getSession();
  const schedule = buildInstallmentSchedule(amount, emiAmount, date);

  try {
    await prisma.$transaction(async (tx) => {
      // Undo whatever this advance's old schedule had already deducted from any
      // payroll before replacing it — aborts (rolls back) if any of those is locked.
      await reverseAppliedInstallmentsForAdvance(tx, id);

      await tx.advancePayment.update({
        where: { id },
        data: { amount, date, note: note || undefined, adjustedAmount: 0, status: "UNADJUSTED", updatedBy: session?.username },
      });
      await writeLedgerEntry(tx, {
        teacherId,
        type: "ADVANCE_EDITED",
        amount,
        description: `Advance edited to ${formatCurrency(amount)}${note ? ` — ${note}` : ""} — deducting ${formatCurrency(emiAmount)}/month`,
        refId: id,
        createdBy: session?.username,
      });

      await tx.advanceInstallment.updateMany({
        where: { advancePaymentId: id, deletedAt: null },
        data: { deletedAt: new Date(), updatedBy: session?.username },
      });
      await tx.advanceInstallment.createMany({
        data: schedule.map((s) => ({
          advancePaymentId: id,
          teacherId,
          month: s.month,
          year: s.year,
          amount: s.amount,
          deletedAt: null,
          createdBy: session?.username,
        })),
      });
      const installments = await tx.advanceInstallment.findMany({ where: { advancePaymentId: id, deletedAt: null } });
      await applyDueInstallments(tx, teacherId, installments, session?.username);
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update this advance." };
  }

  revalidateAdvancePaths(teacherId);
  redirect("/advance-payments");
}

export async function deleteAdvanceAction(formData: FormData): Promise<{ error?: string } | void> {
  const id = String(formData.get("id") || "");
  const teacherId = String(formData.get("teacherId") || "");

  const advance = await prisma.advancePayment.findUnique({ where: { id } });
  if (!advance || advance.deletedAt) return;

  const session = await getSession();

  try {
    await prisma.$transaction(async (tx) => {
      // Undo whatever this advance had already deducted from any payroll — aborts
      // (rolls back) if any of those is locked.
      await reverseAppliedInstallmentsForAdvance(tx, id);

      await tx.advancePayment.update({
        where: { id },
        data: { deletedAt: new Date(), updatedBy: session?.username },
      });
      await tx.advanceInstallment.updateMany({
        where: { advancePaymentId: id, deletedAt: null },
        data: { deletedAt: new Date(), updatedBy: session?.username },
      });
      await writeLedgerEntry(tx, {
        teacherId,
        type: "ADVANCE_DELETED",
        amount: advance.amount,
        description: `Advance of ${formatCurrency(advance.amount)} deleted`,
        refId: id,
        createdBy: session?.username,
      });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not delete this advance." };
  }

  revalidateAdvancePaths(teacherId);
}

export async function addAdvanceInstallmentAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const advancePaymentId = String(formData.get("advancePaymentId") || "");
  const teacherId = String(formData.get("teacherId") || "");
  const month = Number(formData.get("month") || 0);
  const year = Number(formData.get("year") || 0);
  const amount = Number(formData.get("amount") || 0);

  if (!month || !year) return { error: "Please select a month and year" };
  if (!amount || amount <= 0) return { error: "Please enter a valid amount" };

  const advance = await prisma.advancePayment.findUnique({ where: { id: advancePaymentId } });
  if (!advance || advance.deletedAt) return { error: "Advance not found" };

  const session = await getSession();

  await prisma.$transaction(async (tx) => {
    const installment = await tx.advanceInstallment.create({
      data: { advancePaymentId, teacherId, month, year, amount, deletedAt: null, createdBy: session?.username },
    });
    await applyDueInstallments(tx, teacherId, [installment], session?.username);
  });

  revalidateAdvancePaths(teacherId);
  revalidatePath(`/advance-payments/entries/${advancePaymentId}/schedule`);
  redirect(`/advance-payments/entries/${advancePaymentId}/schedule`);
}

/**
 * "Skip this month" — pushes an installment to the month right after the advance's
 * current last-scheduled installment, instead of it being deducted this month. If it was
 * already deducted, that deduction is undone first (the linked payroll must be unlocked).
 * The schedule just grows by one more month at the end; nothing is forgiven or lost.
 */
export async function skipAdvanceInstallmentAction(formData: FormData): Promise<{ error?: string } | void> {
  const id = String(formData.get("id") || "");
  const teacherId = String(formData.get("teacherId") || "");

  const installment = await prisma.advanceInstallment.findUnique({ where: { id } });
  if (!installment || installment.deletedAt) return { error: "Installment not found" };

  const session = await getSession();

  try {
    await prisma.$transaction(async (tx) => {
      await reverseOneInstallment(tx, installment, session?.username);

      const last = await tx.advanceInstallment.findFirst({
        where: { advancePaymentId: installment.advancePaymentId, deletedAt: null },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      });
      const newPeriod = nextPeriod((last || installment).month, (last || installment).year);

      await tx.advanceInstallment.update({
        where: { id },
        data: { month: newPeriod.month, year: newPeriod.year, updatedBy: session?.username },
      });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not skip this installment." };
  }

  revalidateAdvancePaths(teacherId);
  revalidatePath(`/advance-payments/entries/${installment.advancePaymentId}/schedule`);
}

/**
 * Removes an installment from the schedule entirely. If it was already deducted, that
 * deduction is undone first (the linked payroll must be unlocked) before it's removed —
 * the teacher can then add it back for a later month from the schedule page.
 */
export async function deleteAdvanceInstallmentAction(formData: FormData): Promise<{ error?: string } | void> {
  const id = String(formData.get("id") || "");
  const teacherId = String(formData.get("teacherId") || "");

  const installment = await prisma.advanceInstallment.findUnique({ where: { id } });
  if (!installment || installment.deletedAt) return;

  const session = await getSession();

  try {
    await prisma.$transaction(async (tx) => {
      await reverseOneInstallment(tx, installment, session?.username);
      await tx.advanceInstallment.update({
        where: { id },
        data: { deletedAt: new Date(), updatedBy: session?.username },
      });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not delete this installment." };
  }

  revalidateAdvancePaths(teacherId);
  revalidatePath(`/advance-payments/entries/${installment.advancePaymentId}/schedule`);
}
