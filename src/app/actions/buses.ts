"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { completeTrip } from "@/lib/tracking-server";
import { notifyTrackingChanged } from "@/lib/tracking-events";

export async function createBusAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const vehicleNumber = String(formData.get("vehicleNumber") || "").trim();
  const driverName = String(formData.get("driverName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const capacityRaw = String(formData.get("capacity") || "").trim();
  const capacity = capacityRaw ? Number(capacityRaw) : null;

  if (!vehicleNumber) {
    return { error: "Vehicle number is required" };
  }

  let bus;
  try {
    bus = await prisma.bus.create({
      data: { vehicleNumber, driverName, phone, capacity },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "A bus with this vehicle number already exists" };
    }
    throw e;
  }

  revalidatePath("/buses");
  redirect(`/buses/${bus.id}`);
}

export async function updateBusAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const id = String(formData.get("id"));
  const vehicleNumber = String(formData.get("vehicleNumber") || "").trim();
  const driverName = String(formData.get("driverName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const capacityRaw = String(formData.get("capacity") || "").trim();
  const capacity = capacityRaw ? Number(capacityRaw) : null;
  const status = String(formData.get("status") || "ACTIVE");

  if (!vehicleNumber) {
    return { error: "Vehicle number is required" };
  }

  try {
    await prisma.bus.update({
      where: { id },
      data: { vehicleNumber, driverName, phone, capacity, status },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "A bus with this vehicle number already exists" };
    }
    throw e;
  }

  // Keep the live map's label in step with a renamed bus.
  await prisma.busTrip.updateMany({ where: { busId: id, status: "ACTIVE" }, data: { vehicleNumber } });

  revalidatePath("/buses");
  revalidatePath(`/buses/${id}`);
  redirect(`/buses/${id}`);
}

export async function deleteBusAction(formData: FormData): Promise<never> {
  const id = String(formData.get("id"));

  // A trip running on this bus can't continue without it.
  const openTrips = await prisma.busTrip.findMany({
    where: { busId: id, status: "ACTIVE" },
    select: { id: true },
  });
  for (const trip of openTrips) {
    await completeTrip(trip.id, new Date());
  }
  if (openTrips.length) notifyTrackingChanged();

  await prisma.$transaction([
    prisma.busExpense.deleteMany({ where: { busId: id } }),
    // Drivers stay, just without a bus, until they're assigned another one.
    prisma.busDriver.updateMany({ where: { busId: id }, data: { busId: null } }),
    prisma.bus.delete({ where: { id } }),
  ]);

  revalidatePath("/buses");
  revalidatePath("/live-tracking/drivers");
  redirect("/buses");
}

export async function addBusExpenseAction(formData: FormData): Promise<void> {
  const busId = String(formData.get("busId"));
  const amount = Number(formData.get("amount") || 0);
  const date = formData.get("date") ? new Date(String(formData.get("date"))) : new Date();
  const litersRaw = String(formData.get("liters") || "").trim();
  const liters = litersRaw ? Number(litersRaw) : null;
  const remarks = String(formData.get("remarks") || "").trim();

  if (!busId || amount <= 0) return;

  await prisma.busExpense.create({ data: { busId, amount, date, liters, remarks } });
  revalidatePath(`/buses/${busId}`);
  revalidatePath("/buses");
}

export async function sendBusExpenseAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const busId = String(formData.get("busId") || "");
  const amount = Number(formData.get("amount") || 0);
  const date = formData.get("date") ? new Date(String(formData.get("date"))) : new Date();
  const litersRaw = String(formData.get("liters") || "").trim();
  const liters = litersRaw ? Number(litersRaw) : null;
  const remarks = String(formData.get("remarks") || "").trim();

  if (!busId) {
    return { error: "Please select a bus" };
  }
  if (!amount || amount <= 0) {
    return { error: "Please enter a valid amount" };
  }

  const bus = await prisma.bus.findUnique({ where: { id: busId } });
  if (!bus) return { error: "Bus not found" };

  await prisma.busExpense.create({ data: { busId, amount, date, liters, remarks } });

  revalidatePath(`/buses/${busId}`);
  revalidatePath("/buses");
  redirect("/buses?view=payments");
}

export async function updateBusExpenseAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const id = String(formData.get("id"));
  const busId = String(formData.get("busId") || "");
  const amount = Number(formData.get("amount") || 0);
  const date = formData.get("date") ? new Date(String(formData.get("date"))) : new Date();
  const litersRaw = String(formData.get("liters") || "").trim();
  const liters = litersRaw ? Number(litersRaw) : null;
  const remarks = String(formData.get("remarks") || "").trim();

  if (!amount || amount <= 0) {
    return { error: "Please enter a valid amount" };
  }

  await prisma.busExpense.update({
    where: { id },
    data: { amount, date, liters, remarks },
  });

  revalidatePath(`/buses/${busId}`);
  revalidatePath("/buses");
  redirect("/buses?view=payments");
}

export async function deleteBusExpenseAction(formData: FormData) {
  const id = String(formData.get("id"));
  const busId = String(formData.get("busId"));
  await prisma.busExpense.delete({ where: { id } });
  revalidatePath(`/buses/${busId}`);
  revalidatePath("/buses");
}
