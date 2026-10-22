import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { driverJson, signDriverToken } from "@/lib/driver-auth";
import { driverProfile } from "../profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return driverJson({ error: "Invalid request" }, 400);
  }

  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password.trim() : "";
  if (!username || !password) {
    return driverJson({ error: "Enter username and password" }, 400);
  }

  const driver = await prisma.busDriver.findUnique({ where: { username }, include: { bus: true } });
  const valid = driver ? await bcrypt.compare(password, driver.passwordHash) : false;
  if (!driver || !valid) {
    return driverJson({ error: "Invalid username or password" }, 401);
  }
  if (driver.status !== "ACTIVE") {
    return driverJson({ error: "Your account is disabled. Contact the school office." }, 403);
  }

  const token = await signDriverToken(driver);
  return driverJson({ token, ...(await driverProfile(driver)) });
}
