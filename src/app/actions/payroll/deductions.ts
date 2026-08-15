"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeLedgerEntry } from "@/lib/ledger";
import { recomputePayrollTotals } from "@/lib/payroll-recompute";
import { formatCurrency } from "@/lib/utils";

const DEDUCTION_TYPES = ["PENALTY", "LOAN", "FINE", "ADVANCE_RECOVERY", "OTHER"] as const;

export async function addDeductionAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const payrollId = String(formData.get("payrollId") || "");
  const type = String(formData.get("type") || "OTHER");
  const amount = Number(formData.get("amount") || 0);
  const note = String(formData.get("note") || "").trim();

  if (!amount || amount <= 0) return { error: "Please enter a valid deduction amount" };
  if (!DEDUCTION_TYPES.includes(type as (typeof DEDUCTION_TYPES)[number])) {
    return { error: "Invalid deduction type" };
  }

  const payroll = await prisma.payroll.findUnique({ where: { id: payrollId } });
  if (!payroll) return { error: "Payroll not found" };
  if (payroll.locked) return { error: "This payroll is locked." };

  const session = await getSession();

  await prisma.$transaction(async (tx) => {
    await tx.salaryDeduction.create({
      data: { payrollId, type, amount, note: note || undefined, deletedAt: null, createdBy: session?.username },
    });
    await recomputePayrollTotals(tx, payrollId);
    await writeLedgerEntry(tx, {
      teacherId: payroll.teacherId,
      type: "DEDUCTION_ADDED",
      amount,
      description: `${type} deduction of ${formatCurrency(amount)} added${note ? ` — ${note}` : ""}`,
      refId: payrollId,
      createdBy: session?.username,
    });
  });

  revalidatePath(`/payroll/${payroll.teacherId}`);
  revalidatePath(`/salary-slips/${payrollId}`);
  return {};
}

export async function deleteDeductionAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  const payrollId = String(formData.get("payrollId") || "");

  const payroll = await prisma.payroll.findUnique({ where: { id: payrollId } });
  if (!payroll || payroll.locked) return;

  const deduction = await prisma.salaryDeduction.findUnique({ where: { id } });
  if (!deduction || deduction.payrollId !== payrollId) return;

  const session = await getSession();

  await prisma.$transaction(async (tx) => {
    await tx.salaryDeduction.delete({ where: { id } });
    await recomputePayrollTotals(tx, payrollId);
    await writeLedgerEntry(tx, {
      teacherId: payroll.teacherId,
      type: "DEDUCTION_ADDED",
      description: `Deduction removed`,
      refId: payrollId,
      createdBy: session?.username,
    });
  });

  revalidatePath(`/payroll/${payroll.teacherId}`);
  revalidatePath(`/salary-slips/${payrollId}`);
}
