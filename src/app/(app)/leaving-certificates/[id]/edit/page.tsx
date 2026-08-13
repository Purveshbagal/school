import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EditCertificateForm } from "./edit-certificate-form";
import { ArrowLeft } from "lucide-react";

export default async function EditLeavingCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const certificate = await prisma.leavingCertificate.findUnique({ where: { id } });
  if (!certificate) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Edit Leaving Certificate"
        description={`${certificate.studentName} · ${certificate.certificateNo}`}
        actions={
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/leaving-certificates/${id}`}>Back</Link>}
          >
            <ArrowLeft /> Back
          </Button>
        }
      />

      <EditCertificateForm certificate={certificate} />
    </div>
  );
}
