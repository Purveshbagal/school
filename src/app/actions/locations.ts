"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

function duplicateError(e: unknown, message: string): { error: string } | never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    return { error: message };
  }
  throw e;
}

export async function addDistrictAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "District name is required" };

  try {
    await prisma.district.create({ data: { name } });
  } catch (e) {
    return duplicateError(e, "This district already exists");
  }

  revalidatePath("/settings");
  return {};
}

export async function deleteDistrictAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  await prisma.$transaction(async (tx) => {
    const talukas = await tx.taluka.findMany({ where: { districtId: id }, select: { id: true } });
    await tx.village.deleteMany({ where: { talukaId: { in: talukas.map((t) => t.id) } } });
    await tx.taluka.deleteMany({ where: { districtId: id } });
    await tx.district.delete({ where: { id } });
  });
  revalidatePath("/settings");
}

export async function addTalukaAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const districtId = String(formData.get("districtId") || "");
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Taluka name is required" };

  try {
    await prisma.taluka.create({ data: { name, districtId } });
  } catch (e) {
    return duplicateError(e, "This taluka already exists in the district");
  }

  revalidatePath("/settings");
  return {};
}

export async function deleteTalukaAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  await prisma.$transaction([
    prisma.village.deleteMany({ where: { talukaId: id } }),
    prisma.taluka.delete({ where: { id } }),
  ]);
  revalidatePath("/settings");
}

export async function addVillageAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const talukaId = String(formData.get("talukaId") || "");
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Village name is required" };

  try {
    await prisma.village.create({ data: { name, talukaId } });
  } catch (e) {
    return duplicateError(e, "This village already exists in the taluka");
  }

  revalidatePath("/settings");
  return {};
}

export async function deleteVillageAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  await prisma.village.delete({ where: { id } });
  revalidatePath("/settings");
}
