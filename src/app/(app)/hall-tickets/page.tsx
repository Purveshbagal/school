import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sortYears } from "@/lib/hall-tickets";
import { SearchParamSelect } from "./search-param-select";
import { Ticket } from "lucide-react";

export default async function HallTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;

  const [settings, examYears, ticketYears] = await Promise.all([
    prisma.schoolSettings.findUnique({ where: { id: "main" } }),
    prisma.exam.findMany({
      where: { NOT: { isFinal: true } },
      select: { academicYear: true },
      distinct: ["academicYear"],
    }),
    prisma.hallTicket.findMany({ select: { academicYear: true }, distinct: ["academicYear"] }),
  ]);
  const currentYear = settings?.academicYear || "2026-27";
  const years = sortYears(currentYear, [
    ...examYears.map((e) => e.academicYear),
    ...ticketYears.map((t) => t.academicYear),
  ]);
  const year = yearParam && years.includes(yearParam) ? yearParam : currentYear;
  const isCurrentYear = year === currentYear;

  const [standards, ticketCounts] = await Promise.all([
    prisma.standard.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { students: { where: { status: "ACTIVE" } } } } },
    }),
    prisma.hallTicket.groupBy({ by: ["standardId"], where: { academicYear: year }, _count: { _all: true } }),
  ]);
  const ticketsByStandard = new Map(ticketCounts.map((t) => [t.standardId, t._count._all]));

  const openHref = (standardId: string) => `/hall-tickets/${standardId}?year=${encodeURIComponent(year)}`;

  return (
    <div>
      <PageHeader
        title="Hall Tickets"
        description="Pick a standard to generate, view and download exam hall tickets"
        actions={
          <SearchParamSelect
            param="year"
            label="Academic Year"
            value={year}
            options={years.map((y) => ({ value: y, label: y === currentYear ? `${y} (Current)` : y }))}
            className="w-44"
          />
        }
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
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {isCurrentYear && <Badge variant="secondary">{s._count.students} students</Badge>}
                        <Badge variant={ticketsByStandard.get(s.id) ? "success" : "outline"}>
                          {ticketsByStandard.get(s.id) || 0} hall tickets
                        </Badge>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" render={
                      <Link href={openHref(s.id)}>
                        <Ticket /> Open
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
                    {isCurrentYear && <TableHead>Active Students</TableHead>}
                    <TableHead>Hall Tickets ({year})</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standards.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      {isCurrentYear && (
                        <TableCell>
                          <Badge variant="secondary">{s._count.students} active</Badge>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant={ticketsByStandard.get(s.id) ? "success" : "outline"}>
                          {ticketsByStandard.get(s.id) || 0} generated
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" render={
                          <Link href={openHref(s.id)}>
                            <Ticket /> Open
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
