"use client";

import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

type Exam = { id: string; name: string };

export function BulkExamPicker({ exams, selectedExamId }: { exams: Exam[]; selectedExamId: string }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="bulkExamId" className="whitespace-nowrap text-xs text-muted-foreground">
        Term / Exam
      </Label>
      <NativeSelect
        id="bulkExamId"
        value={selectedExamId}
        onChange={(e) => router.push(`?examId=${e.target.value}`)}
      >
        {exams.map((exam) => (
          <option key={exam.id} value={exam.id}>
            {exam.name}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
