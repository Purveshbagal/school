"use client";

import { useActionState, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { saveHallTicketAction } from "@/app/actions/hall-tickets";
import { CalendarDays, Check, ImageOff, Pencil, Ticket } from "lucide-react";

export type ExamOption = { id: string; name: string; dateRange: string };
export type TicketFields = { seatNo: string; blockNo: string; centerName: string };
export type ExamDefaults = { seatNo: string; blockNo: string };

type StudentInfo = {
  id: string;
  name: string;
  admissionNo: string;
  standardName: string;
  hasPhoto: boolean;
};

type FormProps = {
  student: StudentInfo;
  exams: ExamOption[];
  initialExamId: string;
  /** This student's already-generated tickets, keyed by examId. */
  existing: Record<string, TicketFields>;
  /** Suggested seat/block for a new ticket in this standard, keyed by examId. */
  defaults: Record<string, ExamDefaults>;
  defaultCenterName: string;
};

function fieldsFor(examId: string, { existing, defaults, defaultCenterName }: FormProps): TicketFields {
  return (
    existing[examId] ?? {
      seatNo: defaults[examId]?.seatNo ?? "",
      blockNo: defaults[examId]?.blockNo ?? "",
      centerName: defaultCenterName,
    }
  );
}

// Mounted only while the dialog is open (the popup unmounts on close), so every open
// starts from fresh fields and a cleared error.
function HallTicketForm({ onDone, ...props }: FormProps & { onDone: (examId: string) => void }) {
  const { student, exams, existing } = props;
  const [state, formAction, pending] = useActionState(saveHallTicketAction, undefined);
  const [examId, setExamId] = useState(props.initialExamId);
  const [fields, setFields] = useState(() => fieldsFor(props.initialExamId, props));

  useEffect(() => {
    if (state?.success && state.examId) onDone(state.examId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleExamChange(next: string) {
    setExamId(next);
    setFields(fieldsFor(next, props));
  }

  const exam = exams.find((e) => e.id === examId);
  const isUpdate = Boolean(existing[examId]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="studentId" value={student.id} />

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-border bg-muted/40 p-3 text-xs">
        <div className="col-span-2">
          <dt className="text-muted-foreground">Student Name</dt>
          <dd className="font-semibold uppercase">{student.name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Standard</dt>
          <dd className="font-medium">{student.standardName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Register No</dt>
          <dd className="font-mono font-medium">{student.admissionNo}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">Photo</dt>
          <dd className="flex items-center gap-1 font-medium">
            {student.hasPhoto ? (
              <>
                <Check className="h-3.5 w-3.5 text-success" /> Taken from admission form
              </>
            ) : (
              <>
                <ImageOff className="h-3.5 w-3.5 text-warning" /> Not uploaded — ticket will show a blank photo box
              </>
            )}
          </dd>
        </div>
      </dl>

      <div className="space-y-1.5">
        <Label htmlFor={`exam-${student.id}`}>Select Exam</Label>
        <NativeSelect
          id={`exam-${student.id}`}
          name="examId"
          value={examId}
          onChange={(e) => handleExamChange(e.target.value)}
          required
        >
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </NativeSelect>
        {exam && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" /> Exam Date: <span className="font-medium text-foreground">{exam.dateRange}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`seatNo-${student.id}`}>Seat No</Label>
          <Input
            id={`seatNo-${student.id}`}
            name="seatNo"
            value={fields.seatNo}
            onChange={(e) => setFields({ ...fields, seatNo: e.target.value })}
            placeholder="e.g. 109"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`blockNo-${student.id}`}>Block No</Label>
          <Input
            id={`blockNo-${student.id}`}
            name="blockNo"
            value={fields.blockNo}
            onChange={(e) => setFields({ ...fields, blockNo: e.target.value })}
            placeholder="e.g. 04"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`centerName-${student.id}`}>Center Name</Label>
        <Input
          id={`centerName-${student.id}`}
          name="centerName"
          value={fields.centerName}
          onChange={(e) => setFields({ ...fields, centerName: e.target.value })}
        />
      </div>

      {isUpdate && (
        <p className="rounded-lg bg-info/10 px-3 py-2 text-xs text-info">
          A hall ticket is already generated for this exam — saving will update it.
        </p>
      )}

      {state?.error && (
        <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{state.error}</div>
      )}

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          <Ticket /> {pending ? "Saving..." : isUpdate ? "Update Hall Ticket" : "Generate"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function HallTicketDialog({
  pageExamId,
  ...props
}: Omit<FormProps, "initialExamId"> & {
  /** Exam currently selected on the page — the dialog opens on it. */
  pageExamId: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasTicket = Boolean(props.existing[pageExamId]);

  function handleDone(examId: string) {
    setOpen(false);
    // Generated for a different exam than the page shows — switch the page to that exam
    // so the new ticket's "View Hall Ticket" is visible straight away.
    if (examId !== pageExamId) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("exam", examId);
      router.push(`${pathname}?${params.toString()}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" size="sm" variant={hasTicket ? "outline" : "default"} />}>
        {hasTicket ? (
          <>
            <Pencil /> Edit
          </>
        ) : (
          <>
            <Ticket /> Generate Hall Ticket
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{hasTicket ? "Edit Hall Ticket" : "Generate Hall Ticket"}</DialogTitle>
        </DialogHeader>
        <HallTicketForm {...props} initialExamId={pageExamId} onDone={handleDone} />
      </DialogContent>
    </Dialog>
  );
}
