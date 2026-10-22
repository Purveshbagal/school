"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isObjectId } from "@/lib/driver-auth";

const NOTICES_PATH = "/notices";

async function noticeAuthor(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== "admin" && !session.permissions.includes(NOTICES_PATH)) return null;
  return session.teacherName || session.username;
}

export async function createNoticeAction(
  _prevState: { error?: string; ok?: number } | undefined,
  formData: FormData
): Promise<{ error?: string; ok?: number }> {
  const author = await noticeAuthor();
  if (!author) return { error: "Not authorized" };

  const title = String(formData.get("title") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const audience = formData.get("audience") === "standards" ? "standards" : "all";
  if (!title) return { error: "Notice title is required" };
  if (!message) return { error: "Notice message is required" };
  if (title.length > 200) return { error: "Title is too long (200 characters max)" };
  if (message.length > 5000) return { error: "Message is too long (5000 characters max)" };

  let standardIds: string[] = [];
  if (audience === "standards") {
    const ids = [...new Set(formData.getAll("standardIds").map(String))].filter(isObjectId);
    const standards = ids.length
      ? await prisma.standard.findMany({ where: { id: { in: ids } }, select: { id: true } })
      : [];
    standardIds = standards.map((s) => s.id);
    if (standardIds.length === 0) return { error: "Select at least one standard, or send to all students" };
  }

  await prisma.notice.create({ data: { title, message, standardIds, createdBy: author } });
  revalidatePath(NOTICES_PATH);
  return { ok: Date.now() };
}

export async function deleteNoticeAction(formData: FormData): Promise<{ error?: string } | void> {
  if (!(await noticeAuthor())) return { error: "Not authorized" };
  const id = String(formData.get("id") || "");
  if (!isObjectId(id)) return { error: "Notice not found" };
  await prisma.notice.deleteMany({ where: { id } });
  revalidatePath(NOTICES_PATH);
}
