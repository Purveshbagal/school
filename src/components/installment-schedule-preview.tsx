"use client";

import { buildInstallmentSchedule } from "@/lib/advance-installments";
import { formatCurrency } from "@/lib/utils";
import { MONTH_NAMES } from "@/lib/payroll-engine";

export function InstallmentSchedulePreview({
  amount,
  emiAmount,
  date,
}: {
  amount: number;
  emiAmount: number;
  date: string;
}) {
  if (!amount || amount <= 0 || !emiAmount || emiAmount <= 0) return null;

  const parsedDate = date ? new Date(date) : new Date();
  const schedule = buildInstallmentSchedule(amount, emiAmount, parsedDate);

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs font-medium text-muted-foreground">
        {schedule.length} month{schedule.length === 1 ? "" : "s"} to fully recover {formatCurrency(amount)}
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {schedule.map((s, i) => (
          <li key={`${s.month}-${s.year}-${i}`} className="flex items-center justify-between">
            <span className="text-muted-foreground">{MONTH_NAMES[s.month - 1]} {s.year}</span>
            <span className="font-medium">{formatCurrency(s.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
