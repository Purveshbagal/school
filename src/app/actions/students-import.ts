"use server";

import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { STUDENT_IMPORT_COLUMNS } from "@/lib/students-excel";

type ImportRowError = { row: number; message: string };

export type ImportStudentsResult = {
  error?: string;
  created?: number;
  updated?: number;
  errors?: ImportRowError[];
};

const headerToKey = new Map(STUDENT_IMPORT_COLUMNS.map((c) => [c.header, c.key]));

function cellToText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function cellToDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value;
  const parsed = new Date(String(value).trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function cellToNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function importStudentsAction(
  _prevState: ImportStudentsResult | undefined,
  formData: FormData
): Promise<ImportStudentsResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose an Excel file to import" };
  }

  let rows: Record<string, unknown>[];
  try {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  } catch {
    return { error: "Could not read this file. Please upload a valid .xlsx or .csv file." };
  }

  if (rows.length === 0) {
    return { error: "The file has no data rows" };
  }

  const [standards, villages] = await Promise.all([
    prisma.standard.findMany(),
    prisma.village.findMany({
      include: { taluka: { include: { district: true } } },
    }),
  ]);

  const standardByName = new Map(standards.map((s) => [s.name.trim().toLowerCase(), s.id]));

  const villageByCombo = new Map(
    villages.map((v) => [
      `${v.taluka.district.name}|${v.taluka.name}|${v.name}`.trim().toLowerCase(),
      v,
    ])
  );
  const villageByNameOnly = new Map<string, typeof villages>();
  for (const v of villages) {
    const key = v.name.trim().toLowerCase();
    villageByNameOnly.set(key, [...(villageByNameOnly.get(key) || []), v]);
  }

  const errors: ImportRowError[] = [];
  let created = 0;
  let updated = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // account for header row, 1-indexed
    const raw = rows[i];

    // Map by header text -> field key, tolerant of exported column order.
    const values: Record<string, unknown> = {};
    for (const [header, key] of headerToKey) values[key] = raw[header];

    const admissionNo = cellToText(values.admissionNo);
    const name = cellToText(values.name);
    const standardName = cellToText(values.standardName);
    const academicYear = cellToText(values.academicYear);

    if (!admissionNo || !name || !standardName || !academicYear) {
      errors.push({
        row: rowNum,
        message: "Register Number, Name, Standard and Academic Year are required",
      });
      continue;
    }

    const standardId = standardByName.get(standardName.trim().toLowerCase());
    if (!standardId) {
      errors.push({ row: rowNum, message: `Unknown Standard "${standardName}"` });
      continue;
    }

    const district = cellToText(values.district);
    const taluka = cellToText(values.taluka);
    const village = cellToText(values.village);
    let villageId: string | null = null;
    let busFeeSnapshot = 0;
    if (village) {
      const comboMatch = villageByCombo.get(`${district}|${taluka}|${village}`.trim().toLowerCase());
      if (comboMatch) {
        villageId = comboMatch.id;
        busFeeSnapshot = comboMatch.busFee || 0;
      } else {
        const nameMatches = villageByNameOnly.get(village.trim().toLowerCase());
        if (nameMatches?.length === 1) {
          villageId = nameMatches[0].id;
          busFeeSnapshot = nameMatches[0].busFee || 0;
        }
      }
    }

    const schoolBusText = cellToText(values.schoolBus).toLowerCase();
    const schoolBus = schoolBusText === "yes" || schoolBusText === "true" || schoolBusText === "1";

    const statusText = cellToText(values.status).toUpperCase();
    const status = statusText === "INACTIVE" ? "INACTIVE" : "ACTIVE";

    const data = {
      admissionNo,
      name,
      standardId,
      academicYear,
      fatherName: cellToText(values.fatherName) || null,
      motherName: cellToText(values.motherName) || null,
      gender: cellToText(values.gender) || null,
      dob: cellToDate(values.dob),
      birthPlace: cellToText(values.birthPlace) || null,
      aadharNumber: cellToText(values.aadharNumber) || null,
      penId: cellToText(values.penId) || null,
      apaarId: cellToText(values.apaarId) || null,
      phone: cellToText(values.phone) || null,
      address: cellToText(values.address) || null,
      district: district || null,
      taluka: taluka || null,
      village: village || null,
      villageId,
      busFeeSnapshot,
      motherTongue: cellToText(values.motherTongue) || null,
      religion: cellToText(values.religion) || null,
      caste: cellToText(values.caste) || null,
      subCaste: cellToText(values.subCaste) || null,
      medium: cellToText(values.medium) || null,
      board: cellToText(values.board) || null,
      schoolBus,
      admissionDate: cellToDate(values.admissionDate) ?? new Date(),
      status,
      customFee: cellToNumber(values.customFee),
      discount: cellToNumber(values.discount) ?? 0,
    };

    try {
      const existing = await prisma.student.findUnique({ where: { admissionNo } });
      await prisma.student.upsert({
        where: { admissionNo },
        update: data,
        create: data,
      });
      if (existing) updated++;
      else created++;
    } catch {
      errors.push({ row: rowNum, message: `Could not save "${name}" (${admissionNo})` });
    }
  }

  revalidatePath("/students");
  return { created, updated, errors };
}
