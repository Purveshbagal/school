import { PageHeader } from "@/components/page-header";
import { DriverForm } from "../driver-form";
import { getBusOptions, getVillageOptions } from "../bus-options";

export default async function NewDriverPage() {
  const [buses, villages] = await Promise.all([getBusOptions(), getVillageOptions()]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Assign Driver" description="Create a driver app login, assign a school bus and the villages it covers" />
      <DriverForm buses={buses} villages={villages} />
    </div>
  );
}
