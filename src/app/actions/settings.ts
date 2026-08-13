"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function updateSettingsAction(formData: FormData) {
  const name = String(formData.get("name") || "My School").trim();
  const address = String(formData.get("address") || "").trim();
  const udise = String(formData.get("udise") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const principalName = String(formData.get("principalName") || "").trim();
  const academicYear = String(formData.get("academicYear") || "2026-27").trim();

  await prisma.schoolSettings.upsert({
    where: { id: "main" },
    update: { name, address, udise, phone, email, principalName, academicYear },
    create: {
      id: "main",
      name,
      address,
      udise,
      phone,
      email,
      principalName,
      academicYear,
    },
  });

  revalidatePath("/", "layout");
}
