import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateInput } from "@/lib/utils";
import { SendAdvanceForm } from "./send-advance-form";
import { ArrowLeft } from "lucide-react";

export default async function SendAdvancePaymentPage() {
  const teachers = await prisma.teacher.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, designation: true },
  });

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Give Advance"
        description="Record an advance payment for a staff member"
        actions={
          <Button variant="outline" size="sm" render={<Link href="/advance-payments">Back</Link>}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <Card>
        <CardContent>
          {teachers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No active staff members found. Add a teacher first.
            </p>
          ) : (
            <SendAdvanceForm teachers={teachers} today={formatDateInput(new Date())} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
