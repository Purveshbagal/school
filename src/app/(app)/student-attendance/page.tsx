import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { PageHeader } from "@/components/page-header";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { studentAttendanceDayBounds, studentAttendanceToday } from "@/lib/student-attendance";
import { StudentAttendanceForm } from "./student-attendance-form";

export default async function StudentAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ standardId?: string; date?: string }>;
}) {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/dashboard");

  const { standardId: standardIdParam, date: dateParam } = await searchParams;
  const standards = await prisma.standard.findMany({
    orderBy: { order: "asc" },
    select: { id: true, name: true },
  });
  const standard = standards.find((item) => item.id === standardIdParam) ?? standards[0];
  const today = studentAttendanceToday();
  const date = dateParam && studentAttendanceDayBounds(dateParam) ? dateParam : today;
  const bounds = studentAttendanceDayBounds(date)!;

  const students = standard
    ? await prisma.student.findMany({
        where: { standardId: standard.id, status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, admissionNo: true },
      })
    : [];
  const attendance = students.length > 0
    ? await prisma.studentAttendance.findMany({
        where: { date: bounds.start, studentId: { in: students.map(({ id }) => id) } },
        select: { studentId: true, status: true },
      })
    : [];

  const savedStatuses = Object.fromEntries(attendance.map((entry) => [entry.studentId, entry.status]));

  return (
    <div>
      <PageHeader
        title="Student Attendance"
        description="Record daily attendance by class. This is separate from staff attendance and payroll."
      />

      <Card className="mb-5">
        <CardContent>
          {standards.length === 0 ? (
            <p className="py-5 text-center text-sm text-muted-foreground">
              Add a standard before recording student attendance.
            </p>
          ) : (
            <form action="/student-attendance" className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <label htmlFor="attendance-standard" className="text-xs text-muted-foreground">Class / Standard</label>
                <NativeSelect id="attendance-standard" name="standardId" defaultValue={standard?.id} className="w-48">
                  {standards.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="attendance-date" className="text-xs text-muted-foreground">Attendance date</label>
                <Input id="attendance-date" name="date" type="date" max={today} defaultValue={date} className="w-44" />
              </div>
              <Button type="submit" variant="outline">View roster</Button>
            </form>
          )}
        </CardContent>
      </Card>

      {standard && (
        <StudentAttendanceForm
          key={`${standard.id}-${date}`}
          standardId={standard.id}
          standardName={standard.name}
          date={date}
          students={students}
          savedStatuses={savedStatuses}
        />
      )}
    </div>
  );
}
