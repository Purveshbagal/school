import type { Prisma } from "@/generated/prisma/client";
import { writeLedgerEntry } from "@/lib/ledger";
import { formatCurrency } from "@/lib/utils";
import { nextPeriod, MONTH_NAMES } from "@/lib/payroll-engine";
import { recomputePayrollTotals } from "@/lib/payroll-recompute";

/**
 * Builds the EMI schedule for an advance, starting from the advance's date. Each
 * installment is `emiAmount` except the last, which takes the remainder — so the
 * schedule always sums to exactly `amount`. Pure/client-safe — used both to actually
 * create the installments server-side and to preview the schedule in the give/edit forms.
 */
export function buildInstallmentSchedule(amount: number, emiAmount: number, date: Date) {
  const count = Math.max(1, Math.ceil(amount / emiAmount));
  const schedule: { month: number; year: number; amount: number }[] = [];
  let period = { month: date.getMonth() + 1, year: date.getFullYear() };
  let remaining = amount;
  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const installmentAmount = isLast ? remaining : Math.min(emiAmount, remaining);
    schedule.push({ month: period.month, year: period.year, amount: installmentAmount });
    remaining -= installmentAmount;
    period = nextPeriod(period.month, period.year);
  }
  return schedule;
}

/**
 * Consumes `consume` from one AdvanceInstallment against `payroll` — updates the
 * installment's appliedAmount/status/payrollId, rolls the amount up into its parent
 * AdvancePayment's adjustedAmount/status, and writes an ADVANCE_APPLIED ledger entry.
 * Call inside the same transaction as the Payroll create/update it's applied against.
 */
export async function applyToInstallment(
  tx: Prisma.TransactionClient,
  installment: { id: string; advancePaymentId: string; amount: number; appliedAmount: number; month: number; year: number },
  payroll: { id: string; teacherId: string; month: number; year: number },
  consume: number,
  createdBy?: string
) {
  if (consume <= 0) return;

  const newApplied = installment.appliedAmount + consume;
  const fullyConsumed = newApplied >= installment.amount - 0.005;

  await tx.advanceInstallment.update({
    where: { id: installment.id },
    data: {
      appliedAmount: newApplied,
      status: fullyConsumed ? "DEDUCTED" : "PENDING",
      payrollId: payroll.id,
      updatedBy: createdBy,
    },
  });

  const advance = await tx.advancePayment.update({
    where: { id: installment.advancePaymentId },
    data: { adjustedAmount: { increment: consume }, updatedBy: createdBy },
  });

  const remainingInstallments = await tx.advanceInstallment.findMany({
    where: { advancePaymentId: installment.advancePaymentId, deletedAt: null },
  });
  const remainingPending = remainingInstallments.reduce((sum, i) => sum + (i.amount - i.appliedAmount), 0);
  const status = remainingPending <= 0.005 ? "ADJUSTED" : advance.adjustedAmount > 0 ? "PARTIALLY_ADJUSTED" : "UNADJUSTED";
  await tx.advancePayment.update({ where: { id: installment.advancePaymentId }, data: { status } });

  await writeLedgerEntry(tx, {
    teacherId: payroll.teacherId,
    type: "ADVANCE_APPLIED",
    amount: consume,
    description: `Advance of ${formatCurrency(consume)} applied against ${payroll.month}/${payroll.year} salary`,
    refId: payroll.id,
    createdBy,
  });
}

/**
 * Reverses one already-deducted installment back to PENDING/unapplied: undoes its effect
 * on the payroll it was deducted from (if any), rolls the amount back off the parent
 * AdvancePayment's adjustedAmount/status, and clears the installment's own appliedAmount/
 * payrollId. Used when the teacher wants to undo a specific month's deduction (delete or
 * skip it) rather than the whole advance. Throws if the linked payroll is locked. A no-op
 * if the installment hasn't actually been applied yet.
 */
export async function reverseOneInstallment(
  tx: Prisma.TransactionClient,
  installment: {
    id: string;
    advancePaymentId: string;
    teacherId: string;
    appliedAmount: number;
    payrollId: string | null;
    month: number;
    year: number;
  },
  updatedBy?: string
) {
  if (installment.appliedAmount <= 0) return;

  if (installment.payrollId) {
    const payroll = await tx.payroll.findUnique({ where: { id: installment.payrollId } });
    if (payroll && !payroll.deletedAt) {
      if (payroll.locked) {
        throw new Error(
          `This installment has already been deducted from ${MONTH_NAMES[installment.month - 1]} ${installment.year}'s salary, which is locked. Unlock that payroll first.`
        );
      }
      await tx.payroll.update({
        where: { id: payroll.id },
        data: { advanceApplied: { decrement: installment.appliedAmount } },
      });
      await recomputePayrollTotals(tx, payroll.id);
    }
  }

  const giveBack = installment.appliedAmount;

  await tx.advanceInstallment.update({
    where: { id: installment.id },
    data: { appliedAmount: 0, status: "PENDING", payrollId: null, updatedBy },
  });

  const advance = await tx.advancePayment.update({
    where: { id: installment.advancePaymentId },
    data: { adjustedAmount: { decrement: giveBack }, updatedBy },
  });

  const remainingInstallments = await tx.advanceInstallment.findMany({
    where: { advancePaymentId: installment.advancePaymentId, deletedAt: null },
  });
  const remainingPending = remainingInstallments.reduce((sum, i) => sum + (i.amount - i.appliedAmount), 0);
  const status = remainingPending <= 0.005 ? "ADJUSTED" : advance.adjustedAmount > 0 ? "PARTIALLY_ADJUSTED" : "UNADJUSTED";
  await tx.advancePayment.update({ where: { id: installment.advancePaymentId }, data: { status } });

  await writeLedgerEntry(tx, {
    teacherId: installment.teacherId,
    type: "ADVANCE_APPLICATION_REVERSED",
    amount: -giveBack,
    description: `Advance deduction of ${formatCurrency(giveBack)} for ${MONTH_NAMES[installment.month - 1]} ${installment.year} undone`,
    refId: installment.id,
    createdBy: updatedBy,
  });
}

/**
 * Reverses whatever a deleted payroll had applied against its due installments — resets
 * each installment back to PENDING/unapplied and rolls the refund back off its parent
 * AdvancePayment. Call inside the same transaction as the Payroll soft-delete.
 */
export async function refundInstallmentsForPayroll(
  tx: Prisma.TransactionClient,
  payrollId: string,
  updatedBy?: string
) {
  const installments = await tx.advanceInstallment.findMany({
    where: { payrollId, deletedAt: null },
  });

  for (const installment of installments) {
    const giveBack = installment.appliedAmount;
    if (giveBack <= 0) continue;

    await tx.advanceInstallment.update({
      where: { id: installment.id },
      data: { appliedAmount: 0, status: "PENDING", payrollId: null, updatedBy },
    });

    const advance = await tx.advancePayment.update({
      where: { id: installment.advancePaymentId },
      data: { adjustedAmount: { decrement: giveBack }, updatedBy },
    });

    const remainingInstallments = await tx.advanceInstallment.findMany({
      where: { advancePaymentId: installment.advancePaymentId, deletedAt: null },
    });
    const remainingPending = remainingInstallments.reduce((sum, i) => sum + (i.amount - i.appliedAmount), 0);
    const status = remainingPending <= 0.005 ? "ADJUSTED" : advance.adjustedAmount > 0 ? "PARTIALLY_ADJUSTED" : "UNADJUSTED";
    await tx.advancePayment.update({ where: { id: installment.advancePaymentId }, data: { status } });
  }
}

/**
 * Undoes the payroll-side effect of whatever an advance's installments have already had
 * deducted (decrements each touched payroll's advanceApplied and recomputes its totals) —
 * without touching the installment rows or the AdvancePayment itself, since the caller
 * (edit/delete) is about to replace or remove those anyway. Throws if any touched payroll
 * is locked, since a locked payroll's figures can no longer be safely changed — callers
 * should run this before making any other change so the whole edit/delete aborts cleanly.
 */
export async function reverseAppliedInstallmentsForAdvance(
  tx: Prisma.TransactionClient,
  advancePaymentId: string
) {
  const installments = await tx.advanceInstallment.findMany({
    where: { advancePaymentId, deletedAt: null, appliedAmount: { gt: 0 } },
  });

  for (const installment of installments) {
    if (!installment.payrollId) continue;
    const payroll = await tx.payroll.findUnique({ where: { id: installment.payrollId } });
    if (!payroll || payroll.deletedAt) continue;
    if (payroll.locked) {
      throw new Error(
        `This advance has already been deducted from ${MONTH_NAMES[installment.month - 1]} ${installment.year}'s salary, which is locked. Unlock that payroll first.`
      );
    }

    await tx.payroll.update({
      where: { id: payroll.id },
      data: { advanceApplied: { decrement: installment.appliedAmount } },
    });
    await recomputePayrollTotals(tx, payroll.id);
  }
}
