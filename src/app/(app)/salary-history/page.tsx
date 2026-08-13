import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";

export default async function SalaryHistoryIndexPage() {
  const teachers = await prisma.teacher.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <PageHeader title="Salary History" description="Full ledger timeline, revisions and payroll history per teacher" />

      <Card>
        <CardContent>
          {teachers.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No staff members added yet.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {teachers.map((t) => (
                  <Link
                    key={t.id}
                    href={`/salary-history/${t.id}`}
                    className="block rounded-xl border border-border p-3.5 transition hover:border-primary/50 hover:bg-accent/40"
                  >
                    <p className="font-medium">{t.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t.designation || "Staff"}</p>
                  </Link>
                ))}
              </div>

              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.designation || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" render={<Link href={`/salary-history/${t.id}`}><History /> View</Link>} />
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
