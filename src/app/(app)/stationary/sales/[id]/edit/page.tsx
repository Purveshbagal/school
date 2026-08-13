import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditSaleForm } from "./edit-sale-form";
import { ArrowLeft } from "lucide-react";

export default async function EditSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sale = await prisma.stationarySale.findUnique({
    where: { id },
    include: { student: true, items: true, payments: true },
  });
  if (!sale) notFound();

  const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
  const due = Math.max(0, sale.totalAmount - totalPaid);

  const catalogItems = await prisma.stationaryItem.findMany({ orderBy: { name: "asc" } });

  const initialCart = sale.items.map((line) => ({
    id: line.itemId || line.id,
    name: line.itemName,
    price: line.price,
    qty: String(line.quantity),
  }));

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Edit Sale"
        description={sale.saleNo}
        actions={
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/stationary/sales">Back</Link>}
          >
            <ArrowLeft /> Back
          </Button>
        }
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            {sale.student.name}
            <Badge variant="outline">{sale.student.admissionNo}</Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      <EditSaleForm
        saleId={sale.id}
        paymentMode={sale.paymentMode}
        totalPaid={totalPaid}
        due={due}
        items={catalogItems}
        initialCart={initialCart}
      />
    </div>
  );
}
