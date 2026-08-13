import { getSalarySettings } from "@/lib/salary-settings";
import { PageHeader } from "@/components/page-header";
import { SalarySettingsForm } from "./salary-settings-form";

export default async function SalarySettingsPage() {
  const settings = await getSalarySettings();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Salary Settings"
        description="Global rules payroll generation uses automatically — working days, deduction rules, and statutory deductions"
      />
      <SalarySettingsForm key={settings.updatedAt.toISOString()} settings={settings} />
    </div>
  );
}
