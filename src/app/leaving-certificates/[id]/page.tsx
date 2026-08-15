import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { PrintDownloadActions } from "@/components/print-download-actions";
import { DocumentWatermark } from "@/components/document-watermark";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { deleteLeavingCertificateAction } from "@/app/actions/leaving-certificates";
import { Pencil } from "lucide-react";

export default async function LeavingCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const certificate = await prisma.leavingCertificate.findUnique({ where: { id } });
  if (!certificate) notFound();

  const settings = await prisma.schoolSettings.findUnique({ where: { id: "main" } });

  const row = (no: number, label: string, value: string) => (
    <div className="grid grid-cols-12 gap-2 border-b border-slate-200 py-1.5 text-sm">
      <div className="col-span-1 text-slate-400">{no})</div>
      <div className="col-span-5 text-slate-500">{label}</div>
      <div className="col-span-6 font-semibold">{value || "-"}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 print:hidden">
        <div className="flex gap-2">
          <Button
            variant="outline"
            render={<Link href={`/leaving-certificates/${id}/edit`}><Pencil /> Edit</Link>}
          />
          <DeleteButton
            action={deleteLeavingCertificateAction}
            hiddenFields={{ id, studentId: certificate.studentId }}
            confirmMessage={`Delete leaving certificate ${certificate.certificateNo} for ${certificate.studentName}? The student's status will be reverted to Active. This cannot be undone.`}
            label="Delete"
            size="default"
            className="border border-transparent hover:border-destructive/20"
          />
        </div>
        <PrintDownloadActions targetId="print-content" fileName={`Leaving-Certificate-${certificate.certificateNo}`} />
      </div>

      <div
        id="print-content"
        className="relative mx-auto max-w-3xl overflow-hidden bg-white p-4 shadow-lg ring-1 ring-slate-200 sm:p-8 print:p-12 print:shadow-none print:ring-0"
      >
        <DocumentWatermark />
        <div className="relative z-10">
        <div className="flex items-start justify-between text-xs text-slate-500">
          <div>{settings?.udise && `U-DISE No: ${settings.udise}`}</div>
          <div>Certificate No: {certificate.certificateNo}</div>
        </div>

        <div className="mt-1 flex items-center gap-2 border-b-2 border-blue-700 pb-4 sm:gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/image/logo.jpeg"
            alt="School Logo"
            className="h-12 w-12 shrink-0 object-contain sm:h-20 sm:w-20"
          />
          <div className="min-w-0 flex-1 text-center">
            <h1 className="text-lg leading-tight font-bold text-slate-900 sm:text-2xl">{settings?.name || "School Name"}</h1>
            {settings?.address && <p className="text-xs text-slate-500 sm:text-sm">{settings.address}</p>}
          </div>
          <div className="hidden h-20 w-20 shrink-0 sm:block" />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-slate-500">General Reg No: {certificate.registerNumber}</span>
          <h2 className="text-lg font-bold tracking-wide text-blue-700 uppercase">Leaving Certificate</h2>
          <span className="w-[120px]" />
        </div>

        <div className="my-4 border-t border-dashed border-slate-300" />

        <div>
          {row(1, "Name of the Student in Full", certificate.studentName)}
          {row(1, "Aadhar Card No / APAAR ID / PEN ID", `${certificate.aadharNumber || "-"} / ${certificate.apaarId || "-"} / ${certificate.penId || "-"}`)}
          {row(2, "Mother's Name", certificate.motherName || "")}
          {row(3, "Nationality", certificate.nationality || "")}
          {row(4, "Mother Tongue", certificate.motherTongue || "")}
          {row(5, "Religion, Caste & Sub-Caste", `${certificate.religion || "-"}, ${certificate.caste || "-"}, ${certificate.subCaste || "-"}`)}
          {row(6, "Place of Birth", certificate.birthPlace || "")}
          {row(7, "Date of Birth", formatDate(certificate.dob))}
          {row(8, "Date of Birth (in words)", certificate.dobWords || "")}
          {row(9, "Last School Attended & Std.", certificate.lastSchoolAttended || "")}
          {row(10, "Date of Admission & Std.", `${formatDate(certificate.admissionDate)} — ${certificate.admissionStandard || "-"}`)}
          {row(11, "Progress", certificate.progress || "")}
          {row(12, "Conduct", certificate.conduct || "")}
          {row(13, "Date of Leaving School", formatDate(certificate.dateOfLeaving))}
          {row(14, "Standard in Which Studying & Since When", `${certificate.studyingStandard || "-"} — since ${certificate.studyingSince || "-"}`)}
          {row(15, "Reason of Leaving School", certificate.reasonForLeaving || "")}
          {row(16, "Remarks", certificate.remarks || "")}
        </div>

        <p className="mt-5 text-sm text-slate-700">
          Certified that the above information is in accordance with the School General Register No.{" "}
          <span className="font-semibold">{certificate.registerNumber}</span>.
        </p>

        <p className="mt-2 text-sm text-slate-700">
          Certificate Issuing Date: <span className="font-semibold">{formatDate(certificate.issueDate)}</span>
        </p>

        <div className="mt-16 flex items-end justify-between text-sm">
          <div className="text-center">
            <div className="mb-1 h-10 w-32 border-b border-slate-400" />
            <p className="text-slate-500">Class Teacher</p>
          </div>
          <div className="text-center">
            <div className="mb-1 h-10 w-32 border-b border-slate-400" />
            <p className="text-slate-500">Clerk</p>
          </div>
          <div className="text-center">
            <div className="mb-1 h-10 w-32 border-b border-slate-400" />
            <p className="text-slate-500">Principal (Sign &amp; Stamp)</p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
