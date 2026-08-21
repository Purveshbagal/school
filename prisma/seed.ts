import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

const STANDARDS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];
const ACADEMIC_YEAR = "2026-27";

async function main() {
  await prisma.schoolSettings.upsert({
    where: { id: "main" },
    update: {},
    create: {
      id: "main",
      name: "Little Star English School, Devtkali",
      address: "Devtakali, Tal. Shevgaon, Dist. Ahilyanagar",
      udise: "27261102906",
      phone: "9876543210",
      principalName: "Principal",
      academicYear: ACADEMIC_YEAR,
    },
  });

  for (let i = 0; i < STANDARDS.length; i++) {
    const standard = await prisma.standard.upsert({
      where: { name: STANDARDS[i] },
      update: {},
      create: { name: STANDARDS[i], order: i + 1 },
    });

    const existingFee = await prisma.feeStructure.findUnique({
      where: { standardId_academicYear: { standardId: standard.id, academicYear: ACADEMIC_YEAR } },
    });
    if (!existingFee) {
      const tuition = 6000 + i * 500;
      await prisma.feeStructure.create({
        data: {
          standardId: standard.id,
          academicYear: ACADEMIC_YEAR,
          totalAmount: tuition + 800 + 500,
          components: {
            create: [
              { name: "Tuition Fee", amount: tuition },
              { name: "Exam Fee", amount: 800 },
              { name: "Activity Fee", amount: 500 },
            ],
          },
        },
      });
    }
  }

  const standard5 = await prisma.standard.findUnique({ where: { name: "5th" } });
  if (standard5) {
    const existingStudent = await prisma.student.findFirst({
      where: { name: "Aarav Sharma" },
    });
    if (!existingStudent) {
      const student = await prisma.student.create({
        data: {
          admissionNo: "ADM20260001",
          name: "Aarav Sharma",
          fatherName: "Rajesh Sharma",
          motherName: "Sunita Sharma",
          gender: "Male",
          dob: new Date("2015-06-12"),
          phone: "9876500001",
          address: "Devtakali",
          standardId: standard5.id,
          academicYear: ACADEMIC_YEAR,
          admissionDate: new Date("2026-06-01"),
        },
      });

      await prisma.feePayment.create({
        data: {
          receiptNo: "FEE-2026-00001",
          studentId: student.id,
          amount: 4000,
          mode: "CASH",
          remarks: "Term 1 fee",
          paymentDate: new Date("2026-06-15"),
          academicYear: ACADEMIC_YEAR,
        },
      });
    }
  }

  const existingTeacher = await prisma.teacher.findFirst({
    where: { name: "Komal Kishor Khandagale" },
  });
  if (!existingTeacher) {
    const teacher = await prisma.teacher.create({
      data: {
        employeeNo: "EMP2026001",
        name: "Komal Kishor Khandagale",
        designation: "Teacher",
        phone: "9876500099",
        monthlySalary: 8500,
        joiningDate: new Date("2025-06-01"),
      },
    });

    await prisma.teacherAdvance.create({
      data: {
        teacherId: teacher.id,
        amount: 4880,
        date: new Date("2026-06-05"),
        note: "Book & dress advance",
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
