import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { buildStudentsWhere } from "@/lib/students-query";
import {
  STUDENT_IMPORT_COLUMNS,
  STUDENT_EXPORT_ONLY_COLUMNS,
} from "@/lib/students-excel";
import { formatDateInput } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const where = buildStudentsWhere({
    q: params.get("q") || undefined,
    standard: params.get("standard") || undefined,
    village: params.get("village") || undefined,
    status: params.get("status") || undefined,
    board: params.get("board") || undefined,
  });

  const [students, feeStructures, villages] = await Promise.all([
    prisma.student.findMany({
      where,
      include: { standard: true, payments: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.feeStructure.findMany(),
    prisma.village.findMany({ select: { id: true, busFee: true } }),
  ]);

  const feeStructureMap = new Map(
    feeStructures.map((fs) => [`${fs.standardId}_${fs.academicYear}`, fs.totalAmount])
  );
  const villageBusFeeMap = new Map(villages.map((v) => [v.id, v.busFee]));

  const rows = students.map((s) => {
    const baseFee =
      s.customFee ?? feeStructureMap.get(`${s.standardId}_${s.academicYear}`) ?? 0;
    const standardFee = Math.max(0, baseFee - (s.discount || 0));
    const busFee = s.schoolBus ? (s.villageId && villageBusFeeMap.get(s.villageId)) || 0 : 0;
    const totalFee = standardFee + busFee;
    const totalPaid = s.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = totalFee - totalPaid;

    const values: Record<string, string | number> = {
      admissionNo: s.admissionNo,
      name: s.name,
      standardName: s.standard.name,
      academicYear: s.academicYear,
      fatherName: s.fatherName || "",
      motherName: s.motherName || "",
      gender: s.gender || "",
      dob: formatDateInput(s.dob),
      birthPlace: s.birthPlace || "",
      aadharNumber: s.aadharNumber || "",
      penId: s.penId || "",
      apaarId: s.apaarId || "",
      phone: s.phone || "",
      address: s.address || "",
      district: s.district || "",
      taluka: s.taluka || "",
      village: s.village || "",
      motherTongue: s.motherTongue || "",
      religion: s.religion || "",
      caste: s.caste || "",
      subCaste: s.subCaste || "",
      medium: s.medium || "",
      board: s.board || "",
      schoolBus: s.schoolBus ? "Yes" : "No",
      admissionDate: formatDateInput(s.admissionDate),
      status: s.status,
      customFee: s.customFee ?? "",
      discount: s.discount || 0,
      totalFee,
      totalPaid,
      pendingFees: Math.max(0, balance),
      advance: Math.max(0, -balance),
    };

    const row: Record<string, string | number> = {};
    for (const col of STUDENT_IMPORT_COLUMNS) row[col.header] = values[col.key];
    for (const col of STUDENT_EXPORT_ONLY_COLUMNS) row[col.header] = values[col.key];
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: [
      ...STUDENT_IMPORT_COLUMNS.map((c) => c.header),
      ...STUDENT_EXPORT_ONLY_COLUMNS.map((c) => c.header),
    ],
  });
  worksheet["!cols"] = [
    ...STUDENT_IMPORT_COLUMNS.map(() => ({ wch: 18 })),
    ...STUDENT_EXPORT_ONLY_COLUMNS.map(() => ({ wch: 14 })),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const filename = `students-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
