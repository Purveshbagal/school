import { studentResults } from "@/lib/student-app";
import { getStudentFromRequest, studentJson, unauthorizedStudent } from "@/lib/student-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Published exam results (fee-gated like the public result page). */
export async function GET(request: Request) {
  const student = await getStudentFromRequest(request);
  if (!student) return unauthorizedStudent();

  return studentJson(await studentResults(student));
}
