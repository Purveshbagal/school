"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export async function createSubjectAction(formData: FormData): Promise<void> {
  const standardId = String(formData.get("standardId") || "");
  const name = String(formData.get("name") || "").trim();
  if (!standardId || !name) return;

  const existing = await prisma.subject.findUnique({
    where: { standardId_name: { standardId, name } },
  });
  if (existing) return;

  await prisma.subject.create({ data: { standardId, name } });
  revalidatePath(`/subjects/${standardId}`);
}

export async function updateSubjectAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const id = String(formData.get("id"));
  const standardId = String(formData.get("standardId"));
  const name = String(formData.get("name") || "").trim();

  if (!name) {
    return { error: "Subject name is required" };
  }

  await prisma.subject.update({ where: { id }, data: { name } });

  revalidatePath(`/subjects/${standardId}`);
  redirect(`/subjects/${standardId}`);
}

export async function deleteSubjectAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const standardId = String(formData.get("standardId"));

  const marksCount = await prisma.marks.count({ where: { subjectId: id } });
  if (marksCount > 0) return;

  await prisma.subject.delete({ where: { id } });
  revalidatePath(`/subjects/${standardId}`);
}
