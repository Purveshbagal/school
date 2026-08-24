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
import { Pencil } from "lucide-react";

export function EditExamDatesDialog({
  examId,
  examName,
  examDate,
  resultDate,
}: {
  examId: string;
  examName: string;
  examDate: Date;
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
          <div className="space-y-1.5">
            <Label htmlFor={`examDate-${examId}`}>Exam Date</Label>
            <Input
              id={`examDate-${examId}`}
              name="examDate"
              type="date"
              defaultValue={formatDateInput(examDate)}
              required
            />
          </div>
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
