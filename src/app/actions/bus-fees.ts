"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function updateVillageBusFeeAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const villageId = String(formData.get("villageId") || "");
  const busFee = Number(formData.get("busFee") || 0);

  if (!villageId) return { error: "Village not found" };
  if (busFee < 0) return { error: "Bus fee cannot be negative" };

  await prisma.village.update({ where: { id: villageId }, data: { busFee } });

  revalidatePath("/buses/village-fees");
  revalidatePath("/students/new");
  revalidatePath("/pending-fees");
  return {};
}
