import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteButton } from "@/components/delete-button";
import { createSubjectAction, deleteSubjectAction } from "@/app/actions/subjects";
import { Pencil, Plus } from "lucide-react";

export default async function StandardSubjectsPage({
  params,
}: {
  params: Promise<{ standardId: string }>;
}) {
  const { standardId } = await params;

  const standard = await prisma.standard.findUnique({ where: { id: standardId } });
  if (!standard) notFound();

  const subjects = await prisma.subject.findMany({
    where: { standardId },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title={`Subjects — ${standard.name}`}
        description={`${subjects.length} subject${subjects.length === 1 ? "" : "s"}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>All Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No subjects added yet for {standard.name}. Add one using the form.
              </p>
            ) : (
              <>
                {/* Mobile card list */}
                <div className="space-y-3 md:hidden">
                  {subjects.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-3.5">
                      <p className="font-medium">{sub.name}</p>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          render={<Link href={`/subjects/${standardId}/${sub.id}/edit`}><Pencil /></Link>}
                        />
                        <DeleteButton
                          action={deleteSubjectAction}
                          hiddenFields={{ id: sub.id, standardId }}
                          confirmMessage={`Delete subject "${sub.name}"? This cannot be undone.`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <Table className="hidden md:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjects.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              render={<Link href={`/subjects/${standardId}/${sub.id}/edit`}><Pencil /></Link>}
                            />
                            <DeleteButton
                              action={deleteSubjectAction}
                              hiddenFields={{ id: sub.id, standardId }}
                              confirmMessage={`Delete subject "${sub.name}"? This cannot be undone.`}
                            />
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
            <CardTitle>Add Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createSubjectAction} className="space-y-4">
              <input type="hidden" name="standardId" value={standardId} />
              <div className="space-y-1.5">
                <Label htmlFor="name">Subject Name</Label>
                <Input id="name" name="name" placeholder="e.g. Mathematics, Science" required />
              </div>
              <Button type="submit" className="w-full">
                <Plus /> Add Subject
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
