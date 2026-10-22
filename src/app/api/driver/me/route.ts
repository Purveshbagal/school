import { driverJson, getDriverFromRequest } from "@/lib/driver-auth";
import { driverProfile } from "../profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const driver = await getDriverFromRequest(request);
  if (!driver) return driverJson({ error: "Session expired. Please log in again.", code: "UNAUTHORIZED" }, 401);

  return driverJson(await driverProfile(driver));
}
