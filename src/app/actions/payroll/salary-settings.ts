"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

function num(formData: FormData, key: string, fallback = 0): number {
  const v = formData.get(key);
  return v === null || v === "" ? fallback : Number(v);
}

function bool(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

export async function updateSalarySettingsAction(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const workingDaysPerMonth = num(formData, "workingDaysPerMonth", 26);
  const calculationMethod = String(formData.get("calculationMethod") || "MONTHLY");
  const halfDayDeductionRule = num(formData, "halfDayDeductionRule", 0.5);
  const absentDeductionRule = num(formData, "absentDeductionRule", 1);
  const lateRuleThreshold = num(formData, "lateRuleThreshold", 3);
  const lateDeductionPerOccurrence = num(formData, "lateDeductionPerOccurrence", 0);
  const roundOff = bool(formData, "roundOff");
  const pfEnabled = bool(formData, "pfEnabled");
  const pfRate = num(formData, "pfRate", 0);
  const esicEnabled = bool(formData, "esicEnabled");
  const esicRate = num(formData, "esicRate", 0);
  const professionalTaxEnabled = bool(formData, "professionalTaxEnabled");
  const professionalTaxAmount = num(formData, "professionalTaxAmount", 0);
  const defaultLeavePolicy = String(formData.get("defaultLeavePolicy") || "").trim();

  if (workingDaysPerMonth <= 0) {
    return { error: "Working days per month must be greater than zero" };
  }

  const session = await getSession();

  await prisma.salarySettings.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      workingDaysPerMonth, calculationMethod, halfDayDeductionRule, absentDeductionRule,
      lateRuleThreshold, lateDeductionPerOccurrence, roundOff,
      pfEnabled, pfRate, esicEnabled, esicRate, professionalTaxEnabled, professionalTaxAmount,
      defaultLeavePolicy: defaultLeavePolicy || undefined,
      updatedBy: session?.username,
    },
    update: {
      workingDaysPerMonth, calculationMethod, halfDayDeductionRule, absentDeductionRule,
      lateRuleThreshold, lateDeductionPerOccurrence, roundOff,
      pfEnabled, pfRate, esicEnabled, esicRate, professionalTaxEnabled, professionalTaxAmount,
      defaultLeavePolicy: defaultLeavePolicy || undefined,
      updatedBy: session?.username,
    },
  });

  revalidatePath("/salary-settings");
  return { success: true };
}
