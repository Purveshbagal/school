import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StudentSearch } from "./student-search";
import { SaleForm } from "./sale-form";
import { ArrowLeft } from "lucide-react";

export default async function NewSalePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; student?: string }>;
}) {
  const { q, student: studentId } = await searchParams;

  if (studentId) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { standard: true },
    });
    if (!student) notFound();

    const items = await prisma.stationaryItem.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    });

    return (
      <div className="mx-auto max-w-lg">
        <PageHeader
          title="Stationary Sale"
          description="Select items and record the sale"
          actions={
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/stationary/sales/new">Change Student</Link>}
            >
              <ArrowLeft /> Change Student
            </Button>
          }
        />

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {student.name}
              <Badge variant="outline">{student.admissionNo}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="-mt-2">
            <p className="text-sm text-muted-foreground">
              Standard {student.standard.name} · {student.academicYear}
            </p>
          </CardContent>
        </Card>

        <SaleForm studentId={student.id} items={items} />
      </div>
    );
  }

  const students = await prisma.student.findMany({
    where: {
      status: "ACTIVE",
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { admissionNo: { contains: q, mode: "insensitive" } },
              { fatherName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },
    include: { standard: true },
    orderBy: { name: "asc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Stationary Sale"
        description="Search and select a student"
        actions={
          <Button variant="outline" size="sm" render={<Link href="/stationary/sales">Cancel</Link>} />
        }
      />

      <Card>
        <CardContent>
          <StudentSearch initialQuery={q || ""} />

          {students.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No matching students found.
            </p>
          ) : (
            <div className="space-y-2">
              {students.map((s) => (
                <Link
                  key={s.id}
                  href={`/stationary/sales/new?student=${s.id}`}
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
