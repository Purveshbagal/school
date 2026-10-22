import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";

// Driver-app tokens use their own key (derived from SESSION_SECRET) so a driver token can
// never pass as an admin/staff session cookie, and vice versa.
const DRIVER_SECRET = new TextEncoder().encode(
  `${process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me-1234567890"}::driver-app`
);

const TOKEN_LIFETIME = "365d";

export async function signDriverToken(driver: { id: string; tokenVersion: number }): Promise<string> {
  return new SignJWT({ tv: driver.tokenVersion, typ: "driver" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(driver.id)
    .setIssuedAt()
    .setExpirationTime(TOKEN_LIFETIME)
    .sign(DRIVER_SECRET);
}

/**
 * The driver behind a request's `Authorization: Bearer <token>` header, or null.
 * Re-checked against the database on every call so deactivating a driver or changing
 * their password logs the app out immediately.
 */
export async function getDriverFromRequest(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  let driverId: string | undefined;
  let tokenVersion: unknown;
  try {
    const { payload } = await jwtVerify(token, DRIVER_SECRET);
    if (payload.typ !== "driver") return null;
    driverId = payload.sub;
    tokenVersion = payload.tv;
  } catch {
    return null;
  }
  if (!driverId || !isObjectId(driverId)) return null;

  const driver = await prisma.busDriver.findUnique({ where: { id: driverId }, include: { bus: true } });
  if (!driver || driver.status !== "ACTIVE" || driver.tokenVersion !== tokenVersion) return null;
  return driver;
}

export function isObjectId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{24}$/i.test(value);
}

/** JSON response for the driver API (never cached; the app always needs fresh state). */
export function driverJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
