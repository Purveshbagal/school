"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateExamDatesAction } from "@/app/actions/exams";
import { formatDateInput } from "@/lib/utils";
import { ExamDateRangeFields } from "./exam-date-range-fields";
import { Pencil } from "lucide-react";

export function EditExamDatesDialog({
  examId,
  examName,
  examDate,
  examEndDate,
  resultDate,
}: {
  examId: string;
  examName: string;
  examDate: Date;
  examEndDate: Date | null;
  resultDate: Date;
}) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    await updateExamDatesAction(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Pencil /> Edit Dates
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Dates — {examName}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="id" value={examId} />
          <ExamDateRangeFields
            idPrefix={`edit-${examId}`}
            defaultFrom={formatDateInput(examDate)}
            defaultTo={formatDateInput(examEndDate ?? examDate)}
          />
          <div className="space-y-1.5">
            <Label htmlFor={`resultDate-${examId}`}>Result Date</Label>
            <Input
              id={`resultDate-${examId}`}
              name="resultDate"
              type="date"
              defaultValue={formatDateInput(resultDate)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
