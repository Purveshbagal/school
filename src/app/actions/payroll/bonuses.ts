"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeLedgerEntry } from "@/lib/ledger";
import { recomputePayrollTotals } from "@/lib/payroll-recompute";
import { formatCurrency } from "@/lib/utils";

const BONUS_TYPES = ["FESTIVAL", "PERFORMANCE", "YEARLY", "MANUAL"] as const;

export async function addBonusAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const payrollId = String(formData.get("payrollId") || "");
  const type = String(formData.get("type") || "MANUAL");
  const amount = Number(formData.get("amount") || 0);
  const note = String(formData.get("note") || "").trim();

  if (!amount || amount <= 0) return { error: "Please enter a valid bonus amount" };
  if (!BONUS_TYPES.includes(type as (typeof BONUS_TYPES)[number])) {
    return { error: "Invalid bonus type" };
  }

  const payroll = await prisma.payroll.findUnique({ where: { id: payrollId } });
  if (!payroll) return { error: "Payroll not found" };
  if (payroll.locked) return { error: "This payroll is locked." };

  const session = await getSession();

  await prisma.$transaction(async (tx) => {
    await tx.bonus.create({
      data: { payrollId, type, amount, note: note || undefined, deletedAt: null, createdBy: session?.username },
    });
    await recomputePayrollTotals(tx, payrollId);
    await writeLedgerEntry(tx, {
      teacherId: payroll.teacherId,
      type: "BONUS_ADDED",
      amount,
      description: `${type} bonus of ${formatCurrency(amount)} added${note ? ` — ${note}` : ""}`,
      refId: payrollId,
      createdBy: session?.username,
    });
  });

  revalidatePath(`/payroll/${payroll.teacherId}`);
  revalidatePath(`/salary-slips/${payrollId}`);
  return {};
}

export async function deleteBonusAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  const payrollId = String(formData.get("payrollId") || "");

  const payroll = await prisma.payroll.findUnique({ where: { id: payrollId } });
  if (!payroll || payroll.locked) return;

  const session = await getSession();

  await prisma.$transaction(async (tx) => {
    await tx.bonus.delete({ where: { id } });
    await recomputePayrollTotals(tx, payrollId);
    await writeLedgerEntry(tx, {
      teacherId: payroll.teacherId,
      type: "BONUS_ADDED",
      description: `Bonus removed`,
      refId: payrollId,
      createdBy: session?.username,
    });
  });

  revalidatePath(`/payroll/${payroll.teacherId}`);
  revalidatePath(`/salary-slips/${payrollId}`);
}
