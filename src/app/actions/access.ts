"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";

export async function createAccessAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const teacherName = String(formData.get("teacherName") || "").trim();
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const permissions = formData.getAll("permissions").map(String);

  if (!teacherName || !username || !password) {
    return { error: "Teacher name, username and password are required" };
  }
  if (password.length < 4) {
    return { error: "Password must be at least 4 characters" };
  }
  if (permissions.length === 0) {
    return { error: "Select at least one function to grant access to" };
  }
  if (username.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
    return { error: "This username is reserved" };
  }

  const existing = await prisma.staffAccess.findUnique({ where: { username } });
  if (existing) {
    return { error: "This username is already taken" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.staffAccess.create({
    data: { teacherName, username, passwordHash, permissions },
  });

  revalidatePath("/settings");
  redirect("/settings");
}

export async function updateAccessAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const id = String(formData.get("id") || "");
  const teacherName = String(formData.get("teacherName") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const permissions = formData.getAll("permissions").map(String);

  if (!teacherName) {
    return { error: "Teacher name is required" };
  }
  if (permissions.length === 0) {
    return { error: "Select at least one function to grant access to" };
  }
  if (password && password.length < 4) {
    return { error: "Password must be at least 4 characters" };
  }

  await prisma.staffAccess.update({
    where: { id },
    data: {
      teacherName,
      permissions,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
  });

  revalidatePath("/settings");
  redirect("/settings");
}

export async function deleteAccessAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  await prisma.staffAccess.delete({ where: { id } });
  revalidatePath("/settings");
}
