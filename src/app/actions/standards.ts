"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function createStandardAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") || "").trim();
  const order = Number(formData.get("order") || 0);
  if (!name) return;

  const existing = await prisma.standard.findUnique({ where: { name } });
  if (existing) return;

  await prisma.standard.create({ data: { name, order } });
  revalidatePath("/standards");
}

export async function updateStandardPromotionAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const board = String(formData.get("board") || "").trim();
  const promotesToId = String(formData.get("promotesToId") || "").trim();

  await prisma.standard.update({
    where: { id },
    data: {
      board: board || null,
      promotesToId: promotesToId || null,
    },
  });

  revalidatePath("/standards");
  revalidatePath(`/standards/${id}`);
}

export async function deleteStandardAction(formData: FormData): Promise<{ error?: string } | void> {
  const id = String(formData.get("id"));
  const studentCount = await prisma.student.count({ where: { standardId: id } });
  if (studentCount > 0) return { error: "Cannot delete a standard that has students." };

  const subjects = await prisma.subject.findMany({ where: { standardId: id }, select: { id: true } });
  const marksCount = subjects.length
    ? await prisma.marks.count({ where: { subjectId: { in: subjects.map((s) => s.id) } } })
    : 0;
  if (marksCount > 0) return { error: "Cannot delete a standard that has recorded marks." };

  await prisma.$transaction([
    prisma.standard.updateMany({ where: { promotesToId: id }, data: { promotesToId: null } }),
    prisma.feeComponent.deleteMany({ where: { feeStructure: { standardId: id } } }),
    prisma.feeStructure.deleteMany({ where: { standardId: id } }),
    prisma.subject.deleteMany({ where: { standardId: id } }),
    prisma.standard.delete({ where: { id } }),
  ]);

  revalidatePath("/standards");
}

export async function saveFeeStructureAction(formData: FormData) {
  const standardId = String(formData.get("standardId"));
  const academicYear = String(formData.get("academicYear"));
  const componentsJson = String(formData.get("components") || "[]");

  let components: { name: string; amount: number }[] = [];
  try {
    components = JSON.parse(componentsJson);
  } catch {
    components = [];
  }
  components = components.filter((c) => c.name?.trim() && c.amount >= 0);
  const totalAmount = components.reduce((sum, c) => sum + Number(c.amount || 0), 0);

  const existing = await prisma.feeStructure.findUnique({
    where: { standardId_academicYear: { standardId, academicYear } },
  });

  if (existing) {
    await prisma.feeComponent.deleteMany({ where: { feeStructureId: existing.id } });
    await prisma.feeStructure.update({
      where: { id: existing.id },
      data: {
        totalAmount,
        components: { create: components.map((c) => ({ name: c.name, amount: c.amount })) },
      },
    });
  } else {
    await prisma.feeStructure.create({
      data: {
        standardId,
        academicYear,
        totalAmount,
        components: { create: components.map((c) => ({ name: c.name, amount: c.amount })) },
      },
    });
  }

  revalidatePath("/standards");
}
