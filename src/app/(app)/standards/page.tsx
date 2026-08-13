import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteButton } from "@/components/delete-button";
import { formatCurrency } from "@/lib/utils";
import { createStandardAction, deleteStandardAction } from "@/app/actions/standards";
import { Pencil, Plus, Trash2 } from "lucide-react";

export default async function StandardsPage() {
  const settings = await prisma.schoolSettings.findUnique({ where: { id: "main" } });
  const academicYear = settings?.academicYear || "2026-27";

  const standards = await prisma.standard.findMany({
    orderBy: { order: "asc" },
    include: {
      _count: { select: { students: true } },
      feeStructures: { where: { academicYear } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Standards & Fee Structure"
        description={`Manage class-wise fee structure for academic year ${academicYear}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>All Standards</CardTitle>
          </CardHeader>
          <CardContent>
            {standards.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No standards added yet. Add your first standard using the form.
              </p>
            ) : (
              <>
                {/* Mobile card list */}
                <div className="space-y-3 md:hidden">
                  {standards.map((s) => (
                    <div key={s.id} className="rounded-xl border border-border p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{s.name}</p>
                        <Badge variant="secondary">{s._count.students} students</Badge>
                      </div>
                      <p className="mt-1.5 text-sm">
                        {s.feeStructures[0] ? (
                          <span className="font-medium">{formatCurrency(s.feeStructures[0].totalAmount)}</span>
                        ) : (
                          <span className="text-muted-foreground">Fee not set</span>
                        )}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Button variant="outline" size="sm" render={
                          <Link href={`/standards/${s.id}`}>
                            <Pencil /> Fee Structure
                          </Link>
                        } />
                        {s._count.students === 0 ? (
                          <DeleteButton
                            action={deleteStandardAction}
                            hiddenFields={{ id: s.id }}
                            confirmMessage={`Delete standard "${s.name}"? This cannot be undone.`}
                          />
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled
                            title="Cannot delete: students are enrolled in this standard"
                            className="text-muted-foreground/40"
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <Table className="hidden md:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Standard</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Annual Fee</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standards.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{s._count.students} students</Badge>
                        </TableCell>
                        <TableCell>
                          {s.feeStructures[0] ? (
                            formatCurrency(s.feeStructures[0].totalAmount)
                          ) : (
                            <span className="text-muted-foreground">Not set</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button variant="outline" size="sm" render={
                              <Link href={`/standards/${s.id}`}>
                                <Pencil /> Fee Structure
                              </Link>
                            } />
                            {s._count.students === 0 ? (
                              <DeleteButton
                                action={deleteStandardAction}
                                hiddenFields={{ id: s.id }}
                                confirmMessage={`Delete standard "${s.name}"? This cannot be undone.`}
                              />
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled
                                title="Cannot delete: students are enrolled in this standard"
                                className="text-muted-foreground/40"
                              >
                                <Trash2 />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Standard</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createStandardAction} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Standard Name</Label>
                <Input id="name" name="name" placeholder="e.g. 1st, 2nd, 10th" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="order">Display Order</Label>
                <Input key={standards.length} id="order" name="order" type="number" defaultValue={standards.length + 1} />
              </div>
              <Button type="submit" className="w-full">
                <Plus /> Add Standard
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
