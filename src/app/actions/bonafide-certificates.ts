"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { nextBonafideCertificateNo } from "@/lib/ids";

function readCertificateFields(formData: FormData) {
  const registerNumber = String(formData.get("registerNumber") || "").trim();
  const studentName = String(formData.get("studentName") || "").trim();
  const gender = String(formData.get("gender") || "").trim();
  const standard = String(formData.get("standard") || "").trim();
  const division = String(formData.get("division") || "").trim();
  const academicYear = String(formData.get("academicYear") || "").trim();
  const motherName = String(formData.get("motherName") || "").trim();
  const caste = String(formData.get("caste") || "").trim();
  const dob = formData.get("dob") ? new Date(String(formData.get("dob"))) : null;
  const dobWords = String(formData.get("dobWords") || "").trim();
  const birthPlace = String(formData.get("birthPlace") || "").trim();
  const taluka = String(formData.get("taluka") || "").trim();
  const district = String(formData.get("district") || "").trim();
  const issueDate = formData.get("issueDate")
    ? new Date(String(formData.get("issueDate")))
    : new Date();

  return {
    registerNumber,
    studentName,
    gender,
    standard,
    division,
    academicYear,
    motherName,
    caste,
    dob,
    dobWords,
    birthPlace,
    taluka,
    district,
    issueDate,
  };
}

export async function createBonafideCertificateAction(
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

  const certificateNo = await nextBonafideCertificateNo();

  const certificate = await prisma.bonafideCertificate.create({
    data: {
      certificateNo,
      studentId,
      ...fields,
    },
  });

  revalidatePath("/bonafide-certificates");
  redirect(`/bonafide-certificates/${certificate.id}`);
}

export async function updateBonafideCertificateAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const id = String(formData.get("id") || "");
  const fields = readCertificateFields(formData);

  if (!fields.registerNumber || !fields.studentName) {
    return { error: "Register number and name are required" };
  }

  await prisma.bonafideCertificate.update({
    where: { id },
    data: fields,
  });

  revalidatePath("/bonafide-certificates");
  revalidatePath(`/bonafide-certificates/${id}`);
  redirect(`/bonafide-certificates/${id}`);
}

export async function deleteBonafideCertificateAction(formData: FormData): Promise<never> {
  const id = String(formData.get("id"));

  await prisma.bonafideCertificate.delete({ where: { id } });

  revalidatePath("/bonafide-certificates");
  redirect("/bonafide-certificates");
}
