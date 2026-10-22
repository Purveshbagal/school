"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { SCHOOL_PHONE_NUMBER } from "@/lib/school-contact";

export async function updateSettingsAction(formData: FormData) {
  const name = String(formData.get("name") || "My School").trim();
  const address = String(formData.get("address") || "").trim();
  const udise = String(formData.get("udise") || "").trim();
  const phone = SCHOOL_PHONE_NUMBER;
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
