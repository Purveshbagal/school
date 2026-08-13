"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { nextCertificateNo } from "@/lib/ids";

function readCertificateFields(formData: FormData) {
  const registerNumber = String(formData.get("registerNumber") || "").trim();
  const aadharNumber = String(formData.get("aadharNumber") || "").trim();
  const apaarId = String(formData.get("apaarId") || "").trim();
  const penId = String(formData.get("penId") || "").trim();
  const studentName = String(formData.get("studentName") || "").trim();
  const motherName = String(formData.get("motherName") || "").trim();
  const nationality = String(formData.get("nationality") || "").trim();
  const motherTongue = String(formData.get("motherTongue") || "").trim();
  const religion = String(formData.get("religion") || "").trim();
  const caste = String(formData.get("caste") || "").trim();
  const subCaste = String(formData.get("subCaste") || "").trim();
  const dob = formData.get("dob") ? new Date(String(formData.get("dob"))) : null;
  const dobWords = String(formData.get("dobWords") || "").trim();
  const birthPlace = String(formData.get("birthPlace") || "").trim();
  const lastSchoolAttended = String(formData.get("lastSchoolAttended") || "").trim();
  const admissionDate = formData.get("admissionDate")
    ? new Date(String(formData.get("admissionDate")))
    : null;
  const admissionStandard = String(formData.get("admissionStandard") || "").trim();
  const progress = String(formData.get("progress") || "").trim();
  const conduct = String(formData.get("conduct") || "").trim();
  const dateOfLeaving = formData.get("dateOfLeaving")
    ? new Date(String(formData.get("dateOfLeaving")))
    : new Date();
  const studyingStandard = String(formData.get("studyingStandard") || "").trim();
  const studyingSince = String(formData.get("studyingSince") || "").trim();
  const reasonForLeaving = String(formData.get("reasonForLeaving") || "").trim();
  const remarks = String(formData.get("remarks") || "").trim();
  const issueDate = formData.get("issueDate")
    ? new Date(String(formData.get("issueDate")))
    : new Date();

  return {
    registerNumber,
    aadharNumber,
    apaarId,
    penId,
    studentName,
    motherName,
    nationality,
    motherTongue,
    religion,
    caste,
    subCaste,
    dob,
    dobWords,
    birthPlace,
    lastSchoolAttended,
    admissionDate,
    admissionStandard,
    progress,
    conduct,
    dateOfLeaving,
    studyingStandard,
    studyingSince,
    reasonForLeaving,
    remarks,
    issueDate,
  };
}

export async function createLeavingCertificateAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const studentId = String(formData.get("studentId") || "");
  const fields = readCertificateFields(formData);

  if (!studentId || !fields.registerNumber || !fields.studentName) {
    return { error: "Student, register number and name are required" };
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return { error: "Student not found" };

  const certificateNo = await nextCertificateNo();

  const certificate = await prisma.leavingCertificate.create({
    data: {
      certificateNo,
      studentId,
      ...fields,
    },
  });

  await prisma.student.update({ where: { id: studentId }, data: { status: "INACTIVE" } });

  revalidatePath("/leaving-certificates");
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  redirect(`/leaving-certificates/${certificate.id}`);
}

export async function updateLeavingCertificateAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const id = String(formData.get("id") || "");
  const studentId = String(formData.get("studentId") || "");
  const fields = readCertificateFields(formData);

  if (!fields.registerNumber || !fields.studentName) {
    return { error: "Register number and name are required" };
  }

  await prisma.leavingCertificate.update({
    where: { id },
    data: fields,
  });

  revalidatePath("/leaving-certificates");
  revalidatePath(`/leaving-certificates/${id}`);
  revalidatePath(`/students/${studentId}`);
  redirect(`/leaving-certificates/${id}`);
}

export async function deleteLeavingCertificateAction(formData: FormData): Promise<never> {
  const id = String(formData.get("id"));
  const studentId = String(formData.get("studentId"));

  await prisma.leavingCertificate.delete({ where: { id } });
  await prisma.student.update({ where: { id: studentId }, data: { status: "ACTIVE" } });

  revalidatePath("/leaving-certificates");
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  redirect("/leaving-certificates");
}
