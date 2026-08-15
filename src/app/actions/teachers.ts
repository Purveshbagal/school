"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { nextEmployeeNo } from "@/lib/ids";
import { writeLedgerEntry } from "@/lib/ledger";

export async function createTeacherAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const name = String(formData.get("name") || "").trim();
  const designation = String(formData.get("designation") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const monthlySalary = Number(formData.get("monthlySalary") || 0);
  const joiningDate = formData.get("joiningDate")
    ? new Date(String(formData.get("joiningDate")))
    : new Date();

  if (!name || monthlySalary <= 0) {
    return { error: "Name and a valid monthly salary are required" };
  }

  const employeeNo = await nextEmployeeNo();
  const session = await getSession();

  const teacher = await prisma.$transaction(async (tx) => {
    const created = await tx.teacher.create({
      data: { employeeNo, name, designation, phone, email, address, monthlySalary, joiningDate },
    });

    // Payroll module: every teacher gets an active salary structure from day one,
    // effective their joining date, so payroll can be generated for their first month.
    await tx.salaryStructure.create({
      data: {
        teacherId: created.id,
        monthlySalary,
        effectiveFrom: joiningDate,
        calculationType: "MONTHLY",
        status: "ACTIVE",
        deletedAt: null,
        createdBy: session?.username,
      },
    });

    await writeLedgerEntry(tx, {
      teacherId: created.id,
      type: "SALARY_STRUCTURE_ASSIGNED",
      amount: monthlySalary,
      description: `Salary structure assigned: ₹${monthlySalary}/month, effective ${joiningDate.toDateString()}`,
      createdBy: session?.username,
    });

    return created;
  });

  revalidatePath("/teachers");
  redirect(`/teachers/${teacher.id}`);
}

export async function updateTeacherAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const designation = String(formData.get("designation") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const status = String(formData.get("status") || "ACTIVE");

  if (!name) {
    return { error: "Name is required" };
  }

  // monthlySalary is intentionally not editable here — salary changes go through
  // the Salary Structure revision flow (/salary-structure/[id]/revise) so every
  // change is recorded in SalaryRevision history.
  await prisma.teacher.update({
    where: { id },
    data: { name, designation, phone, email, address, status },
  });

  revalidatePath("/teachers");
  revalidatePath(`/teachers/${id}`);
  redirect(`/teachers/${id}`);
}

export async function deleteTeacherAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));

  // Deleting a teacher permanently erases their entire payroll trail — payroll runs
  // (and each run's bonuses/deductions), salary payments, advances, attendance,
  // salary structure/revisions, and ledger history. There is no "detach and keep
  // history" option; this is intentionally destructive by admin choice.
  await prisma.$transaction([
    // Legacy pre-payroll-redesign data — hard deleted as before, no longer read anywhere.
    prisma.teacherAdvance.deleteMany({ where: { teacherId: id } }),
    prisma.salarySlip.deleteMany({ where: { teacherId: id } }),
    // SalaryPayment references Payroll without cascade, so it must go before Payroll.
    prisma.salaryPayment.deleteMany({ where: { teacherId: id } }),
    // Payroll's Bonus/SalaryDeduction rows cascade automatically (onDelete: Cascade).
    prisma.payroll.deleteMany({ where: { teacherId: id } }),
    prisma.advancePayment.deleteMany({ where: { teacherId: id } }),
    prisma.attendanceSummary.deleteMany({ where: { teacherId: id } }),
    prisma.salaryRevision.deleteMany({ where: { teacherId: id } }),
    prisma.salaryStructure.deleteMany({ where: { teacherId: id } }),
    prisma.salaryLedger.deleteMany({ where: { teacherId: id } }),
    prisma.teacher.delete({ where: { id } }),
  ]);

  revalidatePath("/teachers");
  redirect("/teachers");
}
