import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/delete-button";
import { deleteExamScheduleAction } from "@/app/actions/exam-schedules";
import { SearchParamSelect } from "@/app/(app)/hall-tickets/search-param-select";
import { dayKey, TIME_ZONE } from "@/lib/tracking";
import { CalendarDays, Clock } from "lucide-react";
import { TimetableForm } from "./timetable-form";

const formatDay = (date: Date) =>
  date.toLocaleDateString("en-IN", { timeZone: TIME_ZONE, weekday: "short", day: "2-digit", month: "short", year: "numeric" });

/** "13:30" → "1:30 PM". */
function formatTime(hhmm: string | null): string | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export default async function ExamTimetablePage({ searchParams }: { searchParams: Promise<{ standard?: string }> }) {
  const { standard: standardParam } = await searchParams;
  const standards = await prisma.standard.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true } });
  const standard = standards.find((s) => s.id === standardParam) ?? standards[0];

  if (!standard) {
    return (
      <div>
        <PageHeader title="Exam Timetable" />
        <Card>
          <CardContent>
            <p className="py-8 text-center text-sm text-muted-foreground">
              No standards yet. Add them in{" "}
              <Link href="/standards" className="text-primary underline">
                Standards &amp; Fee Structure
              </Link>{" "}
              first.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [exams, rows, subjects] = await Promise.all([
    prisma.exam.findMany({ where: { isFinal: false }, orderBy: { examDate: "desc" } }),
    prisma.examSchedule.findMany({
      where: { standardId: standard.id },
      include: { exam: { select: { name: true, examDate: true } } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    prisma.subject.findMany({ where: { standardId: standard.id }, orderBy: { name: "asc" }, select: { name: true } }),
  ]);

  const today = dayKey(new Date());
  const groups = new Map<string, { name: string; examDate: Date; rows: typeof rows }>();
  for (const row of rows) {
    const group = groups.get(row.examId) ?? { name: row.exam.name, examDate: row.exam.examDate, rows: [] };
    group.rows.push(row);
    groups.set(row.examId, group);
  }
  // Exams still to come first (soonest on top), finished ones after.
  const sortedGroups = [...groups.entries()].sort(([, a], [, b]) => {
    const aDone = dayKey(a.rows[a.rows.length - 1].date) < today;
    const bDone = dayKey(b.rows[b.rows.length - 1].date) < today;
    if (aDone !== bDone) return aDone ? 1 : -1;
    return (a.rows[0].date.getTime() - b.rows[0].date.getTime()) * (aDone ? -1 : 1);
  });

  const upcomingExam = exams
    .filter((e) => dayKey(e.examEndDate ?? e.examDate) >= today)
    .sort((a, b) => a.examDate.getTime() - b.examDate.getTime())[0];
  const examOptions = exams.map((e) => ({
    id: e.id,
    label: `${e.name}${e.academicYear ? ` (${e.academicYear})` : ""}`,
  }));

  return (
    <div>
      <PageHeader
        title="Exam Timetable"
        description="Standard-wise exam dates — students see their upcoming papers in the student app"
      />

      <SearchParamSelect
        param="standard"
        label="Standard"
        value={standard.id}
        options={standards.map((s) => ({ value: s.id, label: s.name }))}
        className="mb-5 max-w-xs"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {sortedGroups.length === 0 ? (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                  <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
                  <p>No timetable for {standard.name} yet. Add papers using the form.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            sortedGroups.map(([examId, group]) => {
              const done = dayKey(group.rows[group.rows.length - 1].date) < today;
              return (
                <Card key={examId} className={done ? "opacity-70" : undefined}>
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      {group.name}
                      <Badge variant={done ? "outline" : "info"}>{done ? "Finished" : "Upcoming"}</Badge>
                      <span className="text-xs font-normal text-muted-foreground">
                        {group.rows.length} paper{group.rows.length === 1 ? "" : "s"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-border">
                      {group.rows.map((row) => {
                        const past = dayKey(row.date) < today;
                        const isToday = dayKey(row.date) === today;
                        const from = formatTime(row.startTime);
                        const to = formatTime(row.endTime);
                        return (
                          <div key={row.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                            <div className="min-w-0">
                              <p className={`font-medium ${past ? "text-muted-foreground" : ""}`}>
                                {row.subject || group.name}
                                {isToday && (
                                  <Badge variant="warning" className="ml-2">
                                    Today
                                  </Badge>
                                )}
                              </p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="h-3.5 w-3.5" /> {formatDay(row.date)}
                                </span>
                                {from && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" /> {from}
                                    {to ? ` – ${to}` : ""}
                                  </span>
                                )}
                              </p>
                            </div>
                            <DeleteButton
                              action={deleteExamScheduleAction}
                              hiddenFields={{ id: row.id }}
                              confirmMessage={`Remove ${row.subject || group.name} on ${formatDay(row.date)} from the timetable?`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Add Paper — {standard.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <TimetableForm
              key={standard.id}
              standardId={standard.id}
              exams={examOptions}
              subjects={subjects.map((s) => s.name)}
              defaultExamId={upcomingExam?.id ?? examOptions[0]?.id ?? ""}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
