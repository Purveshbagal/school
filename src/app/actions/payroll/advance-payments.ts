"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeLedgerEntry } from "@/lib/ledger";
import { recomputePayrollTotals } from "@/lib/payroll-recompute";
import { formatCurrency } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";

function revalidateAdvancePaths(teacherId: string) {
  revalidatePath("/advance-payments");
  revalidatePath(`/advance-payments/${teacherId}`);
  revalidatePath(`/payroll/${teacherId}`);
  revalidatePath("/payroll");
  revalidatePath("/salary-slips");
}

/**
 * Applies a newly-given advance against any already-generated, unlocked payrolls
 * that still have a pending balance (oldest period first) — otherwise an advance
 * given after payroll was generated just sits as "outstanding" and never reduces
 * what's already shown as due, which is not how admins expect it to behave.
 * Returns how much of the advance was consumed.
 */
async function applyAdvanceToOutstandingPayrolls(
  tx: Prisma.TransactionClient,
  teacherId: string,
  advanceId: string,
  advanceAmount: number,
  createdBy?: string
): Promise<number> {
  const unpaidPayrolls = await tx.payroll.findMany({
    where: { teacherId, deletedAt: null, locked: false, pendingAmount: { gt: 0 } },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  let remaining = advanceAmount;
  for (const payroll of unpaidPayrolls) {
    if (remaining <= 0) break;
    const applied = Math.min(remaining, payroll.pendingAmount);
    if (applied <= 0) continue;

    await tx.payroll.update({
      where: { id: payroll.id },
      data: { advanceApplied: { increment: applied } },
    });
    const updated = await recomputePayrollTotals(tx, payroll.id);
    remaining -= applied;

    await writeLedgerEntry(tx, {
      teacherId,
      type: "ADVANCE_APPLIED",
      amount: applied,
      description: `Advance of ${formatCurrency(applied)} applied against ${payroll.month}/${payroll.year} salary — pending now ${formatCurrency(updated.pendingAmount)}`,
      refId: payroll.id,
      createdBy,
    });
  }

  const consumed = advanceAmount - remaining;
  if (consumed > 0) {
    await tx.advancePayment.update({
      where: { id: advanceId },
      data: {
        adjustedAmount: { increment: consumed },
        status: remaining <= 0 ? "ADJUSTED" : "PARTIALLY_ADJUSTED",
        updatedBy: createdBy,
      },
    });
  }
  return consumed;
}

export async function addAdvanceAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const teacherId = String(formData.get("teacherId") || "");
  const amount = Number(formData.get("amount") || 0);
  const date = formData.get("date") ? new Date(String(formData.get("date"))) : new Date();
  const note = String(formData.get("note") || "").trim();

  if (!teacherId) return { error: "Please select a staff member" };
  if (!amount || amount <= 0) return { error: "Please enter a valid amount" };

  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) return { error: "Staff member not found" };

  const session = await getSession();

  await prisma.$transaction(async (tx) => {
    const advance = await tx.advancePayment.create({
      data: { teacherId, amount, date, note: note || undefined, deletedAt: null, createdBy: session?.username },
    });
    await writeLedgerEntry(tx, {
      teacherId,
      type: "ADVANCE_GIVEN",
      amount,
      description: `Advance of ${formatCurrency(amount)} given${note ? ` — ${note}` : ""}`,
      refId: advance.id,
      createdBy: session?.username,
    });

    await applyAdvanceToOutstandingPayrolls(tx, teacherId, advance.id, amount, session?.username);
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
  const date = formData.get("date") ? new Date(String(formData.get("date"))) : new Date();
  const note = String(formData.get("note") || "").trim();

  if (!amount || amount <= 0) return { error: "Please enter a valid amount" };

  const advance = await prisma.advancePayment.findUnique({ where: { id } });
  if (!advance || advance.deletedAt) return { error: "Advance not found" };
  if (advance.status !== "UNADJUSTED") {
    return { error: "This advance has already been applied against a payroll and can no longer be edited." };
  }

  const session = await getSession();

  await prisma.$transaction(async (tx) => {
    await tx.advancePayment.update({
      where: { id },
      data: { amount, date, note: note || undefined, updatedBy: session?.username },
    });
    await writeLedgerEntry(tx, {
      teacherId,
      type: "ADVANCE_EDITED",
      amount,
      description: `Advance edited to ${formatCurrency(amount)}${note ? ` — ${note}` : ""}`,
      refId: id,
      createdBy: session?.username,
    });
  });

  revalidateAdvancePaths(teacherId);
  redirect("/advance-payments");
}

export async function deleteAdvanceAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  const teacherId = String(formData.get("teacherId") || "");

  const advance = await prisma.advancePayment.findUnique({ where: { id } });
  if (!advance || advance.deletedAt) return;
  if (advance.status !== "UNADJUSTED") return; // already applied — not deletable

  const session = await getSession();

  await prisma.$transaction(async (tx) => {
    await tx.advancePayment.update({
      where: { id },
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

  revalidateAdvancePaths(teacherId);
}
