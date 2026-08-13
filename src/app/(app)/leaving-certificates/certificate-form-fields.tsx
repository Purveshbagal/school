"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export type CertificateDefaults = {
  registerNumber: string;
  aadharNumber: string;
  apaarId: string;
  penId: string;
  studentName: string;
  motherName: string;
  nationality: string;
  motherTongue: string;
  religion: string;
  caste: string;
  subCaste: string;
  birthPlace: string;
  lastSchoolAttended: string;
  admissionDate: string;
  admissionStandard: string;
  progress: string;
  conduct: string;
  studyingStandard: string;
  studyingSince: string;
  dateOfLeaving: string;
  issueDate: string;
  reasonForLeaving: string;
  remarks: string;
};

export function CertificateFormFields({
  defaults,
  dob,
  dobWords,
  onDobChange,
  onDobWordsChange,
}: {
  defaults: CertificateDefaults;
  dob: string;
  dobWords: string;
  onDobChange: (value: string) => void;
  onDobWordsChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="registerNumber">Register Number *</Label>
        <Input id="registerNumber" name="registerNumber" required defaultValue={defaults.registerNumber} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="studentName">Student Name (in Full) *</Label>
        <Input id="studentName" name="studentName" required defaultValue={defaults.studentName} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="aadharNumber">Aadhar Card Number</Label>
        <Input id="aadharNumber" name="aadharNumber" defaultValue={defaults.aadharNumber} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="apaarId">APAAR ID</Label>
        <Input id="apaarId" name="apaarId" defaultValue={defaults.apaarId} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="penId">PEN ID (optional)</Label>
        <Input id="penId" name="penId" defaultValue={defaults.penId} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="motherName">Mother&apos;s Name</Label>
        <Input id="motherName" name="motherName" defaultValue={defaults.motherName} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nationality">Nationality</Label>
        <Input id="nationality" name="nationality" defaultValue={defaults.nationality} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="motherTongue">Mother Tongue</Label>
        <Input id="motherTongue" name="motherTongue" defaultValue={defaults.motherTongue} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="religion">Religion</Label>
        <Input id="religion" name="religion" defaultValue={defaults.religion} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="caste">Caste</Label>
        <Input id="caste" name="caste" defaultValue={defaults.caste} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="subCaste">Sub-Caste</Label>
        <Input id="subCaste" name="subCaste" defaultValue={defaults.subCaste} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="birthPlace">Place of Birth</Label>
        <Input id="birthPlace" name="birthPlace" defaultValue={defaults.birthPlace} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dob">Date of Birth</Label>
        <Input id="dob" name="dob" type="date" value={dob} onChange={(e) => onDobChange(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dobWords">Date of Birth (in words)</Label>
        <Input
          id="dobWords"
          name="dobWords"
          value={dobWords}
          onChange={(e) => onDobWordsChange(e.target.value)}
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="lastSchoolAttended">Last School Attended &amp; Standard</Label>
        <Input
          id="lastSchoolAttended"
          name="lastSchoolAttended"
          placeholder="e.g. Not applicable (first school)"
          defaultValue={defaults.lastSchoolAttended}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="admissionDate">Date of Admission</Label>
        <Input id="admissionDate" name="admissionDate" type="date" defaultValue={defaults.admissionDate} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="admissionStandard">Standard at Admission</Label>
        <Input id="admissionStandard" name="admissionStandard" defaultValue={defaults.admissionStandard} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="progress">Progress</Label>
        <Input id="progress" name="progress" defaultValue={defaults.progress} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="conduct">Conduct</Label>
        <Input id="conduct" name="conduct" defaultValue={defaults.conduct} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="studyingStandard">Standard in Which Studying</Label>
        <Input id="studyingStandard" name="studyingStandard" defaultValue={defaults.studyingStandard} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="studyingSince">Since When</Label>
        <Input id="studyingSince" name="studyingSince" defaultValue={defaults.studyingSince} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dateOfLeaving">Date of Leaving School *</Label>
        <Input
          id="dateOfLeaving"
          name="dateOfLeaving"
          type="date"
          required
          defaultValue={defaults.dateOfLeaving}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="issueDate">Certificate Issuing Date</Label>
        <Input id="issueDate" name="issueDate" type="date" defaultValue={defaults.issueDate} />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="reasonForLeaving">Reason of Leaving School</Label>
        <Input
          id="reasonForLeaving"
          name="reasonForLeaving"
          placeholder="e.g. Parent's request"
          defaultValue={defaults.reasonForLeaving}
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="remarks">Remark (optional)</Label>
        <Input id="remarks" name="remarks" defaultValue={defaults.remarks} />
      </div>
    </div>
  );
}
