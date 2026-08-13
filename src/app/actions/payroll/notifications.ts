"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  await prisma.notification.update({ where: { id }, data: { read: true } });
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  await prisma.notification.updateMany({ where: { read: false }, data: { read: true } });
  revalidatePath("/", "layout");
}
