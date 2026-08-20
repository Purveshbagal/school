import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getStudentFeeSummary, getPendingFeesStudents } from "@/lib/fees";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentForm } from "@/components/payment-form";
import { StudentSearch } from "./student-search";
import { formatCurrency, formatDateInput } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; student?: string }>;
}) {
  const { q, student: studentId } = await searchParams;

  if (studentId) {
    const summary = await getStudentFeeSummary(studentId);
    if (!summary) notFound();
    const { student, totalFee, totalPaid, due, advance } = summary;

    return (
      <div className="mx-auto max-w-lg">
        <PageHeader
          title="Payment In"
          description="Record a fee payment"
          actions={
            <Button variant="outline" size="sm" render={<Link href="/payments/new">Change Student</Link>}>
              <ArrowLeft /> Change Student
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {student.name}
              <Badge variant="outline">{student.admissionNo}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="-mt-2 mb-4 text-sm text-muted-foreground">
              Standard {student.standard.name} · {student.academicYear}
              {student.fatherName ? ` · Father: ${student.fatherName}` : ""}
            </p>
            <PaymentForm
              studentId={student.id}
              suggestedAmount={Math.max(due, 0)}
              totalFee={totalFee}
              totalPaid={totalPaid}
              due={due > 0 ? due : -advance}
              today={formatDateInput(new Date())}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const students = q
    ? await prisma.student.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { admissionNo: { contains: q, mode: "insensitive" } },
            { fatherName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        },
        include: { standard: true },
        orderBy: { name: "asc" },
        take: 25,
      })
    : [];

  const pendingStudents = !q ? await getPendingFeesStudents() : [];

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Payment In"
        description="Search and select a student to record their fee payment"
        actions={
          <Button variant="outline" size="sm" render={<Link href="/payments">Cancel</Link>} />
        }
      />

      <Card>
        <CardContent>
          <StudentSearch initialQuery={q || ""} />

          {!q ? (
            pendingStudents.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No students with pending fees. Start typing a name, admission number, father&apos;s
                name, or phone to search.
              </p>
            ) : (
              <>
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Pending Fees
                </p>
                <div className="space-y-2">
                  {pendingStudents.map((s) => (
                    <Link
                      key={s.id}
                      href={`/payments/new?student=${s.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition hover:border-primary/50 hover:bg-accent/40"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.admissionNo} · Standard {s.standardName}
                          {s.fatherName ? ` · ${s.fatherName}` : ""}
                        </p>
                      </div>
                      <Badge variant="destructive" className="shrink-0">
                        {formatCurrency(s.due)}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </>
            )
          ) : students.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No matching students found.
            </p>
          ) : (
            <div className="space-y-2">
              {students.map((s) => (
                <Link
                  key={s.id}
                  href={`/payments/new?student=${s.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition hover:border-primary/50 hover:bg-accent/40"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.admissionNo} · Standard {s.standard.name}
                      {s.fatherName ? ` · ${s.fatherName}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    Select
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
