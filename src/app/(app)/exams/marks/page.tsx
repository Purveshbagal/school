import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";

export default async function StudentsMarksPage() {
  const standards = await prisma.standard.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { students: { where: { status: "ACTIVE" } } } } },
  });

  return (
    <div>
      <PageHeader
        title="Students Marks"
        description="Pick a standard to enter marks for its active students"
      />

      <Card>
        <CardContent>
          {standards.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No standards added yet. Add standards first from Students → Standards & Fee Structure.
            </p>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="space-y-3 md:hidden">
                {standards.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-3.5">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <Badge variant="secondary" className="mt-1.5">{s._count.students} active students</Badge>
                    </div>
                    <Button variant="outline" size="sm" render={
                      <Link href={`/exams/marks/${s.id}`}>
                        <ClipboardList /> Open
                      </Link>
                    } />
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Standard</TableHead>
                    <TableHead>Active Students</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standards.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{s._count.students} active</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" render={
                          <Link href={`/exams/marks/${s.id}`}>
                            <ClipboardList /> Open
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
