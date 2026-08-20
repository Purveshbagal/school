import { prisma } from "@/lib/db";

export async function getStudentFeeSummary(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      standard: true,
      payments: { orderBy: { paymentDate: "desc" } },
    },
  });
  if (!student) return null;

  const feeStructure = await prisma.feeStructure.findUnique({
    where: {
      standardId_academicYear: {
        standardId: student.standardId,
        academicYear: student.academicYear,
      },
    },
    include: { components: true },
  });

  const baseFee = student.customFee ?? feeStructure?.totalAmount ?? 0;
  const standardFee = Math.max(0, baseFee - (student.discount || 0));
  const busFee = student.schoolBus ? student.busFeeSnapshot || 0 : 0;
  const openingBalance = student.openingBalance || 0;
  const totalFee = standardFee + busFee + openingBalance;
  // Only count payments made in the student's *current* academic year — anything paid
  // in a prior year is already netted into openingBalance at the last "Switch Year", so
  // counting it again here would double-subtract it.
  const totalPaid = student.payments
    .filter((p) => p.academicYear === student.academicYear)
    .reduce((sum, p) => sum + p.amount, 0);
  const balance = totalFee - totalPaid;

  return {
    student,
    feeStructure,
    standardFee,
    busFee,
    openingBalance,
    totalFee,
    totalPaid,
    balance, // positive = due, negative = advance
    due: Math.max(0, balance),
    advance: Math.max(0, -balance),
  };
}

async function computePendingByStudent() {
  const [students, feeStructures] = await Promise.all([
    prisma.student.findMany({
      where: { status: "ACTIVE" },
      include: { payments: true, standard: true },
    }),
    prisma.feeStructure.findMany(),
  ]);

  const feeStructureMap = new Map(
    feeStructures.map((fs) => [`${fs.standardId}_${fs.academicYear}`, fs.totalAmount])
  );

  const pendingByStudent = students.map((student) => {
    const baseFee =
      student.customFee ?? feeStructureMap.get(`${student.standardId}_${student.academicYear}`) ?? 0;
    const standardFee = Math.max(0, baseFee - (student.discount || 0));
    const busFee = student.schoolBus ? student.busFeeSnapshot || 0 : 0;
    const openingBalance = student.openingBalance || 0;
    const totalFee = openingBalance + standardFee + busFee;
    // Same year-scoping as getStudentFeeSummary — see comment there.
    const totalPaid = student.payments
      .filter((p) => p.academicYear === student.academicYear)
      .reduce((sum, p) => sum + p.amount, 0);
    const due = Math.max(0, totalFee - totalPaid);
    // Apportion the paid amount across the three components, oldest debt
    // (carried-forward opening balance) first, then standard fee, then bus fee,
    // so all three are shown separately as requested.
    const openingPaid = Math.min(totalPaid, openingBalance);
    const standardPaid = Math.max(0, Math.min(totalPaid - openingBalance, standardFee));
    const busPaid = Math.max(0, Math.min(totalPaid - openingBalance - standardFee, busFee));
    const openingDue = Math.max(0, openingBalance - openingPaid);
    const standardDue = Math.max(0, standardFee - standardPaid);
    const busDue = Math.max(0, busFee - busPaid);
    return { student, due, openingDue, standardDue, busDue };
  });

  return pendingByStudent;
}

export async function getPendingFeesReport() {
  const [standards, pendingByStudent] = await Promise.all([
    prisma.standard.findMany({ orderBy: { order: "asc" } }),
    computePendingByStudent(),
  ]);

  const grandTotal = pendingByStudent.reduce((sum, p) => sum + p.due, 0);
  const grandTotalOpening = pendingByStudent.reduce((sum, p) => sum + p.openingDue, 0);
  const grandTotalStandard = pendingByStudent.reduce((sum, p) => sum + p.standardDue, 0);
  const grandTotalBus = pendingByStudent.reduce((sum, p) => sum + p.busDue, 0);

  const groups = standards.map((standard) => {
    const inStandard = pendingByStudent.filter((p) => p.student.standardId === standard.id);
    const pendingStudents = inStandard
      .filter((p) => p.due > 0)
      .map((p) => ({
        id: p.student.id,
        name: p.student.name,
        admissionNo: p.student.admissionNo,
        due: p.due,
        openingDue: p.openingDue,
        standardDue: p.standardDue,
        busDue: p.busDue,
      }))
      .sort((a, b) => b.due - a.due);
    const totalDue = inStandard.reduce((sum, p) => sum + p.due, 0);
    return { standard, totalDue, students: pendingStudents };
  });

  return { grandTotal, grandTotalOpening, grandTotalStandard, grandTotalBus, groups };
}

/** Flat, highest-due-first list of active students who still owe fees — used as the
 * default shortlist on the "Payment In" search screen before the admin types anything. */
export async function getPendingFeesStudents(limit = 25) {
  const pendingByStudent = await computePendingByStudent();
  return pendingByStudent
    .filter((p) => p.due > 0)
    .sort((a, b) => b.due - a.due)
    .slice(0, limit)
    .map((p) => ({
      id: p.student.id,
      name: p.student.name,
      admissionNo: p.student.admissionNo,
      standardName: p.student.standard.name,
      fatherName: p.student.fatherName,
      due: p.due,
    }));
}
