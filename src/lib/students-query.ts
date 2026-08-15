import type { Prisma } from "@/generated/prisma/client";

export const CBSE = "CBSE";
export const STATE_BOARD = "Maharashtra State Board";
export const PRE_PRIMARY = "PRE_PRIMARY";
export const PRE_PRIMARY_STANDARDS = ["LKG", "UKG"];

export type StudentsSearchParams = {
  q?: string;
  standard?: string;
  village?: string;
  status?: string;
  board?: string;
};

export function buildStudentsWhere({
  q,
  standard,
  village,
  status,
  board,
}: StudentsSearchParams): Prisma.StudentWhereInput {
  const baseWhere: Prisma.StudentWhereInput = {
    ...(standard ? { standardId: standard } : {}),
    ...(village ? { villageId: village } : {}),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { admissionNo: { contains: q, mode: "insensitive" } },
            { fatherName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  return board === PRE_PRIMARY
    ? { ...baseWhere, standard: { name: { in: PRE_PRIMARY_STANDARDS } } }
    : { ...baseWhere, ...(board ? { board } : {}) };
}
