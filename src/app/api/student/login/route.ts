import { studentProfile } from "@/lib/student-app";
import {
  clearFailedLogins,
  clientKey,
  findStudentByAadhar,
  loginLockedFor,
  normalizeAadhar,
  recordFailedLogin,
  signStudentToken,
  studentJson,
} from "@/lib/student-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Student app login: the 12-digit Aadhar number entered at admission. */
export async function POST(request: Request) {
  const key = clientKey(request);
  const locked = loginLockedFor(key);
  if (locked) {
    return studentJson({ error: `Too many wrong attempts. Try again in ${locked} min.` }, 429);
  }

  let body: { aadhar?: unknown };
  try {
    body = await request.json();
  } catch {
    return studentJson({ error: "Invalid request" }, 400);
  }

  const aadhar = normalizeAadhar(body.aadhar);
  if (!aadhar) return studentJson({ error: "Enter the 12-digit Aadhar card number" }, 400);

  const student = await findStudentByAadhar(aadhar);
  if (!student) {
    recordFailedLogin(key);
    return studentJson(
      { error: "No student found with this Aadhar number. Check it, or contact the school office." },
      401
    );
  }

  clearFailedLogins(key);
  const token = await signStudentToken(student);
  return studentJson({ token, ...(await studentProfile(student)) });
}
