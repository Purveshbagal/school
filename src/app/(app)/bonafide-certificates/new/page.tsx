import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateInput } from "@/lib/utils";
import { BonafideCertificateForm } from "./bonafide-certificate-form";
import { ArrowLeft, Search } from "lucide-react";

export default async function NewBonafideCertificatePage({
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

    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Create Bonafide Certificate"
          description={`${student.name} · ${student.admissionNo}`}
          actions={
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/bonafide-certificates/new">Change Student</Link>}
            >
              <ArrowLeft /> Change Student
            </Button>
          }
        />

        <BonafideCertificateForm
          student={student}
          today={formatDateInput(new Date())}
        />
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
    : await prisma.student.findMany({
        where: { status: "ACTIVE" },
        include: { standard: true },
        orderBy: { name: "asc" },
        take: 25,
      });

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Create Bonafide Certificate"
        description="Search and select a student"
        actions={
          <Button variant="outline" size="sm" render={<Link href="/bonafide-certificates">Cancel</Link>} />
        }
      />

      <Card>
        <CardContent>
          <form className="mb-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                autoFocus
                placeholder="Search by name, register number, father's name, phone..."
                className="pl-8"
              />
            </div>
          </form>

          {students.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No matching students found.
            </p>
          ) : (
            <div className="space-y-2">
              {students.map((s) => (
                <Link
                  key={s.id}
                  href={`/bonafide-certificates/new?student=${s.id}`}
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
