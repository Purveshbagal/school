import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { PrintDownloadActions } from "@/components/print-download-actions";
import { DocumentWatermark } from "@/components/document-watermark";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { deleteBonafideCertificateAction } from "@/app/actions/bonafide-certificates";
import { Pencil } from "lucide-react";

function pronouns(gender: string | null) {
  const g = (gender || "").trim().toLowerCase();
  if (g.startsWith("f")) return { title: "Miss", subject: "She", possessive: "Her" };
  if (g.startsWith("m")) return { title: "Master", subject: "He", possessive: "His" };
  return { title: "Master / Miss", subject: "He / She", possessive: "His / Her" };
}

export default async function BonafideCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const certificate = await prisma.bonafideCertificate.findUnique({ where: { id } });
  if (!certificate) notFound();

  const settings = await prisma.schoolSettings.findUnique({ where: { id: "main" } });
  const { title, subject, possessive } = pronouns(certificate.gender);

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex w-[210mm] max-w-full flex-wrap items-center justify-between gap-2 px-4 print:hidden">
        <div className="flex gap-2">
          <Button
            variant="outline"
            render={<Link href={`/bonafide-certificates/${id}/edit`}><Pencil /> Edit</Link>}
          />
          <DeleteButton
            action={deleteBonafideCertificateAction}
            hiddenFields={{ id }}
            confirmMessage={`Delete bonafide certificate ${certificate.certificateNo} for ${certificate.studentName}? This cannot be undone.`}
            label="Delete"
            size="default"
            className="border border-transparent hover:border-destructive/20"
          />
        </div>
        <PrintDownloadActions
          targetId="print-content"
          fileName={`Bonafide-Certificate-${certificate.certificateNo}`}
          pdfFormat="a5"
          pdfOrientation="landscape"
        />
      </div>

      <div
        id="print-content"
        className="print-a5-landscape relative mx-auto box-border flex min-h-[148mm] w-[210mm] max-w-full flex-col overflow-hidden border-2 border-blue-700 bg-white p-4 shadow-lg ring-1 ring-slate-200 sm:p-8 print:shadow-none print:ring-0"
      >
        <DocumentWatermark widthClassName="w-2/5" />
        <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex items-start justify-between text-xs text-slate-500">
          <div>No. {certificate.certificateNo}</div>
          <div>Gen. Reg. No: {certificate.registerNumber}</div>
        </div>

        <div className="mt-1 flex items-center gap-2 border-b-2 border-blue-700 pb-3 sm:gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/image/logo.jpeg"
            alt="School Logo"
            className="h-10 w-10 shrink-0 object-contain sm:h-16 sm:w-16"
          />
          <div className="min-w-0 flex-1 text-center">
            <h1 className="text-sm leading-tight font-bold text-slate-900 sm:text-xl">{settings?.name || "School Name"}</h1>
            {settings?.address && <p className="text-[10px] text-slate-500 sm:text-xs">{settings.address}</p>}
          </div>
          <div className="hidden h-16 w-16 shrink-0 sm:block" />
        </div>

        <h2 className="mt-3 text-center text-base font-bold tracking-wide text-blue-700 uppercase sm:text-lg">
          Bonafide Certificate
        </h2>

        <div className="mt-4 flex-1 space-y-3 text-[13.5px] leading-relaxed text-slate-800">
          <p>
            This is to certify that {title}{" "}
            <span className="font-semibold">{certificate.studentName}</span> is / was a bonafide
            student of this School / College studying in Std.{" "}
            <span className="font-semibold">{certificate.standard || "-"}</span> Div.{" "}
            <span className="font-semibold">{certificate.division || "-"}</span> during the year{" "}
            <span className="font-semibold">{certificate.academicYear || "-"}</span>. Mother&apos;s
            name is <span className="font-semibold">{certificate.motherName || "-"}</span>.
          </p>

          <p>
            {subject} is <span className="font-semibold">{certificate.caste || "-"}</span> by
            Caste.
          </p>

          <p>
            {possessive} date of Birth according to our Register is{" "}
            <span className="font-semibold">{formatDate(certificate.dob)}</span> ( in words{" "}
            <span className="font-semibold">{certificate.dobWords || "-"}</span> )
          </p>

          <p>
            {possessive} place of Birth is{" "}
            <span className="font-semibold">{certificate.birthPlace || "-"}</span> Tal.{" "}
            <span className="font-semibold">{certificate.taluka || "-"}</span> Dist.{" "}
            <span className="font-semibold">{certificate.district || "-"}</span>
          </p>

          <p>{subject} bears a good moral character.</p>
        </div>

        <div className="mt-4 flex items-end justify-between text-sm">
          <p>
            Date: <span className="font-semibold">{formatDate(certificate.issueDate)}</span>
          </p>
          <div className="text-center">
            <div className="mb-1 h-10 w-36 border-b border-slate-400" />
            <p className="font-semibold text-slate-600">H.M. / Principal</p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
