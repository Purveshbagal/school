import type { Prisma } from "@/generated/prisma/client";

export const CBSE = "CBSE";
export const STATE_BOARD = "Maharashtra State Board";
export const PRE_PRIMARY = "PRE_PRIMARY";
// Not a board — shares the `board` URL param so the RTE tab sits alongside the board tabs.
export const RTE = "RTE";
// Prefixes, not exact names, so variants like "UKG - A" / "UKG-B" / "LKG 2"
// are still grouped under Pre-Primary alongside plain "LKG" / "UKG".
export const PRE_PRIMARY_PREFIXES = ["LKG", "UKG"];

export function prePrimaryStandardFilter(): Prisma.StandardWhereInput {
  return {
    OR: PRE_PRIMARY_PREFIXES.map((prefix) => ({
      name: { startsWith: prefix, mode: "insensitive" as const },
    })),
  };
}

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

  if (board === PRE_PRIMARY) return { ...baseWhere, standard: prePrimaryStandardFilter() };
  if (board === RTE) return { ...baseWhere, rte: true };
  return { ...baseWhere, ...(board ? { board } : {}) };
}
