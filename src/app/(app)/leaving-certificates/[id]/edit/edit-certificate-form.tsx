"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateLeavingCertificateAction } from "@/app/actions/leaving-certificates";
import { formatDateInput } from "@/lib/utils";
import { CertificateFormFields } from "../../certificate-form-fields";

type CertificateValues = {
  id: string;
  studentId: string;
  registerNumber: string;
  aadharNumber: string | null;
  apaarId: string | null;
  penId: string | null;
  studentName: string;
  motherName: string | null;
  nationality: string | null;
  motherTongue: string | null;
  religion: string | null;
  caste: string | null;
  subCaste: string | null;
  dob: Date | string | null;
  dobWords: string | null;
  birthPlace: string | null;
  lastSchoolAttended: string | null;
  admissionDate: Date | string | null;
  admissionStandard: string | null;
  progress: string | null;
  conduct: string | null;
  studyingStandard: string | null;
  studyingSince: string | null;
  dateOfLeaving: Date | string;
  issueDate: Date | string;
  reasonForLeaving: string | null;
  remarks: string | null;
};

export function EditCertificateForm({ certificate }: { certificate: CertificateValues }) {
  const [state, formAction, pending] = useActionState(updateLeavingCertificateAction, undefined);

  const [dob, setDob] = useState(formatDateInput(certificate.dob));
  const [dobWords, setDobWords] = useState(certificate.dobWords || "");
  const dobWordsTouched = useRef(true);

  useEffect(() => {
    if (!dobWordsTouched.current) {
      setDobWords(dob);
    }
  }, [dob]);

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="id" value={certificate.id} />
          <input type="hidden" name="studentId" value={certificate.studentId} />

          <CertificateFormFields
            defaults={{
              registerNumber: certificate.registerNumber,
              aadharNumber: certificate.aadharNumber || "",
              apaarId: certificate.apaarId || "",
              penId: certificate.penId || "",
              studentName: certificate.studentName,
              motherName: certificate.motherName || "",
              nationality: certificate.nationality || "",
              motherTongue: certificate.motherTongue || "",
              religion: certificate.religion || "",
              caste: certificate.caste || "",
              subCaste: certificate.subCaste || "",
              birthPlace: certificate.birthPlace || "",
              lastSchoolAttended: certificate.lastSchoolAttended || "",
              admissionDate: formatDateInput(certificate.admissionDate),
              admissionStandard: certificate.admissionStandard || "",
              progress: certificate.progress || "",
              conduct: certificate.conduct || "",
              studyingStandard: certificate.studyingStandard || "",
              studyingSince: certificate.studyingSince || "",
              dateOfLeaving: formatDateInput(certificate.dateOfLeaving),
              issueDate: formatDateInput(certificate.issueDate),
              reasonForLeaving: certificate.reasonForLeaving || "",
              remarks: certificate.remarks || "",
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

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
