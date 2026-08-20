"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

function readCommonFields(formData: FormData) {
  const admissionNo = String(formData.get("admissionNo") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const standardId = String(formData.get("standardId") || "");
  const fatherName = String(formData.get("fatherName") || "").trim();
  const motherName = String(formData.get("motherName") || "").trim();
  const gender = String(formData.get("gender") || "").trim();
  const dob = formData.get("dob") ? new Date(String(formData.get("dob"))) : null;
  const birthPlace = String(formData.get("birthPlace") || "").trim();
  const aadharNumber = String(formData.get("aadharNumber") || "").trim();
  const penId = String(formData.get("penId") || "").trim();
  const apaarId = String(formData.get("apaarId") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const village = String(formData.get("village") || "").trim();
  const villageIdRaw = String(formData.get("villageId") || "").trim();
  const villageId = villageIdRaw || null;
  const taluka = String(formData.get("taluka") || "").trim();
  const district = String(formData.get("district") || "").trim();
  const motherTongue = String(formData.get("motherTongue") || "").trim();
  const religion = String(formData.get("religion") || "").trim();
  const caste = String(formData.get("caste") || "").trim();
  const subCaste = String(formData.get("subCaste") || "").trim();
  const medium = String(formData.get("medium") || "").trim();
  const board = String(formData.get("board") || "").trim();
  const schoolBus = String(formData.get("schoolBus") || "false") === "true";
  const admissionDate = formData.get("admissionDate")
    ? new Date(String(formData.get("admissionDate")))
    : new Date();
  const academicYear = String(formData.get("academicYear") || "").trim();
  const discount = Number(formData.get("discount") || 0);
  const customFeeRaw = String(formData.get("customFee") || "").trim();
  const customFee = customFeeRaw ? Number(customFeeRaw) : null;

  return {
    admissionNo,
    name,
    standardId,
    fatherName,
    motherName,
    gender,
    dob,
    birthPlace,
    aadharNumber,
    penId,
    apaarId,
    phone,
    address,
    village,
    villageId,
    taluka,
    district,
    motherTongue,
    religion,
    caste,
    subCaste,
    medium,
    board,
    schoolBus,
    admissionDate,
    academicYear,
    discount,
    customFee,
  };
}

/** Bus fee locked in at save time — later changes to the village's fee shouldn't
 * retroactively change what an already-saved student owes (only re-synced on "Switch Year"). */
async function currentVillageBusFee(villageId: string | null): Promise<number> {
  if (!villageId) return 0;
  const village = await prisma.village.findUnique({ where: { id: villageId }, select: { busFee: true } });
  return village?.busFee || 0;
}

export async function createStudentAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const fields = readCommonFields(formData);

  if (!fields.admissionNo || !fields.name || !fields.standardId || !fields.academicYear) {
    return { error: "Register number, name, standard and academic year are required" };
  }

  const busFeeSnapshot = await currentVillageBusFee(fields.villageId);

  let student;
  try {
    student = await prisma.student.create({ data: { ...fields, busFeeSnapshot } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "A student with this register number already exists" };
    }
    throw e;
  }

  revalidatePath("/students");
  redirect(`/students/${student.id}`);
}

export async function updateStudentAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const id = String(formData.get("id"));
  const fields = readCommonFields(formData);
  const status = String(formData.get("status") || "ACTIVE");

  if (!fields.admissionNo || !fields.name || !fields.standardId || !fields.academicYear) {
    return { error: "Register number, name, standard and academic year are required" };
  }

  const busFeeSnapshot = await currentVillageBusFee(fields.villageId);

  try {
    await prisma.student.update({
      where: { id },
      data: { ...fields, status, busFeeSnapshot },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "A student with this register number already exists" };
    }
    throw e;
  }

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  redirect(`/students/${id}`);
}

export async function deleteStudentAction(formData: FormData): Promise<never> {
  const id = String(formData.get("id"));

  await prisma.$transaction([
    prisma.feePayment.deleteMany({ where: { studentId: id } }),
    prisma.leavingCertificate.deleteMany({ where: { studentId: id } }),
    prisma.bonafideCertificate.deleteMany({ where: { studentId: id } }),
    prisma.stationarySale.deleteMany({ where: { studentId: id } }),
    prisma.marks.deleteMany({ where: { studentId: id } }),
    prisma.student.delete({ where: { id } }),
  ]);

  revalidatePath("/students");
  redirect("/students");
}
