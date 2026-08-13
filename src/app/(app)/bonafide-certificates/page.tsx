import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { deleteBonafideCertificateAction } from "@/app/actions/bonafide-certificates";
import { Plus, Printer, Pencil, Search } from "lucide-react";

export default async function BonafideCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const certificates = await prisma.bonafideCertificate.findMany({
    where: q
      ? {
          OR: [
            { studentName: { contains: q, mode: "insensitive" } },
            { certificateNo: { contains: q, mode: "insensitive" } },
            { registerNumber: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Bonafide Certificate"
        description={`${certificates.length} certificate${certificates.length === 1 ? "" : "s"} issued`}
        actions={
          <Button render={<Link href="/bonafide-certificates/new" />}>
            <Plus /> Create Bonafide
          </Button>
        }
      />

      <Card>
        <CardContent>
          <form className="mb-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search history by name, certificate no, register number..."
                className="pl-8"
              />
            </div>
          </form>

          {certificates.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {q
                ? "No matching certificates found."
                : 'No bonafide certificates issued yet. Click "Create Bonafide" to issue one.'}
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
                      <span>{c.standard || "-"}</span>
                      <span>{formatDate(c.issueDate)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={
                          <Link href={`/bonafide-certificates/${c.id}`} target="_blank">
                            <Printer />
                          </Link>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={<Link href={`/bonafide-certificates/${c.id}/edit`}><Pencil /></Link>}
                      />
                      <DeleteButton
                        action={deleteBonafideCertificateAction}
                        hiddenFields={{ id: c.id }}
                        confirmMessage={`Delete bonafide certificate ${c.certificateNo} for ${c.studentName}? This cannot be undone.`}
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
                      <TableCell>{c.standard || "-"}</TableCell>
                      <TableCell>{formatDate(c.issueDate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            render={
                              <Link href={`/bonafide-certificates/${c.id}`} target="_blank">
                                <Printer />
                              </Link>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            render={<Link href={`/bonafide-certificates/${c.id}/edit`}><Pencil /></Link>}
                          />
                          <DeleteButton
                            action={deleteBonafideCertificateAction}
                            hiddenFields={{ id: c.id }}
                            confirmMessage={`Delete bonafide certificate ${c.certificateNo} for ${c.studentName}? This cannot be undone.`}
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
