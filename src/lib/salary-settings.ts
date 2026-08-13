import { prisma } from "@/lib/db";

const DEFAULTS = {
  workingDaysPerMonth: 26,
  calculationMethod: "MONTHLY",
  halfDayDeductionRule: 0.5,
  absentDeductionRule: 1,
  lateRuleThreshold: 3,
  lateDeductionPerOccurrence: 0,
  roundOff: true,
  pfEnabled: false,
  pfRate: 0,
  esicEnabled: false,
  esicRate: 0,
  professionalTaxEnabled: false,
  professionalTaxAmount: 0,
  defaultLeavePolicy: null as string | null,
};

/** Always returns a settings doc — creates the "main" doc with defaults on first access. */
export async function getSalarySettings() {
  const existing = await prisma.salarySettings.findUnique({ where: { id: "main" } });
  if (existing) return existing;
  return prisma.salarySettings.create({ data: { id: "main", ...DEFAULTS } });
}
