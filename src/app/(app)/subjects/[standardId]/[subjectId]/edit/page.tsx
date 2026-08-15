import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { SubjectForm } from "./subject-form";

export default async function EditSubjectPage({
  params,
}: {
  params: Promise<{ standardId: string; subjectId: string }>;
}) {
  const { standardId, subjectId } = await params;

  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject || subject.standardId !== standardId) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title={`Edit Subject — ${subject.name}`} />
      <SubjectForm subject={subject} standardId={standardId} />
    </div>
  );
}
