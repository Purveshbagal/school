import type { NextRequest } from "next/server";
import { studentBusFeed } from "@/lib/student-app";
import { getStudentFromRequest, studentJson, unauthorizedStudent } from "@/lib/student-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The student's bus feed as plain JSON — the app's fallback when the live stream can't connect. */
export async function GET(request: NextRequest) {
  const student = await getStudentFromRequest(request);
  if (!student) return unauthorizedStudent();

  const sinceParam = request.nextUrl.searchParams.get("since");
  const since = sinceParam ? Number(sinceParam) : null;
  return studentJson(await studentBusFeed(student, since != null && Number.isFinite(since) ? since : null));
}
