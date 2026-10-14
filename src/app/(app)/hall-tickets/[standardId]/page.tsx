import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { deleteHallTicketAction } from "@/app/actions/hall-tickets";
import { examBelongsToYear, formatExamDateRange } from "@/lib/hall-tickets";
import { SearchParamSelect } from "../search-param-select";
import { HallTicketDialog, type ExamDefaults, type TicketFields } from "./hall-ticket-dialog";
import { DownloadAllHallTickets } from "./download-all-hall-tickets";
import { ArrowLeft, Eye } from "lucide-react";

export default async function HallTicketStandardPage({
  params,
  searchParams,
}: {
  params: Promise<{ standardId: string }>;
  searchParams: Promise<{ year?: string; exam?: string }>;
}) {
  const { standardId } = await params;
  const { year: yearParam, exam: examParam } = await searchParams;
  if (!/^[a-f\d]{24}$/i.test(standardId)) notFound();

  const [standard, settings, allExams] = await Promise.all([
    prisma.standard.findUnique({ where: { id: standardId } }),
    prisma.schoolSettings.findUnique({ where: { id: "main" } }),
    prisma.exam.findMany({ where: { NOT: { isFinal: true } }, orderBy: { examDate: "desc" } }),
  ]);
  if (!standard) notFound();

  const currentYear = settings?.academicYear || "2026-27";
  const year = yearParam || currentYear;
  const isCurrentYear = year === currentYear;
  const schoolName = settings?.name || "School Name";

  const exams = allExams.filter((e) => examBelongsToYear(e.academicYear, year, currentYear));
  const selectedExam = exams.find((e) => e.id === examParam) ?? exams[0] ?? null;

  const [tickets, activeStudents] = await Promise.all([
    exams.length
      ? prisma.hallTicket.findMany({
          where: { standardId, examId: { in: exams.map((e) => e.id) } },
          include: { student: { select: { id: true, name: true, admissionNo: true, photoUrl: true } } },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    // Past years list only the students who were issued tickets then — today's active
    // students of this standard have since been promoted into it.
    isCurrentYear
      ? prisma.student.findMany({
          where: { standardId, status: "ACTIVE" },
          select: { id: true, name: true, admissionNo: true, photoUrl: true },
        })
      : Promise.resolve([]),
  ]);

  const selectedTickets = selectedExam ? tickets.filter((t) => t.examId === selectedExam.id) : [];

  // Active students plus anyone already holding a ticket for the selected exam (e.g.
  // marked inactive after it was issued), so issued tickets never disappear from the list.
  const studentsById = new Map(activeStudents.map((s) => [s.id, s]));
  for (const t of selectedTickets) if (!studentsById.has(t.student.id)) studentsById.set(t.student.id, t.student);
  const students = [...studentsById.values()].sort((a, b) => a.name.localeCompare(b.name));

  const ticketFieldsByStudent = new Map<string, Record<string, TicketFields>>();
  for (const t of tickets) {
    const byExam = ticketFieldsByStudent.get(t.studentId) ?? {};
    byExam[t.examId] = { seatNo: t.seatNo, blockNo: t.blockNo ?? "", centerName: t.centerName ?? schoolName };
    ticketFieldsByStudent.set(t.studentId, byExam);
  }
  const selectedTicketByStudent = new Map(selectedTickets.map((t) => [t.studentId, t]));

  // Pre-fill a new ticket with the next seat number and the last block number used in
  // this standard for that exam, so a class can be issued one after another quickly.
  const defaults: Record<string, ExamDefaults> = {};
  for (const exam of exams) {
    const examTickets = tickets.filter((t) => t.examId === exam.id);
    const seatNumbers = examTickets.filter((t) => /^\d+$/.test(t.seatNo)).map((t) => Number(t.seatNo));
    defaults[exam.id] = {
      seatNo: seatNumbers.length ? String(Math.max(...seatNumbers) + 1) : "",
      blockNo: examTickets.at(-1)?.blockNo ?? "",
    };
  }

  const examOptions = exams.map((e) => ({
    id: e.id,
    name: e.name,
    dateRange: formatExamDateRange(e.examDate, e.examEndDate),
  }));

  const backHref = `/hall-tickets?year=${encodeURIComponent(year)}`;

  function actionsFor(student: (typeof students)[number]) {
    if (!selectedExam) return null;
    const ticket = selectedTicketByStudent.get(student.id);
    const dialog = (
      <HallTicketDialog
        student={{
          id: student.id,
          name: student.name,
          admissionNo: student.admissionNo,
          standardName: standard!.name,
          hasPhoto: Boolean(student.photoUrl),
        }}
        exams={examOptions}
        pageExamId={selectedExam.id}
        existing={ticketFieldsByStudent.get(student.id) ?? {}}
        defaults={defaults}
        defaultCenterName={schoolName}
      />
    );
    if (!ticket) return dialog;
    return (
      <>
        <Button size="sm" render={
          <Link href={`/hall-tickets/view/${ticket.id}`}>
            <Eye /> View Hall Ticket
          </Link>
        } />
        {dialog}
        <DeleteButton
          action={deleteHallTicketAction}
          hiddenFields={{ id: ticket.id }}
          confirmMessage={`Delete ${student.name}'s hall ticket for ${selectedExam.name}?`}
        />
      </>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Hall Tickets — ${standard.name}`}
        description={`${year} · ${students.length} student${students.length === 1 ? "" : "s"} · ${selectedTickets.length} hall ticket${selectedTickets.length === 1 ? "" : "s"} generated`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" render={
              <Link href={backHref}>
                <ArrowLeft /> Back
              </Link>
            } />
            {selectedExam && (
              <DownloadAllHallTickets
                standardId={standardId}
                examId={selectedExam.id}
                count={selectedTickets.length}
                fileName={`Hall-Tickets-${standard.name}-${selectedExam.name}`.replace(/\s+/g, "-")}
              />
            )}
          </div>
        }
      />

      {!selectedExam ? (
        <Card>
          <CardContent>
            <p className="py-8 text-center text-sm text-muted-foreground">
              No exams set for {year}. Add the exam with its dates in{" "}
              <Link href="/exams" className="font-medium text-primary hover:underline">
                Examination → Set Exam
              </Link>{" "}
              first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <SearchParamSelect
                param="exam"
                label="Exam"
                value={selectedExam.id}
                options={exams.map((e) => ({ value: e.id, label: e.name }))}
                className="sm:w-64"
              />
              <p className="text-sm text-muted-foreground">
                Exam Date:{" "}
                <span className="font-medium text-foreground">
                  {formatExamDateRange(selectedExam.examDate, selectedExam.examEndDate)}
                </span>
              </p>
            </div>

            {students.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {isCurrentYear
                  ? `No active students found in ${standard.name}.`
                  : `No hall tickets were generated for ${standard.name} in ${year}.`}
              </p>
            ) : (
              <>
                {/* Mobile card list */}
                <div className="space-y-3 md:hidden">
                  {students.map((s) => {
                    const ticket = selectedTicketByStudent.get(s.id);
                    return (
                      <div key={s.id} className="rounded-xl border border-border p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium">{s.name}</p>
                            <p className="mt-0.5 font-mono text-xs text-muted-foreground">{s.admissionNo}</p>
                          </div>
                          <Badge variant={ticket ? "success" : "outline"} className="shrink-0">
                            {ticket ? "Generated" : "Pending"}
                          </Badge>
                        </div>
                        {ticket && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Seat No <span className="font-semibold text-foreground">{ticket.seatNo}</span>
                            {ticket.blockNo && (
                              <>
                                {" "}· Block No <span className="font-semibold text-foreground">{ticket.blockNo}</span>
                              </>
                            )}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5">{actionsFor(s)}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <Table className="hidden md:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Register Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Seat No</TableHead>
                      <TableHead>Block No</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => {
                      const ticket = selectedTicketByStudent.get(s.id);
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-xs">{s.admissionNo}</TableCell>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{ticket?.seatNo || "-"}</TableCell>
                          <TableCell>{ticket?.blockNo || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={ticket ? "success" : "outline"}>{ticket ? "Generated" : "Pending"}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">{actionsFor(s)}</div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
