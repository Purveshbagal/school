import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getActiveSalaryStructure, getOutstandingAdvanceTotal, getPreviousPending, getNextPayrollPeriod } from "@/lib/payroll-data";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { formatCurrency, formatDate, formatDateInput } from "@/lib/utils";
import { MONTH_NAMES } from "@/lib/payroll-engine";
import { GeneratePayrollForm } from "./generate-payroll-form";
import { PaySalaryForm } from "./pay-salary-form";
import { LineItemForm } from "./line-item-form";
import { LockControls } from "./lock-controls";
import { deleteBonusAction } from "@/app/actions/payroll/bonuses";
import { deleteDeductionAction } from "@/app/actions/payroll/deductions";
import { DeleteButton } from "@/components/delete-button";
import { ArrowLeft, FileText, Printer } from "lucide-react";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "outline"> = {
  PAID: "success",
  PARTIALLY_PAID: "warning",
  GENERATED: "destructive",
};

export default async function TeacherPayrollPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const { id } = await params;
  const { month: monthParam, year: yearParam } = await searchParams;

  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) notFound();

  let month = Number(monthParam);
  let year = Number(yearParam);
  if (!month || !year) {
    const next = await getNextPayrollPeriod(id);
    month = next.month;
    year = next.year;
  }

  const now = new Date();
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i);

  const payroll = await prisma.payroll.findUnique({
    where: { teacherId_month_year: { teacherId: id, month, year } },
    include: { bonuses: { orderBy: { createdAt: "desc" } }, deductions: { orderBy: { createdAt: "desc" } }, payments: { orderBy: { paymentDate: "desc" } } },
  });

  const [structure, attendance, outstandingAdvance, previousPending] = await Promise.all([
    getActiveSalaryStructure(id),
    prisma.attendanceSummary.findUnique({ where: { teacherId_month_year: { teacherId: id, month, year } } }),
    getOutstandingAdvanceTotal(id),
    getPreviousPending(id, month, year),
  ]);

  return (
    <div>
      <PageHeader
        title={teacher.name}
        description={`${teacher.designation || "Staff"} — Payroll for ${MONTH_NAMES[month - 1]} ${year}`}
        actions={
          <Button variant="outline" size="sm" render={<Link href="/payroll">Back</Link>}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <form className="mb-6 flex flex-wrap items-end gap-3" action={`/payroll/${id}`}>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Month</label>
          <NativeSelect name="month" defaultValue={month} className="w-36">
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Year</label>
          <NativeSelect name="year" defaultValue={year} className="w-28">
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit" variant="outline">View Period</Button>
      </form>

      {!payroll ? (
        <GeneratePayrollForm
          teacherId={id}
          month={month}
          year={year}
          hasStructure={Boolean(structure)}
          hasAttendance={Boolean(attendance)}
          monthlySalary={structure?.monthlySalary || 0}
          outstandingAdvance={outstandingAdvance}
          previousPending={previousPending}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <Card className="border-t-2 border-t-primary">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" /> {payroll.invoiceNo}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[payroll.status] || "outline"}>{payroll.status.replace("_", " ")}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/salary-slips/${payroll.id}`} target="_blank"><Printer /> View Slip</Link>}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                  <Row label="Working Days" value={payroll.workingDays} />
                  <Row label="Present Days" value={payroll.presentDays} />
                  <Row label="Absent Days" value={payroll.absentDays} />
                  <Row label="Half Days" value={payroll.halfDays} />
                  <Row label="Paid Leave" value={payroll.paidLeaveDays} />
                  <Row label="Unpaid Leave" value={payroll.unpaidLeaveDays} />
                </dl>

                <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                  <Line label="Gross Salary" value={payroll.grossSalary} />
                  <Line label="Leave Deduction" value={-payroll.leaveDeduction} />
                  <Line label="Half Day Deduction" value={-payroll.halfDayDeduction} />
                  <Line label="Late Deduction" value={-payroll.lateDeduction} />
                  <Line label="Other Deductions" value={-payroll.otherDeductionsTotal} />
                  <Line label="Bonus" value={payroll.bonusTotal} />
                  <Line label="Advance Applied" value={-payroll.advanceApplied} />
                  <Line label="Previous Pending" value={payroll.previousPending} />
                  <div className="flex items-center justify-between border-t border-border pt-2 font-semibold">
                    <span>Net Payable</span>
                    <span>{formatCurrency(payroll.netPayable)}</span>
                  </div>
                  <Line label="Paid" value={payroll.paidAmount} />
                  <div className="flex items-center justify-between font-semibold text-destructive">
                    <span>Pending</span>
                    <span>{formatCurrency(payroll.pendingAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bonuses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {payroll.bonuses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bonuses added.</p>
                ) : (
                  payroll.bonuses.map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm">
                      <div>
                        <span className="font-medium">{b.type}</span>{" "}
                        <span className="text-muted-foreground">{b.note}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-success">{formatCurrency(b.amount)}</span>
                        {!payroll.locked && (
                          <DeleteButton
                            action={deleteBonusAction}
                            hiddenFields={{ id: b.id, payrollId: payroll.id }}
                            confirmMessage="Remove this bonus?"
                          />
                        )}
                      </div>
                    </div>
                  ))
                )}
                {!payroll.locked && (
                  <LineItemForm
                    kind="bonus"
                    payrollId={payroll.id}
                    types={["FESTIVAL", "PERFORMANCE", "YEARLY", "MANUAL"]}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deductions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {payroll.deductions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No manual deductions added.</p>
                ) : (
                  payroll.deductions.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm">
                      <div>
                        <span className="font-medium">{d.type}</span>{" "}
                        <span className="text-muted-foreground">{d.note}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-destructive">{formatCurrency(d.amount)}</span>
                        {!payroll.locked && (
                          <DeleteButton
                            action={deleteDeductionAction}
                            hiddenFields={{ id: d.id, payrollId: payroll.id }}
                            confirmMessage="Remove this deduction?"
                          />
                        )}
                      </div>
                    </div>
                  ))
                )}
                {!payroll.locked && (
                  <LineItemForm
                    kind="deduction"
                    payrollId={payroll.id}
                    types={["PENALTY", "LOAN", "FINE", "ADVANCE_RECOVERY", "OTHER"]}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {payroll.payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                ) : (
                  payroll.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm">
                      <div>
                        <span className="font-medium">{formatCurrency(p.amount)}</span>{" "}
                        <span className="text-muted-foreground">via {p.paymentMode} on {formatDate(p.paymentDate)}</span>
                        {p.referenceNo && <span className="text-muted-foreground"> · Ref: {p.referenceNo}</span>}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {!payroll.locked && payroll.pendingAmount > 0 && (
              <PaySalaryForm
                key={payroll.pendingAmount}
                payrollId={payroll.id}
                pendingAmount={payroll.pendingAmount}
                today={formatDateInput(new Date())}
              />
            )}
            <LockControls payrollId={payroll.id} locked={payroll.locked} lockedBy={payroll.lockedBy} lockedAt={payroll.lockedAt} />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className={value < 0 ? "text-destructive" : value > 0 ? "text-foreground" : ""}>{formatCurrency(value)}</span>
    </div>
  );
}
