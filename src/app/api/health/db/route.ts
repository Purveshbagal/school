import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.schoolSettings.findFirst({ select: { id: true } });
    return NextResponse.json({ database: "connected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { database: "error", message: message.slice(0, 300) },
      { status: 503 }
    );
  }
}
