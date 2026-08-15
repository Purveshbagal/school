"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeLedgerEntry } from "@/lib/ledger";
import { createNotification } from "@/lib/notify";
import { recomputePayrollTotals } from "@/lib/payroll-recompute";
import { formatCurrency } from "@/lib/utils";

export async function paySalaryAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const payrollId = String(formData.get("payrollId") || "");
  const amount = Number(formData.get("amount") || 0);
  const paymentDate = formData.get("paymentDate") ? new Date(String(formData.get("paymentDate"))) : new Date();
  const paymentMode = String(formData.get("paymentMode") || "CASH");
  const referenceNo = String(formData.get("referenceNo") || "").trim();
  const note = String(formData.get("note") || "").trim();

  if (!amount || amount <= 0) return { error: "Please enter a valid amount" };

  const payroll = await prisma.payroll.findUnique({
    where: { id: payrollId },
    include: { teacher: true },
  });
  if (!payroll) return { error: "Payroll not found" };
  if (payroll.locked) return { error: "This payroll is locked." };
  if (amount > payroll.pendingAmount + 0.01) {
    return { error: `Amount exceeds the pending balance of ${formatCurrency(payroll.pendingAmount)}.` };
  }

  const session = await getSession();

  await prisma.$transaction(async (tx) => {
    await tx.salaryPayment.create({
      data: {
        payrollId,
        teacherId: payroll.teacherId,
        amount,
        paymentDate,
        paymentMode,
        referenceNo: referenceNo || undefined,
        note: note || undefined,
        deletedAt: null,
        createdBy: session?.username,
      },
    });

    await tx.payroll.update({
      where: { id: payrollId },
      data: { paidAmount: { increment: amount } },
    });

    const updated = await recomputePayrollTotals(tx, payrollId);

    await writeLedgerEntry(tx, {
      teacherId: payroll.teacherId,
      type: "SALARY_PAID",
      amount,
      description: `Payment of ${formatCurrency(amount)} made via ${paymentMode}${
        updated.status === "PAID" ? " — fully settled" : ` — ${formatCurrency(updated.pendingAmount)} still pending`
      }`,
      refId: payrollId,
      createdBy: session?.username,
    });

    await createNotification(tx, {
      type: "SALARY_PAID",
      audience: "TEACHER",
      teacherId: payroll.teacherId,
      title: "Salary paid",
      message: `${formatCurrency(amount)} paid for ${payroll.month}/${payroll.year}.${
        updated.status !== "PAID" ? ` Pending: ${formatCurrency(updated.pendingAmount)}.` : ""
      }`,
      createdBy: session?.username,
    });
  });

  revalidatePath(`/payroll/${payroll.teacherId}`);
  revalidatePath("/payroll");
  revalidatePath(`/salary-slips/${payrollId}`);
  revalidatePath("/salary-slips");
  return {};
}

export async function deleteSalaryPaymentAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  const payrollId = String(formData.get("payrollId") || "");

  const payroll = await prisma.payroll.findUnique({ where: { id: payrollId } });
  if (!payroll || payroll.locked) return;

  const payment = await prisma.salaryPayment.findUnique({ where: { id } });
  if (!payment || payment.deletedAt || payment.payrollId !== payrollId) return;

  const session = await getSession();

  await prisma.$transaction(async (tx) => {
    await tx.salaryPayment.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: session?.username },
    });

    await tx.payroll.update({
      where: { id: payrollId },
      data: { paidAmount: { decrement: payment.amount } },
    });

    const updated = await recomputePayrollTotals(tx, payrollId);

    await writeLedgerEntry(tx, {
      teacherId: payroll.teacherId,
      type: "SALARY_PAYMENT_DELETED",
      amount: payment.amount,
      description: `Payment of ${formatCurrency(payment.amount)} deleted — ${formatCurrency(updated.pendingAmount)} now pending`,
      refId: payrollId,
      createdBy: session?.username,
    });
  });

  revalidatePath(`/payroll/${payroll.teacherId}`);
  revalidatePath("/payroll");
  revalidatePath(`/salary-slips/${payrollId}`);
  revalidatePath("/salary-slips");
  revalidatePath("/payroll-reports");
  revalidatePath("/dashboard");
}
