"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createLeavingCertificateAction } from "@/app/actions/leaving-certificates";
import { formatDateInput, dateToWords } from "@/lib/utils";
import { CertificateFormFields } from "../certificate-form-fields";

type StudentValues = {
  id: string;
  admissionNo: string;
  name: string;
  motherName: string | null;
  motherTongue: string | null;
  religion: string | null;
  caste: string | null;
  subCaste: string | null;
  dob: Date | string | null;
  birthPlace: string | null;
  aadharNumber: string | null;
  admissionDate: Date | string;
  academicYear: string;
  standard: { name: string };
};

export function LeavingCertificateForm({
  student,
  today,
}: {
  student: StudentValues;
  today: string;
}) {
  const [state, formAction, pending] = useActionState(createLeavingCertificateAction, undefined);

  const [dob, setDob] = useState(formatDateInput(student.dob));
  const [dobWords, setDobWords] = useState(student.dob ? dateToWords(student.dob) : "");
  const dobWordsTouched = useRef(false);

  useEffect(() => {
    if (!dobWordsTouched.current) {
      setDobWords(dob ? dateToWords(dob) : "");
    }
  }, [dob]);

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="studentId" value={student.id} />

          <CertificateFormFields
            defaults={{
              registerNumber: student.admissionNo,
              aadharNumber: student.aadharNumber || "",
              apaarId: "",
              penId: "",
              studentName: student.name,
              motherName: student.motherName || "",
              nationality: "Indian",
              motherTongue: student.motherTongue || "",
              religion: student.religion || "",
              caste: student.caste || "",
              subCaste: student.subCaste || "",
              birthPlace: student.birthPlace || "",
              lastSchoolAttended: "",
              admissionDate: formatDateInput(student.admissionDate),
              admissionStandard: student.standard.name,
              progress: "Good",
              conduct: "Good",
              studyingStandard: student.standard.name,
              studyingSince: student.academicYear,
              dateOfLeaving: today,
              issueDate: today,
              reasonForLeaving: "",
              remarks: "",
            }}
            dob={dob}
            dobWords={dobWords}
            onDobChange={setDob}
            onDobWordsChange={(value) => {
              dobWordsTouched.current = true;
              setDobWords(value);
            }}
          />

          {state?.error && (
            <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Saving will mark this student as Inactive and generate a certificate number automatically.
          </p>

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Saving..." : "Save & Generate Certificate"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
