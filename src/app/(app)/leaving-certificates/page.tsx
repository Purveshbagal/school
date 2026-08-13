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
import { DeleteButton } from "@/components/delete-button";
import { formatDate } from "@/lib/utils";
import { deleteLeavingCertificateAction } from "@/app/actions/leaving-certificates";
import { Plus, Printer, Pencil } from "lucide-react";

export default async function LeavingCertificatesPage() {
  const certificates = await prisma.leavingCertificate.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Leaving Certificate"
        description={`${certificates.length} certificate${certificates.length === 1 ? "" : "s"} issued`}
        actions={
          <Button render={<Link href="/leaving-certificates/new" />}>
            <Plus /> Create
          </Button>
        }
      />

      <Card>
        <CardContent>
          {certificates.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No leaving certificates issued yet. Click &quot;Create&quot; to issue one.
            </p>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="space-y-2.5 md:hidden">
                {certificates.map((c) => (
                  <div key={c.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{c.studentName}</p>
                        <p className="font-mono text-xs text-muted-foreground">{c.certificateNo}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{c.studyingStandard || "-"}</span>
                      <span>{formatDate(c.dateOfLeaving)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={
                          <Link href={`/leaving-certificates/${c.id}`} target="_blank">
                            <Printer />
                          </Link>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={<Link href={`/leaving-certificates/${c.id}/edit`}><Pencil /></Link>}
                      />
                      <DeleteButton
                        action={deleteLeavingCertificateAction}
                        hiddenFields={{ id: c.id, studentId: c.studentId }}
                        confirmMessage={`Delete leaving certificate ${c.certificateNo} for ${c.studentName}? The student's status will be reverted to Active. This cannot be undone.`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Certificate No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Register Number</TableHead>
                    <TableHead>Standard</TableHead>
                    <TableHead>Date of Leaving</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.certificateNo}</TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/students/${c.studentId}`} className="hover:text-primary hover:underline">
                          {c.studentName}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{c.registerNumber}</TableCell>
                      <TableCell>{c.studyingStandard || "-"}</TableCell>
                      <TableCell>{formatDate(c.dateOfLeaving)}</TableCell>
                      <TableCell>{formatDate(c.issueDate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            render={
                              <Link href={`/leaving-certificates/${c.id}`} target="_blank">
                                <Printer />
                              </Link>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            render={<Link href={`/leaving-certificates/${c.id}/edit`}><Pencil /></Link>}
                          />
                          <DeleteButton
                            action={deleteLeavingCertificateAction}
                            hiddenFields={{ id: c.id, studentId: c.studentId }}
                            confirmMessage={`Delete leaving certificate ${c.certificateNo} for ${c.studentName}? The student's status will be reverted to Active. This cannot be undone.`}
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
    </div>
  );
}
