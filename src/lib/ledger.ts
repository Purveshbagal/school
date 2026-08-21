import type { Prisma } from "@/generated/prisma/client";

export type LedgerEntryType =
  | "SALARY_STRUCTURE_ASSIGNED"
  | "SALARY_REVISED"
  | "ADVANCE_GIVEN"
  | "ADVANCE_EDITED"
  | "ADVANCE_DELETED"
  | "ADVANCE_APPLIED"
  | "ATTENDANCE_SAVED"
  | "SALARY_GENERATED"
  | "BONUS_ADDED"
  | "DEDUCTION_ADDED"
  | "SALARY_PAID"
  | "SALARY_PAYMENT_DELETED"
  | "PAYROLL_LOCKED"
  | "PAYROLL_UNLOCKED"
  | "PAYROLL_DELETED";

/** Appends one immutable timeline row for a teacher. Call inside the same transaction as the state change it records. */
export async function writeLedgerEntry(
  tx: Prisma.TransactionClient,
  entry: {
    teacherId: string;
    type: LedgerEntryType;
    amount?: number;
    description: string;
    refId?: string;
    date?: Date;
    createdBy?: string;
  }
) {
  await tx.salaryLedger.create({
    data: {
      teacherId: entry.teacherId,
      type: entry.type,
      amount: entry.amount ?? 0,
      description: entry.description,
      refId: entry.refId,
      date: entry.date ?? new Date(),
      createdBy: entry.createdBy,
    },
  });
}
