import { prisma } from "@/lib/db";
import { getStudentFromRequest, studentJson, unauthorizedStudent } from "@/lib/student-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const student = await getStudentFromRequest(request);
  if (!student) return unauthorizedStudent();
  return studentJson({ pickup: student.pickupLat == null || student.pickupLng == null ? null : {
    lat: student.pickupLat, lng: student.pickupLng, address: student.pickupAddress,
  } });
}

export async function POST(request: Request) {
  const student = await getStudentFromRequest(request);
  if (!student) return unauthorizedStudent();
  let body: unknown;
  try { body = await request.json(); } catch { return studentJson({ error: "Invalid request." }, 400); }
  if (!body || typeof body !== "object") return studentJson({ error: "Invalid request." }, 400);
  const value = body as Record<string, unknown>;
  const lat = value.lat;
  const lng = value.lng;
  const address = value.address;
  if (typeof lat !== "number" || !Number.isFinite(lat) || Math.abs(lat) > 90 ||
      typeof lng !== "number" || !Number.isFinite(lng) || Math.abs(lng) > 180 ||
      typeof address !== "string" || !address.trim() || address.trim().length > 300) {
    return studentJson({ error: "Choose a valid map point and enter its address." }, 400);
  }
  const saved = await prisma.student.update({ where: { id: student.id }, data: {
    pickupLat: lat, pickupLng: lng, pickupAddress: address.trim(), pickupUpdatedAt: new Date(),
  } });
  return studentJson({ pickup: { lat: saved.pickupLat, lng: saved.pickupLng, address: saved.pickupAddress } });
}
