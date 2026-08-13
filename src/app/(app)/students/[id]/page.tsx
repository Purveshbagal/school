import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentFeeSummary } from "@/lib/fees";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatCurrency, formatDate, formatDateInput } from "@/lib/utils";
import { PaymentForm } from "@/components/payment-form";
import { deleteStudentAction } from "@/app/actions/students";
import { deletePaymentAction } from "@/app/actions/payments";
import { Pencil, Receipt, Printer, FileText } from "lucide-react";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const summary = await getStudentFeeSummary(id);
  if (!summary) notFound();

  const { student, standardFee, busFee, totalFee, totalPaid, due, advance, feeStructure } = summary;

  return (
    <div>
      <PageHeader
        title={student.name}
        description={`Register Number: ${student.admissionNo} · Standard ${student.standard.name} · ${student.academicYear}`}
        actions={
          <>
            <Button
              variant="outline"
              render={
                <Link href={`/admission-form/${id}`} target="_blank">
                  <FileText /> Admission Form
                </Link>
              }
            />
            <Button variant="outline" render={<Link href={`/students/${id}/edit`}><Pencil /> Edit</Link>} />
            <DeleteButton
              action={deleteStudentAction}
              hiddenFields={{ id }}
              confirmMessage={`Delete ${student.name}? This will also delete all of their payment records, certificates, and stationary sale records. This cannot be undone.`}
              label="Delete"
              size="default"
              className="border border-transparent hover:border-destructive/20"
            />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <Card size="sm" className="border-t-2 border-t-primary">
              <CardContent>
                <p className="text-xs text-muted-foreground">Total Fee</p>
                <p className="mt-1 text-lg font-semibold">{formatCurrency(totalFee)}</p>
                {busFee > 0 && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Student: {formatCurrency(standardFee)} + Bus: {formatCurrency(busFee)}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card size="sm" className="border-t-2 border-t-success">
              <CardContent>
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="mt-1 text-lg font-semibold text-success">
                  {formatCurrency(totalPaid)}
                </p>
              </CardContent>
            </Card>
            <Card size="sm" className={`col-span-2 border-t-2 sm:col-span-1 ${due > 0 ? "border-t-destructive" : "border-t-info"}`}>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {due > 0 ? "Balance Due" : "Advance Balance"}
                </p>
                <p className={`mt-1 text-lg font-semibold ${due > 0 ? "text-destructive" : "text-info"}`}>
                  {formatCurrency(due > 0 ? due : advance)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Student Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Father&apos;s Name</dt>
                  <dd className="font-medium">{student.fatherName || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Mother&apos;s Name</dt>
                  <dd className="font-medium">{student.motherName || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Gender</dt>
                  <dd className="font-medium">{student.gender || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Date of Birth</dt>
                  <dd className="font-medium">{formatDate(student.dob)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Birth Place</dt>
                  <dd className="font-medium">{student.birthPlace || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Aadhar Number</dt>
                  <dd className="font-medium">{student.aadharNumber || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="font-medium">{student.phone || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Mother Tongue</dt>
                  <dd className="font-medium">{student.motherTongue || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Religion</dt>
                  <dd className="font-medium">{student.religion || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Caste</dt>
                  <dd className="font-medium">{student.caste || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Sub Caste</dt>
                  <dd className="font-medium">{student.subCaste || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Medium</dt>
                  <dd className="font-medium">{student.medium || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Board</dt>
                  <dd className="font-medium">{student.board || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">School Bus</dt>
                  <dd className="font-medium">{student.schoolBus ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Admission Date</dt>
                  <dd className="font-medium">{formatDate(student.admissionDate)}</dd>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <dt className="text-muted-foreground">Address</dt>
                  <dd className="font-medium">{student.address || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Village</dt>
                  <dd className="font-medium">{student.village || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Taluka</dt>
                  <dd className="font-medium">{student.taluka || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">District</dt>
                  <dd className="font-medium">{student.district || "-"}</dd>
                </div>
                {feeStructure && (
                  <div className="col-span-2 sm:col-span-3">
                    <dt className="mb-1 text-muted-foreground">Fee Components</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {feeStructure.components.map((c) => (
                        <Badge key={c.id} variant="info">
                          {c.name}: {formatCurrency(c.amount)}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {student.payments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No payments recorded yet.
                </p>
              ) : (
                <>
                  {/* Mobile card list */}
                  <div className="space-y-2.5 md:hidden">
                    {student.payments.map((p) => (
                      <div key={p.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-mono text-xs text-muted-foreground">{p.receiptNo}</p>
                            <p className="mt-0.5 text-sm font-medium">{formatCurrency(p.amount)}</p>
                          </div>
                          <Badge variant="outline">{p.mode}</Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">{formatDate(p.paymentDate)}</p>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              render={
                                <Link href={`/receipts/${p.id}`} target="_blank">
                                  <Printer />
                                </Link>
                              }
                            />
                            <DeleteButton
                              action={deletePaymentAction}
                              hiddenFields={{ id: p.id, studentId: id }}
                              confirmMessage={`Delete receipt ${p.receiptNo}? This cannot be undone.`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <Table className="hidden md:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {student.payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs">{p.receiptNo}</TableCell>
                          <TableCell>{formatDate(p.paymentDate)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{p.mode}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{formatCurrency(p.amount)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                render={
                                  <Link href={`/receipts/${p.id}`} target="_blank">
                                    <Printer />
                                  </Link>
                                }
                              />
                              <DeleteButton
                                action={deletePaymentAction}
                                hiddenFields={{ id: p.id, studentId: id }}
                                confirmMessage={`Delete receipt ${p.receiptNo}? This cannot be undone.`}
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

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Record Fee Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentForm
                studentId={id}
                suggestedAmount={Math.max(due, 0)}
                totalFee={totalFee}
                totalPaid={totalPaid}
                due={due > 0 ? due : -advance}
                today={formatDateInput(new Date())}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
