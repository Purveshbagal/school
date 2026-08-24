import { prisma } from "@/lib/db";

/** Parses the zero-padded numeric suffix after `prefix` in `value`, or 0 if absent/invalid. */
function seqAfter(value: string, prefix: string): number {
  return parseInt(value.slice(prefix.length), 10) || 0;
}

export async function nextEmployeeNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EMP${year}`;
  const last = await prisma.teacher.findFirst({
    where: { employeeNo: { startsWith: prefix } },
    orderBy: { employeeNo: "desc" },
  });
  const lastSeq = last ? seqAfter(last.employeeNo, prefix) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(3, "0")}`;
}

export async function nextReceiptNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `FEE-${year}-`;
  const last = await prisma.feePayment.findFirst({
    where: { receiptNo: { startsWith: prefix } },
    orderBy: { receiptNo: "desc" },
  });
  const lastSeq = last ? seqAfter(last.receiptNo, prefix) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(5, "0")}`;
}

export async function nextInvoiceNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SAL-${year}-`;
  const last = await prisma.salarySlip.findFirst({
    where: { invoiceNo: { startsWith: prefix } },
    orderBy: { invoiceNo: "desc" },
  });
  const lastSeq = last ? seqAfter(last.invoiceNo, prefix) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(5, "0")}`;
}

export async function nextPayrollInvoiceNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PAY-${year}-`;
  const last = await prisma.payroll.findFirst({
    where: { invoiceNo: { startsWith: prefix } },
    orderBy: { invoiceNo: "desc" },
  });
  const lastSeq = last ? seqAfter(last.invoiceNo, prefix) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(5, "0")}`;
}

export async function nextCertificateNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `LC-${year}-`;
  const last = await prisma.leavingCertificate.findFirst({
    where: { certificateNo: { startsWith: prefix } },
    orderBy: { certificateNo: "desc" },
  });
  const lastSeq = last ? seqAfter(last.certificateNo, prefix) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
}

export async function nextBonafideCertificateNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `BC-${year}-`;
  const last = await prisma.bonafideCertificate.findFirst({
    where: { certificateNo: { startsWith: prefix } },
    orderBy: { certificateNo: "desc" },
  });
  const lastSeq = last ? seqAfter(last.certificateNo, prefix) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
}

export async function nextSaleNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `STY-${year}-`;
  const last = await prisma.stationarySale.findFirst({
    where: { saleNo: { startsWith: prefix } },
    orderBy: { saleNo: "desc" },
  });
  const lastSeq = last ? seqAfter(last.saleNo, prefix) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(5, "0")}`;
}

export async function nextStationaryReceiptNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `STYPAY-${year}-`;
  const last = await prisma.stationarySalePayment.findFirst({
    where: { receiptNo: { startsWith: prefix } },
    orderBy: { receiptNo: "desc" },
  });
  const lastSeq = last ? seqAfter(last.receiptNo, prefix) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(5, "0")}`;
}
