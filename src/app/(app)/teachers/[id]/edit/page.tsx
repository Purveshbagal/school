import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { formatDateInput } from "@/lib/utils";
import { TeacherForm } from "../../teacher-form";

export default async function EditTeacherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`Edit Teacher — ${teacher.name}`} />
      <TeacherForm teacher={teacher} today={formatDateInput(new Date())} />
    </div>
  );
}
