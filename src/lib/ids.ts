import { prisma } from "@/lib/db";

export async function nextEmployeeNo(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.teacher.count();
  return `EMP${year}${String(count + 1).padStart(3, "0")}`;
}

export async function nextReceiptNo(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.feePayment.count();
  return `FEE-${year}-${String(count + 1).padStart(5, "0")}`;
}

export async function nextInvoiceNo(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.salarySlip.count();
  return `SAL-${year}-${String(count + 1).padStart(5, "0")}`;
}

export async function nextPayrollInvoiceNo(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.payroll.count();
  return `PAY-${year}-${String(count + 1).padStart(5, "0")}`;
}

export async function nextCertificateNo(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.leavingCertificate.count();
  return `LC-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function nextBonafideCertificateNo(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.bonafideCertificate.count();
  return `BC-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function nextSaleNo(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.stationarySale.count();
  return `STY-${year}-${String(count + 1).padStart(5, "0")}`;
}

export async function nextStationaryReceiptNo(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.stationarySalePayment.count();
  return `STYPAY-${year}-${String(count + 1).padStart(5, "0")}`;
}
