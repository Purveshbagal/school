import { studentFees } from "@/lib/student-app";
import { getStudentFromRequest, studentJson, unauthorizedStudent } from "@/lib/student-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** This year's fee summary and receipts. */
export async function GET(request: Request) {
  const student = await getStudentFromRequest(request);
  if (!student) return unauthorizedStudent();

  const fees = await studentFees(student);
  return fees ? studentJson(fees) : studentJson({ error: "Fee details not found" }, 404);
}
