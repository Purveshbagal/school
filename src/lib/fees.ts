import { prisma } from "@/lib/db";

export async function getStudentFeeSummary(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      standard: true,
      payments: { orderBy: { paymentDate: "desc" } },
      villageRef: true,
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
  const busFee = student.schoolBus ? student.villageRef?.busFee || 0 : 0;
  const totalFee = standardFee + busFee;
  const totalPaid = student.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = totalFee - totalPaid;

  return {
    student,
    feeStructure,
    standardFee,
    busFee,
    totalFee,
    totalPaid,
    balance, // positive = due, negative = advance
    due: Math.max(0, balance),
    advance: Math.max(0, -balance),
  };
}

export async function getPendingFeesReport() {
  const [standards, students, feeStructures, villages] = await Promise.all([
    prisma.standard.findMany({ orderBy: { order: "asc" } }),
    prisma.student.findMany({
      where: { status: "ACTIVE" },
      include: { payments: true },
    }),
    prisma.feeStructure.findMany(),
    prisma.village.findMany({ select: { id: true, busFee: true } }),
  ]);

  const feeStructureMap = new Map(
    feeStructures.map((fs) => [`${fs.standardId}_${fs.academicYear}`, fs.totalAmount])
  );
  const villageBusFeeMap = new Map(villages.map((v) => [v.id, v.busFee]));

  const pendingByStudent = students.map((student) => {
    const baseFee =
      student.customFee ?? feeStructureMap.get(`${student.standardId}_${student.academicYear}`) ?? 0;
    const standardFee = Math.max(0, baseFee - (student.discount || 0));
    const busFee = student.schoolBus ? (student.villageId && villageBusFeeMap.get(student.villageId)) || 0 : 0;
    const totalFee = standardFee + busFee;
    const totalPaid = student.payments.reduce((sum, p) => sum + p.amount, 0);
    const due = Math.max(0, totalFee - totalPaid);
    // Apportion the paid amount and due amount across the two components,
    // standard fee first, so both are shown separately as requested.
    const standardPaid = Math.min(totalPaid, standardFee);
    const busPaid = Math.max(0, Math.min(totalPaid - standardFee, busFee));
    const standardDue = Math.max(0, standardFee - standardPaid);
    const busDue = Math.max(0, busFee - busPaid);
    return { student, due, standardDue, busDue };
  });

  const grandTotal = pendingByStudent.reduce((sum, p) => sum + p.due, 0);
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
        standardDue: p.standardDue,
        busDue: p.busDue,
      }))
      .sort((a, b) => b.due - a.due);
    const totalDue = inStandard.reduce((sum, p) => sum + p.due, 0);
    return { standard, totalDue, students: pendingStudents };
  });

  return { grandTotal, grandTotalStandard, grandTotalBus, groups };
}
