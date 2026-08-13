"use client";

import { useActionState, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createBonafideCertificateAction } from "@/app/actions/bonafide-certificates";
import { formatDateInput, formatDate, dateToWords } from "@/lib/utils";

type StudentValues = {
  id: string;
  admissionNo: string;
  name: string;
  gender: string | null;
  motherName: string | null;
  caste: string | null;
  dob: Date | string | null;
  birthPlace: string | null;
  taluka: string | null;
  district: string | null;
  academicYear: string;
  standard: { name: string };
};

function row(label: string, value: string) {
  return (
    <div className="grid grid-cols-12 gap-2 border-b border-border py-2 text-sm">
      <div className="col-span-5 text-muted-foreground">{label}</div>
      <div className="col-span-7 font-medium">{value || "-"}</div>
    </div>
  );
}

export function BonafideCertificateForm({
  student,
  today,
}: {
  student: StudentValues;
  today: string;
}) {
  const [state, formAction, pending] = useActionState(createBonafideCertificateAction, undefined);
  const [division, setDivision] = useState("");
  const [issueDate, setIssueDate] = useState(today);

  const dobWords = student.dob ? dateToWords(student.dob) : "";

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="studentId" value={student.id} />
          <input type="hidden" name="registerNumber" value={student.admissionNo} />
          <input type="hidden" name="studentName" value={student.name} />
          <input type="hidden" name="gender" value={student.gender || ""} />
          <input type="hidden" name="standard" value={student.standard.name} />
          <input type="hidden" name="academicYear" value={student.academicYear} />
          <input type="hidden" name="motherName" value={student.motherName || ""} />
          <input type="hidden" name="caste" value={student.caste || ""} />
          <input type="hidden" name="dob" value={formatDateInput(student.dob)} />
          <input type="hidden" name="dobWords" value={dobWords} />
          <input type="hidden" name="birthPlace" value={student.birthPlace || ""} />
          <input type="hidden" name="taluka" value={student.taluka || ""} />
          <input type="hidden" name="district" value={student.district || ""} />

          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Auto-filled from student record
            </p>
            <div className="rounded-lg border border-border px-3">
              {row("Register Number", student.admissionNo)}
              {row("Student Name", student.name)}
              {row("Standard", student.standard.name)}
              {row("Academic Year", student.academicYear)}
              {row("Mother's Name", student.motherName || "")}
              {row("Caste", student.caste || "")}
              {row("Date of Birth", student.dob ? formatDate(student.dob) : "")}
              {row("Date of Birth (in words)", dobWords)}
              {row("Place of Birth", student.birthPlace || "")}
              {row("Taluka", student.taluka || "")}
              {row("District", student.district || "")}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="division">Division (optional)</Label>
              <Input
                id="division"
                name="division"
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                placeholder="e.g. A"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issueDate">Certificate Date *</Label>
              <Input
                id="issueDate"
                name="issueDate"
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
          </div>

          {state?.error && (
            <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Saving..." : "Save & Generate Certificate"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
