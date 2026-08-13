import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditExpenseForm } from "./edit-expense-form";
import { ArrowLeft } from "lucide-react";

export default async function EditBusExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const expense = await prisma.busExpense.findUnique({
    where: { id },
    include: { bus: true },
  });
  if (!expense) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Edit Diesel Expense"
        description="Update payment details"
        actions={
          <Button variant="outline" size="sm" render={<Link href="/buses?view=payments">Back</Link>}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            {expense.bus.vehicleNumber}
            {expense.bus.driverName && <Badge variant="outline">{expense.bus.driverName}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EditExpenseForm
            expense={{
              id: expense.id,
              busId: expense.busId,
              amount: expense.amount,
              liters: expense.liters,
              remarks: expense.remarks,
              date: expense.date,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
