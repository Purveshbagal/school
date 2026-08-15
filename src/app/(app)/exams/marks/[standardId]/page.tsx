import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";

export default async function StandardMarksPage({
  params,
}: {
  params: Promise<{ standardId: string }>;
}) {
  const { standardId } = await params;

  const standard = await prisma.standard.findUnique({ where: { id: standardId } });
  if (!standard) notFound();

  const students = await prisma.student.findMany({
    where: { standardId, status: "ACTIVE" },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title={`Students Marks — ${standard.name}`}
        description={`${students.length} active student${students.length === 1 ? "" : "s"}`}
      />

      <Card>
        <CardContent>
          {students.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No active students found in {standard.name}.
            </p>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="space-y-3 md:hidden">
                {students.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-3.5">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{s.admissionNo}</p>
                    </div>
                    <Button variant="outline" size="sm" render={
                      <Link href={`/exams/marks/${standardId}/${s.id}`}>
                        <ClipboardList /> Marks
                      </Link>
                    } />
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Register Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.admissionNo}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" render={
                          <Link href={`/exams/marks/${standardId}/${s.id}`}>
                            <ClipboardList /> Marks
                          </Link>
                        } />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
