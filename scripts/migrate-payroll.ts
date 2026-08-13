/**
 * One-time migration: TeacherAdvance + SalarySlip -> the new payroll architecture
 * (SalaryStructure, AdvancePayment, Payroll, SalaryPayment, SalaryLedger).
 *
 * Safe to re-run: skips any teacher/slip/advance that already has a corresponding
 * new-model record. Old collections are never modified or deleted.
 *
 * Run with: npx tsx --env-file=.env scripts/migrate-payroll.ts
 */
import { prisma } from "../src/lib/db";
import { writeLedgerEntry } from "../src/lib/ledger";

async function main() {
  const summary = {
    structuresCreated: 0,
    structuresSkipped: 0,
    advancesMigrated: 0,
    advancesSkipped: 0,
    payrollsMigrated: 0,
    payrollsSkipped: 0,
    paymentsCreated: 0,
  };

  const teachers = await prisma.teacher.findMany({
    include: {
      advances: { orderBy: { date: "asc" } },
      slips: { orderBy: { slipDate: "asc" } },
    },
  });

  await prisma.$transaction(
    async (tx) => {
      for (const teacher of teachers) {
        // 1. Salary structure
        const existingStructure = await tx.salaryStructure.findFirst({
          where: { teacherId: teacher.id, deletedAt: null },
        });
        let structureId: string;
        if (existingStructure) {
          structureId = existingStructure.id;
          summary.structuresSkipped++;
        } else {
          const created = await tx.salaryStructure.create({
            data: {
              teacherId: teacher.id,
              monthlySalary: teacher.monthlySalary,
              effectiveFrom: teacher.joiningDate,
              calculationType: "MONTHLY",
              status: "ACTIVE",
              deletedAt: null,
              createdBy: "migration",
              createdAt: teacher.createdAt,
            },
          });
          structureId = created.id;
          summary.structuresCreated++;
          await writeLedgerEntry(tx, {
            teacherId: teacher.id,
            type: "SALARY_STRUCTURE_ASSIGNED",
            amount: teacher.monthlySalary,
            description: `Salary structure migrated: ₹${teacher.monthlySalary}/month`,
            date: teacher.createdAt,
            createdBy: "migration",
          });
        }

        // 2. Advances -> AdvancePayment. Simulate oldest-first consumption against
        // this teacher's slips' advanceDeduction totals to infer ADJUSTED status,
        // matching the consumption order the new generatePayrollAction uses.
        let deductionBudget = teacher.slips.reduce((sum, s) => sum + s.advanceDeduction, 0);
        for (const adv of teacher.advances) {
          const already = await tx.advancePayment.findFirst({
            where: { teacherId: teacher.id, date: adv.date, amount: adv.amount },
          });
          if (already) {
            summary.advancesSkipped++;
            continue;
          }

          const consumed = Math.min(adv.amount, deductionBudget);
          deductionBudget -= consumed;
          const status = consumed >= adv.amount ? "ADJUSTED" : consumed > 0 ? "PARTIALLY_ADJUSTED" : "UNADJUSTED";

          await tx.advancePayment.create({
            data: {
              teacherId: teacher.id,
              amount: adv.amount,
              date: adv.date,
              note: adv.note,
              status,
              adjustedAmount: consumed,
              deletedAt: null,
              createdBy: "migration",
              createdAt: adv.createdAt,
            },
          });
          summary.advancesMigrated++;
          await writeLedgerEntry(tx, {
            teacherId: teacher.id,
            type: "ADVANCE_GIVEN",
            amount: adv.amount,
            description: `Advance migrated${adv.note ? ` — ${adv.note}` : ""}`,
            date: adv.date,
            createdBy: "migration",
          });
        }

        // 3. Salary slips -> Payroll (+ SalaryPayment if paidAmount > 0)
        for (const slip of teacher.slips) {
          const already = await tx.payroll.findUnique({ where: { invoiceNo: slip.invoiceNo } });
          if (already) {
            summary.payrollsSkipped++;
            continue;
          }

          // Old model only stored day-counts and one bundled netPayment figure —
          // best-effort split: explicit otherDeduction is preserved, everything
          // else (absent/half-day/leave/hour deductions) is folded into
          // leaveDeduction since the old schema never separated them.
          const bundledDeduction = Math.max(0, slip.monthlySalary - slip.netPayment - slip.otherDeduction);
          const status = slip.balance <= 0 ? "PAID" : slip.paidAmount > 0 ? "PARTIALLY_PAID" : "GENERATED";

          const payroll = await tx.payroll.create({
            data: {
              teacherId: teacher.id,
              month: slip.month,
              year: slip.year,
              invoiceNo: slip.invoiceNo,
              salaryStructureId: structureId,
              workingDays: slip.totalDays,
              presentDays: Math.max(0, slip.totalDays - slip.absentDays - slip.halfDays - slip.leaveDays),
              absentDays: slip.absentDays,
              halfDays: slip.halfDays,
              paidLeaveDays: 0,
              unpaidLeaveDays: slip.leaveDays,
              lateCount: 0,
              grossSalary: slip.monthlySalary,
              leaveDeduction: bundledDeduction,
              halfDayDeduction: 0,
              lateDeduction: 0,
              statutoryDeductionsTotal: 0,
              otherDeductionsTotal: slip.otherDeduction,
              bonusTotal: 0,
              advanceApplied: slip.advanceDeduction,
              previousPending: slip.lastMonthPending,
              netPayable: slip.total,
              paidAmount: slip.paidAmount,
              pendingAmount: slip.balance,
              status,
              remarks: slip.remarks ? `${slip.remarks} (migrated from legacy salary slip)` : "Migrated from legacy salary slip",
              locked: false,
              deletedAt: null,
              createdBy: "migration",
              createdAt: slip.createdAt,
            },
          });
          summary.payrollsMigrated++;

          await writeLedgerEntry(tx, {
            teacherId: teacher.id,
            type: "SALARY_GENERATED",
            amount: slip.total,
            description: `Salary migrated for ${slip.month}/${slip.year} — Net Payable ₹${slip.total}`,
            refId: payroll.id,
            date: slip.createdAt,
            createdBy: "migration",
          });

          if (slip.paidAmount > 0) {
            await tx.salaryPayment.create({
              data: {
                payrollId: payroll.id,
                teacherId: teacher.id,
                amount: slip.paidAmount,
                paymentDate: slip.slipDate,
                paymentMode: "CASH",
                note: "Migrated from legacy salary slip paidAmount",
                deletedAt: null,
                createdBy: "migration",
                createdAt: slip.createdAt,
              },
            });
            summary.paymentsCreated++;
            await writeLedgerEntry(tx, {
              teacherId: teacher.id,
              type: "SALARY_PAID",
              amount: slip.paidAmount,
              description: `Payment of ₹${slip.paidAmount} migrated`,
              refId: payroll.id,
              date: slip.slipDate,
              createdBy: "migration",
            });
          }
        }
      }
    },
    { maxWait: 30000, timeout: 60000 }
  );

  console.log("Migration complete:");
  console.table(summary);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
