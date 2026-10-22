import "server-only";
import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { isObjectId } from "@/lib/driver-auth";

// Student-app tokens use their own key (derived from SESSION_SECRET) so they can never pass
// as an admin session or a driver-app token, and vice versa.
const STUDENT_SECRET = new TextEncoder().encode(
  `${process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me-1234567890"}::student-app`
);

const TOKEN_LIFETIME = "365d";

/** "1234 5678 9012", "1234-5678-9012" → "123456789012"; null unless exactly 12 digits. */
export function normalizeAadhar(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/[\s-]/g, "");
  return /^\d{12}$/.test(digits) ? digits : null;
}

/** The spellings an Aadhar number may be stored under (the form saves digits; imports may not). */
export function aadharVariants(digits: string): string[] {
  const spaced = `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
  return [digits, spaced, spaced.replaceAll(" ", "-")];
}

/** Ties a token to the Aadhar it was issued for: correcting a wrong number logs that phone out. */
function aadharTag(aadhar: string | null): string {
  const digits = normalizeAadhar(aadhar ?? "") ?? "";
  return createHash("sha256").update(`student-aadhar:${digits}`).digest("base64url").slice(0, 16);
}

export async function signStudentToken(student: { id: string; aadharNumber: string | null }): Promise<string> {
  return new SignJWT({ typ: "student", at: aadharTag(student.aadharNumber) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(student.id)
    .setIssuedAt()
    .setExpirationTime(TOKEN_LIFETIME)
    .sign(STUDENT_SECRET);
}

const STUDENT_INCLUDE = {
  standard: true,
  villageRef: { include: { taluka: { include: { district: true } } } },
} as const;

export async function findStudentById(id: string) {
  return prisma.student.findUnique({ where: { id }, include: STUDENT_INCLUDE });
}

export type AppStudent = NonNullable<Awaited<ReturnType<typeof findStudentById>>>;

/** The active student logged in with this Aadhar number. Duplicates resolve to the latest admission. */
export async function findStudentByAadhar(digits: string): Promise<AppStudent | null> {
  return prisma.student.findFirst({
    where: { aadharNumber: { in: aadharVariants(digits) }, status: "ACTIVE" },
    orderBy: { admissionDate: "desc" },
    include: STUDENT_INCLUDE,
  });
}

/**
 * The student behind a request's `Authorization: Bearer <token>` header, or null.
 * Re-checked against the database on every call, so a student who leaves the school
 * (leaving certificate → INACTIVE) or whose Aadhar is corrected is logged out.
 */
export async function getStudentFromRequest(request: Request): Promise<AppStudent | null> {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  let studentId: string | undefined;
  let tag: unknown;
  try {
    const { payload } = await jwtVerify(token, STUDENT_SECRET);
    if (payload.typ !== "student") return null;
    studentId = payload.sub;
    tag = payload.at;
  } catch {
    return null;
  }
  if (!studentId || !isObjectId(studentId)) return null;

  const student = await findStudentById(studentId);
  if (!student || student.status !== "ACTIVE" || aadharTag(student.aadharNumber) !== tag) return null;
  return student;
}

/** JSON response for the student API (never cached; the app always needs fresh state). */
export function studentJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function unauthorizedStudent() {
  return studentJson({ error: "Session expired. Please log in again.", code: "UNAUTHORIZED" }, 401);
}

// Aadhar numbers aren't secret, but guessing one shouldn't be cheap either: each phone/IP
// gets a limited number of wrong attempts per window.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGINS = 10;
const globalForLogin = globalThis as unknown as { studentLoginFailures?: Map<string, { count: number; resetAt: number }> };
const failures = (globalForLogin.studentLoginFailures ??= new Map());

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

/** Minutes until this client may try again, or 0 when it isn't locked out. */
export function loginLockedFor(key: string): number {
  const entry = failures.get(key);
  if (!entry || entry.resetAt <= Date.now()) return 0;
  return entry.count >= MAX_FAILED_LOGINS ? Math.ceil((entry.resetAt - Date.now()) / 60_000) : 0;
}

export function recordFailedLogin(key: string) {
  const now = Date.now();
  const entry = failures.get(key);
  if (!entry || entry.resetAt <= now) {
    failures.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    entry.count++;
  }
  if (failures.size > 5000) {
    for (const [k, v] of failures) if (v.resetAt <= now) failures.delete(k);
  }
}

export function clearFailedLogins(key: string) {
  failures.delete(key);
}
