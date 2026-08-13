import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const COOKIE_NAME = "school_session";
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me-1234567890"
);

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123456";

export type Session = {
  username: string;
  role: "admin" | "staff";
  teacherName?: string;
  accountId?: string;
  /** Sidebar hrefs this account can access. Ignored when role is "admin" (full access). */
  permissions: string[];
};

export async function authenticate(username: string, password: string): Promise<Session | null> {
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return { username, role: "admin", permissions: [] };
  }

  const account = await prisma.staffAccess.findUnique({ where: { username } });
  if (!account) return null;

  const valid = await bcrypt.compare(password, account.passwordHash);
  if (!valid) return null;

  return {
    username: account.username,
    role: "staff",
    teacherName: account.teacherName,
    accountId: account.id,
    permissions: account.permissions,
  };
}

export async function createSession(session: Session) {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Where to send a session right after login. Null means the account has no accessible pages. */
export function getLandingPath(session: Session): string | null {
  if (session.role === "admin" || session.permissions.includes("/dashboard")) {
    return "/dashboard";
  }
  return session.permissions[0] || null;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      username: payload.username as string,
      role: payload.role as "admin" | "staff",
      teacherName: payload.teacherName as string | undefined,
      accountId: payload.accountId as string | undefined,
      permissions: (payload.permissions as string[]) || [],
    };
  } catch {
    return null;
  }
}
