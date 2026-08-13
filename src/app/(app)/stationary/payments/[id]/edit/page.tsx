import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditStationaryPaymentForm } from "./edit-stationary-payment-form";
import { ArrowLeft } from "lucide-react";

export default async function EditStationaryPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payment = await prisma.stationarySalePayment.findUnique({
    where: { id },
    include: { sale: { include: { student: true } } },
  });
  if (!payment) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Edit Payment"
        description={`Receipt ${payment.receiptNo}`}
        actions={
          <Button variant="outline" size="sm" render={<Link href="/stationary/payments">Back</Link>}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            {payment.sale.student.name}
            <Badge variant="outline">{payment.sale.saleNo}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="-mt-2 mb-4 text-sm text-muted-foreground">{payment.sale.student.admissionNo}</p>
          <EditStationaryPaymentForm
            payment={{
              id: payment.id,
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
