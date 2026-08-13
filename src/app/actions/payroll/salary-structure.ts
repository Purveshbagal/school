"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeLedgerEntry } from "@/lib/ledger";
import { getActiveSalaryStructure } from "@/lib/payroll-data";

export async function reviseSalaryAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const teacherId = String(formData.get("teacherId") || "");
  const newSalary = Number(formData.get("newSalary") || 0);
  const effectiveFrom = formData.get("effectiveFrom")
    ? new Date(String(formData.get("effectiveFrom")))
    : new Date();
  const calculationType = String(formData.get("calculationType") || "MONTHLY");
  const reason = String(formData.get("reason") || "").trim();

  if (!teacherId || newSalary <= 0) {
    return { error: "Please enter a valid new salary" };
  }

  const session = await getSession();
  const current = await getActiveSalaryStructure(teacherId);

  await prisma.$transaction(async (tx) => {
    if (current) {
      await tx.salaryStructure.update({
        where: { id: current.id },
        data: { status: "SUPERSEDED", updatedBy: session?.username },
      });
    }

    await tx.salaryStructure.create({
      data: {
        teacherId,
        monthlySalary: newSalary,
        effectiveFrom,
        calculationType,
        status: "ACTIVE",
        deletedAt: null,
        createdBy: session?.username,
      },
    });

    await tx.salaryRevision.create({
      data: {
        teacherId,
        oldSalary: current?.monthlySalary || 0,
        newSalary,
        effectiveFrom,
        reason: reason || undefined,
        deletedAt: null,
        createdBy: session?.username,
      },
    });

    await writeLedgerEntry(tx, {
      teacherId,
      type: "SALARY_REVISED",
      amount: newSalary,
      description: current
        ? `Salary revised from ₹${current.monthlySalary} to ₹${newSalary}, effective ${effectiveFrom.toDateString()}`
        : `Salary structure assigned: ₹${newSalary}, effective ${effectiveFrom.toDateString()}`,
      createdBy: session?.username,
    });
  });

  revalidatePath("/salary-structure");
  revalidatePath(`/salary-structure/${teacherId}`);
  revalidatePath(`/payroll/${teacherId}`);
  redirect(`/salary-structure/${teacherId}`);
}
