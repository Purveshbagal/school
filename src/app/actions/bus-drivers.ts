"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isObjectId } from "@/lib/driver-auth";
import { canViewTracking, completeTrip } from "@/lib/tracking-server";
import { notifyTrackingChanged } from "@/lib/tracking-events";

const DRIVERS_PATH = "/live-tracking/drivers";
const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;

/** Ticked villages that still exist (a village deleted meanwhile is silently dropped). */
async function readVillageIds(formData: FormData): Promise<string[]> {
  const ids = [...new Set(formData.getAll("villageIds").map(String))].filter(isObjectId);
  if (ids.length === 0) return [];
  const villages = await prisma.village.findMany({ where: { id: { in: ids } }, select: { id: true } });
  return villages.map((v) => v.id);
}

async function readBusId(formData: FormData): Promise<{ busId?: string; error?: string }> {
  const busId = String(formData.get("busId") || "");
  if (!isObjectId(busId)) return { error: "Please select a bus" };
  const bus = await prisma.bus.findUnique({ where: { id: busId }, select: { id: true } });
  if (!bus) return { error: "Selected bus no longer exists" };
  return { busId };
}

export async function createDriverAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  if (!canViewTracking(await getSession())) return { error: "Not authorized" };

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  // Lower-cased so a phone keyboard's auto-capitalised first letter still logs in.
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "").trim();

  if (!name) return { error: "Driver name is required" };
  const { busId, error } = await readBusId(formData);
  if (error) return { error };
  if (!USERNAME_PATTERN.test(username)) {
    return { error: "Username must be 3–30 characters: letters, numbers, dot, dash or underscore (no spaces)" };
  }
  if (password.length < 4) return { error: "Password must be at least 4 characters" };

  const existing = await prisma.busDriver.findUnique({ where: { username } });
  if (existing) return { error: "This username is already taken" };

  await prisma.busDriver.create({
    data: {
      name,
      phone: phone || null,
      busId,
      villageIds: await readVillageIds(formData),
      username,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  revalidatePath(DRIVERS_PATH);
  redirect(DRIVERS_PATH);
}

export async function updateDriverAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  if (!canViewTracking(await getSession())) return { error: "Not authorized" };

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const status = formData.get("status") === "INACTIVE" ? "INACTIVE" : "ACTIVE";

  if (!isObjectId(id)) return { error: "Driver not found" };
  if (!name) return { error: "Driver name is required" };
  const { busId, error } = await readBusId(formData);
  if (error) return { error };
  if (password && password.length < 4) return { error: "Password must be at least 4 characters" };

  const driver = await prisma.busDriver.findUnique({ where: { id } });
  if (!driver) return { error: "Driver not found" };

  // A new password or disabling the account logs the app out on its next request.
  const revokeTokens = Boolean(password) || (status === "INACTIVE" && driver.status !== "INACTIVE");

  await prisma.busDriver.update({
    where: { id },
    data: {
      name,
      phone: phone || null,
      busId,
      villageIds: await readVillageIds(formData),
      status,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      ...(revokeTokens ? { tokenVersion: { increment: 1 } } : {}),
    },
  });

  if (status === "INACTIVE") {
    await endDriverTrips(id);
  }
  // Student apps re-read which bus covers their village.
  notifyTrackingChanged();

  revalidatePath(DRIVERS_PATH);
  redirect(DRIVERS_PATH);
}

export async function deleteDriverAction(formData: FormData): Promise<{ error?: string } | void> {
  if (!canViewTracking(await getSession())) return { error: "Not authorized" };

  const id = String(formData.get("id") || "");
  if (!isObjectId(id)) return { error: "Driver not found" };

  await endDriverTrips(id);
  // Trip history keeps its own copy of the driver's name, so it stays readable.
  await prisma.busDriver.deleteMany({ where: { id } });
  revalidatePath(DRIVERS_PATH);
}

async function endDriverTrips(driverId: string) {
  const open = await prisma.busTrip.findMany({
    where: { driverId, status: "ACTIVE" },
    select: { id: true },
  });
  for (const trip of open) {
    await completeTrip(trip.id, new Date());
  }
  if (open.length) notifyTrackingChanged();
}
