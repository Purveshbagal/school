import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditAdvanceForm } from "./edit-advance-form";
import { ArrowLeft } from "lucide-react";

export default async function EditAdvancePaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const advance = await prisma.advancePayment.findUnique({
    where: { id },
    include: { teacher: true },
  });
  if (!advance || advance.deletedAt) notFound();
  if (advance.status !== "UNADJUSTED") notFound();

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Edit Advance Payment"
        description="Update advance details"
        actions={
          <Button variant="outline" size="sm" render={<Link href="/advance-payments?view=payments">Back</Link>}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            {advance.teacher.name}
            {advance.teacher.designation && <Badge variant="outline">{advance.teacher.designation}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EditAdvanceForm
            advance={{
              id: advance.id,
              teacherId: advance.teacherId,
              amount: advance.amount,
              note: advance.note,
              date: advance.date,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
