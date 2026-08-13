import { PageHeader } from "@/components/page-header";
import { ItemForm } from "../item-form";

export default function NewStationaryItemPage() {
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Add Item" description="Add a new stationary item" />
      <ItemForm />
    </div>
  );
}
