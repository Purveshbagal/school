import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateInput } from "@/lib/utils";
import { SendExpenseForm } from "./send-expense-form";
import { ArrowLeft } from "lucide-react";

export default async function SendBusExpensePage() {
  const buses = await prisma.bus.findMany({
    where: { status: "ACTIVE" },
    orderBy: { vehicleNumber: "asc" },
    select: { id: true, vehicleNumber: true, driverName: true },
  });

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Send Amount"
        description="Record a diesel/fuel expense payment for a bus"
        actions={
          <Button variant="outline" size="sm" render={<Link href="/buses">Back</Link>}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <Card>
        <CardContent>
          {buses.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No active buses found. Add a bus first.
            </p>
          ) : (
            <SendExpenseForm buses={buses} today={formatDateInput(new Date())} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
