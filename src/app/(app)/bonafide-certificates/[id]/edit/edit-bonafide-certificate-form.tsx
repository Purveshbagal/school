"use client";

import { useActionState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { updateBonafideCertificateAction } from "@/app/actions/bonafide-certificates";
import { formatDateInput } from "@/lib/utils";

type CertificateValues = {
  id: string;
  registerNumber: string;
  studentName: string;
  gender: string | null;
  standard: string | null;
  division: string | null;
  academicYear: string | null;
  motherName: string | null;
  caste: string | null;
  dob: Date | string | null;
  dobWords: string | null;
  birthPlace: string | null;
  taluka: string | null;
  district: string | null;
  issueDate: Date | string;
};

export function EditBonafideCertificateForm({ certificate }: { certificate: CertificateValues }) {
  const [state, formAction, pending] = useActionState(updateBonafideCertificateAction, undefined);

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="id" value={certificate.id} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="registerNumber">Register Number *</Label>
              <Input id="registerNumber" name="registerNumber" required defaultValue={certificate.registerNumber} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="studentName">Student Name *</Label>
              <Input id="studentName" name="studentName" required defaultValue={certificate.studentName} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <Input id="gender" name="gender" defaultValue={certificate.gender || ""} placeholder="Male / Female" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="standard">Standard</Label>
              <Input id="standard" name="standard" defaultValue={certificate.standard || ""} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="division">Division</Label>
              <Input id="division" name="division" defaultValue={certificate.division || ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="academicYear">Academic Year</Label>
              <Input id="academicYear" name="academicYear" defaultValue={certificate.academicYear || ""} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="motherName">Mother&apos;s Name</Label>
              <Input id="motherName" name="motherName" defaultValue={certificate.motherName || ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="caste">Caste</Label>
              <Input id="caste" name="caste" defaultValue={certificate.caste || ""} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" name="dob" type="date" defaultValue={formatDateInput(certificate.dob)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dobWords">Date of Birth (in words)</Label>
              <Input id="dobWords" name="dobWords" defaultValue={certificate.dobWords || ""} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="birthPlace">Place of Birth</Label>
              <Input id="birthPlace" name="birthPlace" defaultValue={certificate.birthPlace || ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taluka">Taluka</Label>
              <Input id="taluka" name="taluka" defaultValue={certificate.taluka || ""} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="district">District</Label>
              <Input id="district" name="district" defaultValue={certificate.district || ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issueDate">Certificate Date *</Label>
              <Input
                id="issueDate"
                name="issueDate"
                type="date"
                required
                defaultValue={formatDateInput(certificate.issueDate)}
              />
            </div>
          </div>

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
