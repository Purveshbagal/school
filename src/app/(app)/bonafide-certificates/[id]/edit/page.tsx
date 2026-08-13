import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EditBonafideCertificateForm } from "./edit-bonafide-certificate-form";
import { ArrowLeft } from "lucide-react";

export default async function EditBonafideCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const certificate = await prisma.bonafideCertificate.findUnique({ where: { id } });
  if (!certificate) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Edit Bonafide Certificate"
        description={`${certificate.studentName} · ${certificate.certificateNo}`}
        actions={
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/bonafide-certificates/${id}`}>Back</Link>}
          >
            <ArrowLeft /> Back
          </Button>
        }
      />

      <EditBonafideCertificateForm certificate={certificate} />
    </div>
  );
}
