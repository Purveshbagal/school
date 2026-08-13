"use server";

import { redirect } from "next/navigation";
import { authenticate, createSession, destroySession, getLandingPath } from "@/lib/auth";

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "").trim();

  const session = await authenticate(username, password);
  if (!session) {
    return { error: "Invalid username or password" };
  }

  const landingPath = getLandingPath(session);
  if (!landingPath) {
    return { error: "Your account has no permissions assigned. Contact an administrator." };
  }

  await createSession(session);
  redirect(landingPath);
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
