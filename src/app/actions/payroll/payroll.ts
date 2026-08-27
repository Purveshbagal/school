"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeLedgerEntry } from "@/lib/ledger";
import { generatePayrollForPeriod } from "@/lib/payroll-generate";
import { refundInstallmentsForPayroll } from "@/lib/advance-installments";

export async function generatePayrollAction(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const teacherId = String(formData.get("teacherId") || "");
  const month = Number(formData.get("month") || 0);
  const year = Number(formData.get("year") || 0);

  if (!teacherId || !month || !year) {
    return { error: "Please select a teacher, month and year" };
  }

  const session = await getSession();
  const result = await generatePayrollForPeriod(teacherId, month, year, session?.username);
  if (!result.ok) return { error: result.error };

  revalidatePath("/payroll");
  revalidatePath("/salary-slips");
  revalidatePath("/advance-payments");
  return { success: true };
}

export async function deletePayrollAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");

  const payroll = await prisma.payroll.findUnique({ where: { id } });
  if (!payroll || payroll.deletedAt || payroll.locked) return;

  const session = await getSession();

  await prisma.$transaction(async (tx) => {
    // Deleting the payroll undoes the whole thing, so any payments already recorded
    // against it are removed too.
    const payments = await tx.salaryPayment.findMany({ where: { payrollId: id, deletedAt: null } });
    for (const p of payments) {
      await tx.salaryPayment.update({ where: { id: p.id }, data: { deletedAt: new Date(), updatedBy: session?.username } });
    }

    // Give back whatever this payroll had applied against its due installments.
    await refundInstallmentsForPayroll(tx, id, session?.username);

    await tx.payroll.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: session?.username },
    });

    await writeLedgerEntry(tx, {
      teacherId: payroll.teacherId,
      type: "PAYROLL_DELETED",
      amount: payroll.netPayable,
      description: `Payroll for ${payroll.month}/${payroll.year} deleted`,
      refId: id,
      createdBy: session?.username,
    });
  });

  revalidatePath(`/payroll/${payroll.teacherId}`);
  revalidatePath("/payroll");
  revalidatePath("/salary-slips");
  revalidatePath("/advance-payments");
  revalidatePath(`/teachers/${payroll.teacherId}`);
  revalidatePath("/payroll-reports");
  revalidatePath("/dashboard");
}

export async function lockPayrollAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const id = String(formData.get("id") || "");
  const session = await getSession();

  const payroll = await prisma.payroll.findUnique({ where: { id } });
  if (!payroll) return { error: "Payroll not found" };

  await prisma.$transaction(async (tx) => {
    await tx.payroll.update({
      where: { id },
      data: { locked: true, lockedAt: new Date(), lockedBy: session?.username },
    });
    await writeLedgerEntry(tx, {
      teacherId: payroll.teacherId,
      type: "PAYROLL_LOCKED",
      description: `Payroll for ${payroll.month}/${payroll.year} locked`,
      refId: id,
      createdBy: session?.username,
    });
  });

  revalidatePath(`/payroll/${payroll.teacherId}`);
  revalidatePath("/payroll");
  return {};
}

export async function unlockPayrollAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const id = String(formData.get("id") || "");
  const session = await getSession();

  if (session?.role !== "admin") {
    return { error: "Only an admin can unlock a payroll." };
  }

  const payroll = await prisma.payroll.findUnique({ where: { id } });
  if (!payroll) return { error: "Payroll not found" };

  await prisma.$transaction(async (tx) => {
    await tx.payroll.update({
      where: { id },
      data: { locked: false, lockedAt: null, lockedBy: null },
    });
    await writeLedgerEntry(tx, {
      teacherId: payroll.teacherId,
      type: "PAYROLL_UNLOCKED",
      description: `Payroll for ${payroll.month}/${payroll.year} unlocked`,
      refId: id,
      createdBy: session?.username,
    });
  });

  revalidatePath(`/payroll/${payroll.teacherId}`);
  revalidatePath("/payroll");
  return {};
}
