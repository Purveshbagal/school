"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { updateSalarySettingsAction } from "@/app/actions/payroll/salary-settings";
import type { SalarySettings } from "@/generated/prisma/client";

export function SalarySettingsForm({ settings }: { settings: SalarySettings }) {
  const [state, formAction, pending] = useActionState(updateSalarySettingsAction, undefined);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Working Days & Calculation</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Working Days Per Month" name="workingDaysPerMonth" type="number" step="0.5" defaultValue={settings.workingDaysPerMonth} />
          <div className="space-y-1.5">
            <Label htmlFor="calculationMethod">Default Salary Calculation Method</Label>
            <NativeSelect id="calculationMethod" name="calculationMethod" defaultValue={settings.calculationMethod}>
              <option value="MONTHLY">Monthly</option>
              <option value="PER_DAY">Per Day</option>
              <option value="CUSTOM">Custom</option>
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deduction Rules</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Half Day Deduction (fraction of a day's pay)"
            name="halfDayDeductionRule"
            type="number"
            step="0.05"
            defaultValue={settings.halfDayDeductionRule}
          />
          <Field
            label="Absent / Unpaid Leave Deduction (fraction of a day's pay)"
            name="absentDeductionRule"
            type="number"
            step="0.05"
            defaultValue={settings.absentDeductionRule}
          />
          <Field
            label="Late Occurrences Allowed Before Deduction"
            name="lateRuleThreshold"
            type="number"
            step="1"
            defaultValue={settings.lateRuleThreshold}
          />
          <Field
            label="Deduction Per Late Occurrence (₹, beyond allowance)"
            name="lateDeductionPerOccurrence"
            type="number"
            step="1"
            defaultValue={settings.lateDeductionPerOccurrence}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statutory Deductions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleWithRate
            enabledName="pfEnabled"
            enabledLabel="Provident Fund (PF)"
            defaultEnabled={settings.pfEnabled}
            rateName="pfRate"
            rateLabel="PF Rate (% of gross salary)"
            defaultRate={settings.pfRate}
          />
          <ToggleWithRate
            enabledName="esicEnabled"
            enabledLabel="ESIC"
            defaultEnabled={settings.esicEnabled}
            rateName="esicRate"
            rateLabel="ESIC Rate (% of gross salary)"
            defaultRate={settings.esicRate}
          />
          <ToggleWithRate
            enabledName="professionalTaxEnabled"
            enabledLabel="Professional Tax"
            defaultEnabled={settings.professionalTaxEnabled}
            rateName="professionalTaxAmount"
            rateLabel="Professional Tax (₹ flat amount)"
            defaultRate={settings.professionalTaxAmount}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Other</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              name="roundOff"
              defaultChecked={settings.roundOff}
              className="size-4 accent-primary"
            />
            Round off net payable to the nearest rupee
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="defaultLeavePolicy">Default Leave Policy (notes shown for reference)</Label>
            <Input
              id="defaultLeavePolicy"
              name="defaultLeavePolicy"
              defaultValue={settings.defaultLeavePolicy || ""}
              placeholder="e.g. 12 paid leaves per year, unused leave does not carry forward"
            />
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{state.error}</div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-success/10 px-3.5 py-2.5 text-sm text-success">Settings saved.</div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  step,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  defaultValue?: string | number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} step={step} defaultValue={defaultValue} />
    </div>
  );
}

function ToggleWithRate({
  enabledName,
  enabledLabel,
  defaultEnabled,
  rateName,
  rateLabel,
  defaultRate,
}: {
  enabledName: string;
  enabledLabel: string;
  defaultEnabled: boolean;
  rateName: string;
  rateLabel: string;
  defaultRate: number;
}) {
  return (
    <div className="rounded-lg border border-border p-3.5">
      <label className="flex items-center gap-2.5 text-sm font-medium">
        <input type="checkbox" name={enabledName} defaultChecked={defaultEnabled} className="size-4 accent-primary" />
        {enabledLabel}
      </label>
      <div className="mt-2.5 space-y-1.5">
        <Label htmlFor={rateName}>{rateLabel}</Label>
        <Input id={rateName} name={rateName} type="number" step="0.01" defaultValue={defaultRate} />
      </div>
    </div>
  );
}
