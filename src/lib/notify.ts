import type { Prisma } from "@/generated/prisma/client";

export type NotificationType =
  | "SALARY_GENERATED"
  | "SALARY_PAID"
  | "UPCOMING_SALARY"
  | "PENDING_REMINDER";

export type Audience = "ADMIN" | "TEACHER";

/** Creates an in-app notification row. Call inside the same transaction as the event it announces. */
export async function createNotification(
  tx: Prisma.TransactionClient,
  input: {
    type: NotificationType;
    audience: Audience;
    teacherId?: string;
    title: string;
    message: string;
    createdBy?: string;
  }
) {
  await tx.notification.create({
    data: {
      type: input.type,
      audience: input.audience,
      teacherId: input.teacherId,
      title: input.title,
      message: input.message,
      createdBy: input.createdBy,
    },
  });
}

/**
 * External delivery channels (email/WhatsApp). No provider is configured yet —
 * this is a no-op placeholder so wiring a real provider later is a config-only
 * change (fill in the body, add credentials to .env) with no call-site changes.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature documents the intended payload shape for the future provider
export async function sendExternalNotification(_input: {
  channel: "EMAIL" | "WHATSAPP";
  to: string;
  subject?: string;
  message: string;
}): Promise<void> {
  // Not configured. In-app notifications (createNotification above) are the
  // active channel for now; see plan doc for how to wire SMTP/WhatsApp later.
}
