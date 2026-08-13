import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EditAccessForm } from "./edit-access-form";
import { ArrowLeft } from "lucide-react";

export default async function EditAccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await prisma.staffAccess.findUnique({ where: { id } });
  if (!account) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Edit Access"
        description={`${account.teacherName} · @${account.username}`}
        actions={
          <Button variant="outline" size="sm" render={<Link href="/settings">Cancel</Link>}>
            <ArrowLeft /> Cancel
          </Button>
        }
      />
      <EditAccessForm account={account} />
    </div>
  );
}
