import { studentAttendance } from "@/lib/student-app";
import { getStudentFromRequest, studentJson, unauthorizedStudent } from "@/lib/student-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Attendance for the authenticated student only. */
export async function GET(request: Request) {
  const student = await getStudentFromRequest(request);
  if (!student) return unauthorizedStudent();

  return studentJson(await studentAttendance(student));
}
