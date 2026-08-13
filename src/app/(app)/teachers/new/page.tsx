import { PageHeader } from "@/components/page-header";
import { formatDateInput } from "@/lib/utils";
import { TeacherForm } from "../teacher-form";

export default function NewTeacherPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Add Teacher" description="Register a new staff member" />
      <TeacherForm today={formatDateInput(new Date())} />
    </div>
  );
}
