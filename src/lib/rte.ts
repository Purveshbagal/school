// RTE (Right to Education) students don't pay tuition — only the fee structure's other
// components (Online & Exam fee etc.) plus bus fee. Kept free of server-only imports so
// both server pages and client forms can use it.

type FeeComponentLike = { name: string; amount: number };
type FeeStructureLike = { totalAmount: number; components: FeeComponentLike[] };

/** Fee components are free text, so tuition is matched by name — including common
 * spellings like "Tution" / "Tuision" / "Tuesion". */
export function isTuitionComponent(name: string) {
  return /tu[ie]?[ts]i?on/i.test(name);
}

/** What a student is charged from their standard's fee structure, before any custom
 * fee / discount: the full total, or for RTE students everything except tuition. */
export function feeStructureAmount(feeStructure: FeeStructureLike | null | undefined, rte: boolean) {
  if (!feeStructure) return 0;
  if (!rte) return feeStructure.totalAmount;
  return feeStructure.components
    .filter((c) => !isTuitionComponent(c.name))
    .reduce((sum, c) => sum + c.amount, 0);
}
