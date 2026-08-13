import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditPaymentForm } from "./edit-payment-form";
import { ArrowLeft } from "lucide-react";

export default async function EditPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payment = await prisma.feePayment.findUnique({
    where: { id },
    include: { student: { include: { standard: true } } },
  });
  if (!payment) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Edit Payment"
        description={`Receipt ${payment.receiptNo}`}
        actions={
          <Button variant="outline" size="sm" render={<Link href="/payments">Back</Link>}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            {payment.student.name}
            <Badge variant="outline">{payment.student.admissionNo}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="-mt-2 mb-4 text-sm text-muted-foreground">
            Standard {payment.student.standard.name} · {payment.academicYear}
          </p>
          <EditPaymentForm
            payment={{
              id: payment.id,
              studentId: payment.studentId,
              amount: payment.amount,
              mode: payment.mode,
              remarks: payment.remarks,
              paymentDate: payment.paymentDate,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
