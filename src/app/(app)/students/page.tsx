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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { formatCurrency } from "@/lib/utils";
import { getStudentFeeSummary } from "@/lib/fees";
import { deleteStudentAction } from "@/app/actions/students";
import { StudentsFilters } from "./students-filters";
import { StudentsBoardTabs } from "./students-board-tabs";
import { UserPlus } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";

const CBSE = "CBSE";
const STATE_BOARD = "Maharashtra State Board";
const PRE_PRIMARY = "PRE_PRIMARY";
const PRE_PRIMARY_STANDARDS = ["LKG", "UKG"];

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; standard?: string; village?: string; status?: string; board?: string }>;
}) {
  const { q, standard, village, status, board } = await searchParams;

  const [standards, districts] = await Promise.all([
    prisma.standard.findMany({ orderBy: { order: "asc" } }),
    prisma.district.findMany({
      orderBy: { name: "asc" },
      include: { talukas: { orderBy: { name: "asc" }, include: { villages: { orderBy: { name: "asc" } } } } },
    }),
  ]);

  const villages = districts.flatMap((d) =>
    d.talukas.flatMap((t) => t.villages.map((v) => ({ id: v.id, name: v.name, taluka: t.name })))
  );

  const baseWhere: Prisma.StudentWhereInput = {
    ...(standard ? { standardId: standard } : {}),
    ...(village ? { villageId: village } : {}),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { admissionNo: { contains: q, mode: "insensitive" } },
            { fatherName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  const activeWhere: Prisma.StudentWhereInput =
    board === PRE_PRIMARY
      ? { ...baseWhere, standard: { name: { in: PRE_PRIMARY_STANDARDS } } }
      : { ...baseWhere, ...(board ? { board } : {}) };

  const [students, totalCount, prePrimaryCount, cbseCount, stateBoardCount] = await Promise.all([
    prisma.student.findMany({
      where: activeWhere,
      include: { standard: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.student.count({ where: baseWhere }),
    prisma.student.count({
      where: { ...baseWhere, standard: { name: { in: PRE_PRIMARY_STANDARDS } } },
    }),
    prisma.student.count({ where: { ...baseWhere, board: CBSE } }),
    prisma.student.count({ where: { ...baseWhere, board: STATE_BOARD } }),
  ]);

  const tabs = [
    { label: "All", value: "", count: totalCount },
    { label: "Pre-Primary", value: PRE_PRIMARY, count: prePrimaryCount },
    { label: "CBSE Students", value: CBSE, count: cbseCount },
    { label: "State Board Students", value: STATE_BOARD, count: stateBoardCount },
  ];

  const summaries = await Promise.all(
    students.map((s) => getStudentFeeSummary(s.id))
  );

  return (
    <div>
      <PageHeader
        title="Students"
        description={`${students.length} student${students.length === 1 ? "" : "s"} found`}
        actions={
          <Button render={<Link href="/students/new" />}>
            <UserPlus /> New Admission
          </Button>
        }
      />

      <Card>
        <CardContent>
          <StudentsBoardTabs tabs={tabs} />
          <StudentsFilters standards={standards} villages={villages} />

          {students.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No students found. Try adjusting filters or add a new admission.
            </p>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="space-y-3 md:hidden">
                {students.map((s, i) => {
                  const sum = summaries[i];
                  return (
                    <div key={s.id} className="rounded-xl border border-border p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/students/${s.id}`} className="font-medium hover:text-primary hover:underline">
                            {s.name}
                          </Link>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{s.admissionNo}</p>
                        </div>
                        <Badge variant={s.status === "ACTIVE" ? "success" : "outline"} className="shrink-0">
                          {s.status}
                        </Badge>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                        <div>
                          <dt className="text-muted-foreground">Standard</dt>
                          <dd className="font-medium">{s.standard.name}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Phone</dt>
                          <dd className="font-medium">{s.phone || "-"}</dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-muted-foreground">Father&apos;s Name</dt>
                          <dd className="font-medium">{s.fatherName || "-"}</dd>
                        </div>
                      </dl>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        {sum && sum.due > 0 ? (
                          <Badge variant="destructive">Due {formatCurrency(sum.due)}</Badge>
                        ) : sum && sum.advance > 0 ? (
                          <Badge variant="info">Advance {formatCurrency(sum.advance)}</Badge>
                        ) : (
                          <Badge variant="success">Paid</Badge>
                        )}
                        <div className="flex gap-1.5">
                          <Button variant="outline" size="sm" render={<Link href={`/students/${s.id}`}>View</Link>} />
                          <DeleteButton
                            action={deleteStudentAction}
                            hiddenFields={{ id: s.id }}
                            confirmMessage={`Delete ${s.name}? This will also delete all of their payment records, certificates, and stationary sale records. This cannot be undone.`}
                          />
                        </div>
                      </div>
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
                    <TableHead>Standard</TableHead>
                    <TableHead>Father&apos;s Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Fee Status</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s, i) => {
                    const sum = summaries[i];
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.admissionNo}</TableCell>
                        <TableCell className="font-medium">
                          <Link href={`/students/${s.id}`} className="hover:text-primary hover:underline">
                            {s.name}
                          </Link>
                        </TableCell>
                        <TableCell>{s.standard.name}</TableCell>
                        <TableCell>{s.fatherName || "-"}</TableCell>
                        <TableCell>{s.phone || "-"}</TableCell>
                        <TableCell>
                          {sum && sum.due > 0 ? (
                            <Badge variant="destructive">Due {formatCurrency(sum.due)}</Badge>
                          ) : sum && sum.advance > 0 ? (
                            <Badge variant="info">Advance {formatCurrency(sum.advance)}</Badge>
                          ) : (
                            <Badge variant="success">Paid</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.status === "ACTIVE" ? "success" : "outline"}>
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button variant="outline" size="sm" render={<Link href={`/students/${s.id}`}>View</Link>} />
                            <DeleteButton
                              action={deleteStudentAction}
                              hiddenFields={{ id: s.id }}
                              confirmMessage={`Delete ${s.name}? This will also delete all of their payment records, certificates, and stationary sale records. This cannot be undone.`}
                            />
                          </div>
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
    </div>
  );
}
