import { PageHeader } from "@/components/page-header";
import { BusForm } from "../bus-form";

export default function NewBusPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Add Bus" description="Register a new school bus / vehicle" />
      <BusForm />
    </div>
  );
}
