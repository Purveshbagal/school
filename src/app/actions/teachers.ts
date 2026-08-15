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

  // Every teacher gets an auto-assigned SalaryStructure + a "SALARY_STRUCTURE_ASSIGNED"
  // ledger entry at creation time (see createTeacherAction) — those don't represent real
  // payroll activity, so they're excluded here and cleaned up below instead of blocking
  // deletion. Only actual activity (attendance, generated payroll, payments, advances,
  // salary revisions) blocks deletion; admins should set status to Inactive instead.
  const [salaryRevisions, advances, attendance, payrolls, salaryPayments, salaryLedgers] = await Promise.all([
    prisma.salaryRevision.count({ where: { teacherId: id } }),
    prisma.advancePayment.count({ where: { teacherId: id } }),
    prisma.attendanceSummary.count({ where: { teacherId: id } }),
    prisma.payroll.count({ where: { teacherId: id } }),
    prisma.salaryPayment.count({ where: { teacherId: id } }),
    prisma.salaryLedger.count({ where: { teacherId: id, type: { not: "SALARY_STRUCTURE_ASSIGNED" } } }),
  ]);
  const hasPayrollHistory =
    salaryRevisions + advances + attendance + payrolls + salaryPayments + salaryLedgers > 0;
  if (hasPayrollHistory) return;

  await prisma.$transaction([
    // Legacy pre-payroll-redesign data — hard deleted as before, no longer read anywhere.
    prisma.teacherAdvance.deleteMany({ where: { teacherId: id } }),
    prisma.salarySlip.deleteMany({ where: { teacherId: id } }),
    // Auto-created at teacher creation, no real activity attached — safe to clean up.
    prisma.salaryStructure.deleteMany({ where: { teacherId: id } }),
    prisma.salaryLedger.deleteMany({ where: { teacherId: id } }),
    prisma.teacher.delete({ where: { id } }),
  ]);

  revalidatePath("/teachers");
  redirect("/teachers");
}
