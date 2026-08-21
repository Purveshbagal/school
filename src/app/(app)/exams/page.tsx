import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteButton } from "@/components/delete-button";
import { formatDate } from "@/lib/utils";
import { createExamAction, deleteExamAction } from "@/app/actions/exams";
import { ensureFinalResultExam } from "@/lib/exams";
import { ExamLinkActions } from "./exam-link-actions";
import { Plus } from "lucide-react";

export default async function ExamsPage() {
  await ensureFinalResultExam();

  const [exams, hdrs] = await Promise.all([
    prisma.exam.findMany({ orderBy: [{ isFinal: "desc" }, { examDate: "desc" }] }),
    headers(),
  ]);
  const host = hdrs.get("host") || "localhost:3000";
  const protocol = hdrs.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return (
    <div>
      <PageHeader
        title="Set Exam"
        description="Create exams/terms and manage their public result links"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>All Exams</CardTitle>
          </CardHeader>
          <CardContent>
            {exams.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No exams added yet. Add one using the form.
              </p>
            ) : (
              <>
                {/* Mobile card list */}
                <div className="space-y-3 md:hidden">
                  {exams.map((exam) => (
                    <div
                      key={exam.id}
                      className={`rounded-xl border p-3.5 ${exam.isFinal ? "border-blue-200 bg-blue-50" : "border-border"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="flex items-center gap-1.5 font-medium">
                            {exam.name}
                            {exam.isFinal && <Badge variant="info">Default</Badge>}
                          </p>
                          {exam.isFinal ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Combined result across all terms, for parents
                            </p>
                          ) : (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Exam: {formatDate(exam.examDate)} · Result: {formatDate(exam.resultDate)}
                            </p>
                          )}
                        </div>
                        <Badge variant={exam.resultLinkActive ? "success" : "outline"}>
                          {exam.resultLinkActive ? "Link Active" : "Link Off"}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        {exam.isFinal ? (
                          <span />
                        ) : (
                          <DeleteButton
                            action={deleteExamAction}
                            hiddenFields={{ id: exam.id }}
                            confirmMessage={`Delete exam "${exam.name}"? This will also delete all marks entered for it. This cannot be undone.`}
                          />
                        )}
                        <ExamLinkActions
                          examId={exam.id}
                          resultToken={exam.resultToken}
                          resultLinkActive={exam.resultLinkActive}
                          origin={origin}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <Table className="hidden md:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam / Term</TableHead>
                      <TableHead>Exam Date</TableHead>
                      <TableHead>Result Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Result Link</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exams.map((exam) => (
                      <TableRow key={exam.id} className={exam.isFinal ? "bg-blue-50" : undefined}>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-1.5">
                            {exam.name}
                            {exam.isFinal && <Badge variant="info">Default</Badge>}
                          </span>
                        </TableCell>
                        <TableCell>{exam.isFinal ? "-" : formatDate(exam.examDate)}</TableCell>
                        <TableCell>{exam.isFinal ? "-" : formatDate(exam.resultDate)}</TableCell>
                        <TableCell>
                          <Badge variant={exam.resultLinkActive ? "success" : "outline"}>
                            {exam.resultLinkActive ? "Active" : "Off"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <ExamLinkActions
                            examId={exam.id}
                            resultToken={exam.resultToken}
                            resultLinkActive={exam.resultLinkActive}
                            origin={origin}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {!exam.isFinal && (
                            <DeleteButton
                              action={deleteExamAction}
                              hiddenFields={{ id: exam.id }}
                              confirmMessage={`Delete exam "${exam.name}"? This will also delete all marks entered for it. This cannot be undone.`}
                            />
                          )}
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
            <CardTitle>Add Exam</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createExamAction} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Exam / Term Name</Label>
                <Input id="name" name="name" placeholder="e.g. Unit Test 1, Term 1" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="examDate">Exam Date</Label>
                <Input id="examDate" name="examDate" type="date" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="resultDate">Result Date</Label>
                <Input id="resultDate" name="resultDate" type="date" required />
              </div>
              <Button type="submit" className="w-full">
                <Plus /> Add Exam
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
