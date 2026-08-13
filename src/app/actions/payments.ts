"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { nextReceiptNo } from "@/lib/ids";

export async function recordPaymentAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const studentId = String(formData.get("studentId"));
  const amount = Number(formData.get("amount") || 0);
  const mode = String(formData.get("mode") || "CASH");
  const remarks = String(formData.get("remarks") || "").trim();
  const paymentDate = formData.get("paymentDate")
    ? new Date(String(formData.get("paymentDate")))
    : new Date();

  if (!studentId || !amount || amount <= 0) {
    return { error: "Please enter a valid payment amount" };
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return { error: "Student not found" };

  const receiptNo = await nextReceiptNo();

  const payment = await prisma.feePayment.create({
    data: {
      receiptNo,
      studentId,
      amount,
      mode,
      remarks,
      paymentDate,
      academicYear: student.academicYear,
    },
  });

  revalidatePath(`/students/${studentId}`);
  redirect(`/receipts/${payment.id}`);
}

export async function updatePaymentAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const id = String(formData.get("id"));
  const studentId = String(formData.get("studentId"));
  const amount = Number(formData.get("amount") || 0);
  const mode = String(formData.get("mode") || "CASH");
  const remarks = String(formData.get("remarks") || "").trim();
  const paymentDate = formData.get("paymentDate")
    ? new Date(String(formData.get("paymentDate")))
    : new Date();

  if (!amount || amount <= 0) {
    return { error: "Please enter a valid payment amount" };
  }

  await prisma.feePayment.update({
    where: { id },
    data: { amount, mode, remarks, paymentDate },
  });

  revalidatePath("/payments");
  revalidatePath(`/students/${studentId}`);
  redirect("/payments");
}

export async function deletePaymentAction(formData: FormData) {
  const id = String(formData.get("id"));
  const studentId = String(formData.get("studentId"));
  await prisma.feePayment.delete({ where: { id } });
  revalidatePath("/payments");
  revalidatePath(`/students/${studentId}`);
}
