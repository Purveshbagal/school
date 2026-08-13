import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
const prisma = new PrismaClient();

const student = await prisma.student.findFirst({ where: { name: "Aarav Sharma" } });
const teacher = await prisma.teacher.findFirst({ where: { name: "Komal Kishor Khandagale" } });

const payment = await prisma.feePayment.create({
  data: {
    receiptNo: "FEE-2026-TEST01",
    studentId: student.id,
    amount: 1500,
    mode: "ONLINE",
    remarks: "Test payment",
    paymentDate: new Date(),
    academicYear: student.academicYear,
  },
});

const slip = await prisma.salarySlip.create({
  data: {
    invoiceNo: "SAL-2026-TEST01",
    teacherId: teacher.id,
    month: 6,
    year: 2026,
    workingHours: "9.00 am to 2.30 pm",
    monthlySalary: teacher.monthlySalary,
    totalDays: 15,
    absentDays: 0,
    halfDays: 0,
    latePunch: 0,
    earlyLogout: 0,
    leaveDays: 2,
    otherDeduction: 0,
    netPayment: 3683.33,
    advanceGiven: 0,
    lastMonthPending: 2375,
    subTotal: 6058.33,
    advanceDeduction: 4880,
    total: 1178.33,
    paidAmount: 0,
    balance: 1178.33,
  },
});

console.log("PAYMENT_ID=" + payment.id);
console.log("SLIP_ID=" + slip.id);
console.log("STUDENT_ID=" + student.id);
console.log("TEACHER_ID=" + teacher.id);
await prisma.$disconnect();
