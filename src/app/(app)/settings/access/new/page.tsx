import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { NewAccessForm } from "./new-access-form";
import { ArrowLeft } from "lucide-react";

export default function NewAccessPage() {
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Give Access"
        description="Create a login for a teacher with only the functions you select"
        actions={
          <Button variant="outline" size="sm" render={<Link href="/settings">Cancel</Link>}>
            <ArrowLeft /> Cancel
          </Button>
        }
      />
      <NewAccessForm />
    </div>
  );
}
