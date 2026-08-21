"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { createStudentAction, updateStudentAction } from "@/app/actions/students";
import { formatDateInput } from "@/lib/utils";
import { UserRound, Users, GraduationCap, MapPin, Wallet, type LucideIcon } from "lucide-react";

type Standard = { id: string; name: string };
type FeeStructureLookup = { standardId: string; academicYear: string; totalAmount: number };
type LocationVillage = { id: string; name: string; busFee: number };
type LocationTaluka = { id: string; name: string; villages: LocationVillage[] };
type LocationDistrict = { id: string; name: string; talukas: LocationTaluka[] };

type StudentValues = {
  id?: string;
  admissionNo?: string;
  name?: string;
  fatherName?: string | null;
  motherName?: string | null;
  gender?: string | null;
  dob?: Date | string | null;
  birthPlace?: string | null;
  aadharNumber?: string | null;
  penId?: string | null;
  apaarId?: string | null;
  phone?: string | null;
  address?: string | null;
  village?: string | null;
  taluka?: string | null;
  district?: string | null;
  motherTongue?: string | null;
  religion?: string | null;
  caste?: string | null;
  subCaste?: string | null;
  medium?: string | null;
  board?: string | null;
  schoolBus?: boolean;
  standardId?: string;
  academicYear?: string;
  admissionDate?: Date | string | null;
  status?: string;
  discount?: number;
  customFee?: number | null;
};

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 first:mt-0 [&:not(:first-child)]:mt-8">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function StudentForm({
  standards,
  feeStructures,
  districts,
  defaultAcademicYear,
  today,
  student,
}: {
  standards: Standard[];
  feeStructures: FeeStructureLookup[];
  districts: LocationDistrict[];
  defaultAcademicYear: string;
  today: string;
  student?: StudentValues;
}) {
  const isEdit = Boolean(student?.id);
  const [state, formAction, pending] = useActionState(
    isEdit ? updateStudentAction : createStudentAction,
    undefined
  );

  // Controlled so a failed submit (e.g. duplicate register number) keeps what
  // was typed instead of React's auto form-reset wiping it back to blank.
  const [values, setValues] = useState({
    admissionNo: student?.admissionNo || "",
    name: student?.name || "",
    dob: formatDateInput(student?.dob),
    birthPlace: student?.birthPlace || "",
    aadharNumber: student?.aadharNumber || "",
    gender: student?.gender || "",
    penId: student?.penId || "",
    apaarId: student?.apaarId || "",
    fatherName: student?.fatherName || "",
    motherName: student?.motherName || "",
    phone: student?.phone || "",
    motherTongue: student?.motherTongue || "",
    religion: student?.religion || "",
    caste: student?.caste || "",
    subCaste: student?.subCaste || "",
    medium: student?.medium || "",
    board: student?.board || "",
    address: student?.address || "",
    admissionDate: student?.admissionDate ? formatDateInput(student.admissionDate) : today,
    status: student?.status || "ACTIVE",
  });
  function updateValue<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  const [standardId, setStandardId] = useState(student?.standardId || "");
  const [academicYear, setAcademicYear] = useState(student?.academicYear || defaultAcademicYear);
  const [discount, setDiscount] = useState(String(student?.discount ?? 0));
  const [schoolFees, setSchoolFees] = useState(
    student?.customFee != null ? String(student.customFee) : ""
  );
  const feesTouched = useRef(isEdit);

  const [districtName, setDistrictName] = useState(student?.district || "");
  const [talukaName, setTalukaName] = useState(student?.taluka || "");
  const [villageName, setVillageName] = useState(student?.village || "");
  const [schoolBus, setSchoolBus] = useState(student?.schoolBus ? "true" : "false");

  const selectedDistrict = districts.find((d) => d.name === districtName);
  const talukaOptions = selectedDistrict?.talukas || [];
  const selectedTaluka = talukaOptions.find((t) => t.name === talukaName);
  const villageOptions = selectedTaluka?.villages || [];
  const selectedVillage = villageOptions.find((v) => v.name === villageName);
  const busFee = schoolBus === "true" ? selectedVillage?.busFee || 0 : 0;

  function handleDistrictChange(name: string) {
    setDistrictName(name);
    setTalukaName("");
    setVillageName("");
  }
  function handleTalukaChange(name: string) {
    setTalukaName(name);
    setVillageName("");
  }

  const autoFee = useMemo(
    () =>
      feeStructures.find(
        (f) => f.standardId === standardId && f.academicYear === academicYear
      )?.totalAmount ?? 0,
    [feeStructures, standardId, academicYear]
  );

  useEffect(() => {
    if (!feesTouched.current) {
      setSchoolFees(autoFee ? String(autoFee) : "");
    }
  }, [autoFee]);

  const totalFees = Math.max(0, (Number(schoolFees) || 0) - (Number(discount) || 0)) + busFee;

  return (
    <Card>
      <CardContent>
        <form action={formAction}>
          {isEdit && <input type="hidden" name="id" value={student!.id} />}

          <SectionTitle icon={UserRound} title="Student Information" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="admissionNo">Register Number *</Label>
              <Input
                id="admissionNo"
                name="admissionNo"
                required
                aria-invalid={state?.field === "admissionNo"}
                value={values.admissionNo}
                onChange={(e) => updateValue("admissionNo", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                name="name"
                required
                value={values.name}
                onChange={(e) => updateValue("name", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                name="dob"
                type="date"
                value={values.dob}
                onChange={(e) => updateValue("dob", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="birthPlace">Birth Place</Label>
              <Input
                id="birthPlace"
                name="birthPlace"
                value={values.birthPlace}
                onChange={(e) => updateValue("birthPlace", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="aadharNumber">Aadhar Card Number *</Label>
              <Input
                id="aadharNumber"
                name="aadharNumber"
                required
                pattern="\d{12}"
                maxLength={12}
                title="Enter a 12 digit Aadhar Card Number"
                aria-invalid={state?.field === "aadharNumber"}
                value={values.aadharNumber}
                onChange={(e) => updateValue("aadharNumber", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <NativeSelect
                id="gender"
                name="gender"
                value={values.gender}
                onChange={(e) => updateValue("gender", e.target.value)}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="penId">PEN ID</Label>
              <Input
                id="penId"
                name="penId"
                value={values.penId}
                onChange={(e) => updateValue("penId", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apaarId">APAAR ID</Label>
              <Input
                id="apaarId"
                name="apaarId"
                value={values.apaarId}
                onChange={(e) => updateValue("apaarId", e.target.value)}
              />
            </div>
          </div>

          <SectionTitle icon={Users} title="Family Details" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fatherName">Father&apos;s Name</Label>
              <Input
                id="fatherName"
                name="fatherName"
                value={values.fatherName}
                onChange={(e) => updateValue("fatherName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="motherName">Mother&apos;s Name</Label>
              <Input
                id="motherName"
                name="motherName"
                value={values.motherName}
                onChange={(e) => updateValue("motherName", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Mobile Number</Label>
              <Input
                id="phone"
                name="phone"
                value={values.phone}
                onChange={(e) => updateValue("phone", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="motherTongue">Mother Tongue</Label>
              <Input
                id="motherTongue"
                name="motherTongue"
                value={values.motherTongue}
                onChange={(e) => updateValue("motherTongue", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="religion">Religion</Label>
              <Input
                id="religion"
                name="religion"
                value={values.religion}
                onChange={(e) => updateValue("religion", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="caste">Caste</Label>
              <Input
                id="caste"
                name="caste"
                value={values.caste}
                onChange={(e) => updateValue("caste", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subCaste">Sub Caste</Label>
              <Input
                id="subCaste"
                name="subCaste"
                value={values.subCaste}
                onChange={(e) => updateValue("subCaste", e.target.value)}
              />
            </div>
          </div>

          <SectionTitle icon={GraduationCap} title="Academic Details" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="standardId">Standard *</Label>
              <NativeSelect
                id="standardId"
                name="standardId"
                required
                value={standardId}
                onChange={(e) => setStandardId(e.target.value)}
              >
                <option value="">Select Standard</option>
                {standards.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="academicYear">Academic Year *</Label>
              <Input
                id="academicYear"
                name="academicYear"
                required
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="medium">Medium</Label>
              <Input
                id="medium"
                name="medium"
                value={values.medium}
                onChange={(e) => updateValue("medium", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="board">Board</Label>
              <NativeSelect
                id="board"
                name="board"
                value={values.board}
                onChange={(e) => updateValue("board", e.target.value)}
              >
                <option value="">Select Board</option>
                <option value="CBSE">CBSE</option>
                <option value="Maharashtra State Board">Maharashtra State Board</option>
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="schoolBus">School Bus</Label>
              <NativeSelect id="schoolBus" name="schoolBus" value={schoolBus} onChange={(e) => setSchoolBus(e.target.value)}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </NativeSelect>
              {schoolBus === "true" && (
                <p className="text-xs text-muted-foreground">
                  {selectedVillage
                    ? `Bus fee for ${selectedVillage.name}: ₹${selectedVillage.busFee}`
                    : "Select a village below to apply its bus fee"}
                </p>
              )}
            </div>
            {isEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <NativeSelect
                  id="status"
                  name="status"
                  value={values.status}
                  onChange={(e) => updateValue("status", e.target.value)}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </NativeSelect>
              </div>
            )}
          </div>

          <SectionTitle icon={MapPin} title="Address" />
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={values.address}
                onChange={(e) => updateValue("address", e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="district">District</Label>
              <NativeSelect
                id="district"
                name="district"
                value={districtName}
                onChange={(e) => handleDistrictChange(e.target.value)}
              >
                <option value="">Select District</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taluka">Taluka</Label>
              <NativeSelect
                id="taluka"
                name="taluka"
                value={talukaName}
                onChange={(e) => handleTalukaChange(e.target.value)}
                disabled={!selectedDistrict}
              >
                <option value="">Select Taluka</option>
                {talukaOptions.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="village">Village</Label>
              <NativeSelect
                id="village"
                name="village"
                value={villageName}
                onChange={(e) => setVillageName(e.target.value)}
                disabled={!selectedTaluka}
              >
                <option value="">Select Village</option>
                {villageOptions.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </NativeSelect>
              <input type="hidden" name="villageId" value={selectedVillage?.id || ""} />
            </div>
          </div>
          {districts.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              No districts set up yet — add them under Settings → Village Setting.
            </p>
          )}

          <SectionTitle icon={Wallet} title="Fee Details" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="admissionDate">Date of Admission</Label>
              <Input
                id="admissionDate"
                name="admissionDate"
                type="date"
                value={values.admissionDate}
                onChange={(e) => updateValue("admissionDate", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schoolFees">School Fees (₹)</Label>
              <Input
                id="schoolFees"
                name="customFee"
                type="number"
                step="0.01"
                min={0}
                value={schoolFees}
                placeholder="Auto-filled from fee structure"
                onChange={(e) => {
                  feesTouched.current = true;
                  setSchoolFees(e.target.value);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="discount">Discount (₹)</Label>
              <Input
                id="discount"
                name="discount"
                type="number"
                step="0.01"
                min={0}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            {busFee > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="busFeeDisplay">Bus Fee (₹)</Label>
                <Input id="busFeeDisplay" readOnly disabled value={busFee} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="totalFees">Total Fees (₹) {busFee > 0 && "— incl. bus fee"}</Label>
              <Input id="totalFees" name="totalFees" readOnly disabled value={totalFees} />
            </div>
          </div>

          {state?.error && (
            <div className="mt-6 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <Button type="submit" size="lg" className="mt-8 w-full" disabled={pending}>
            {pending ? "Saving..." : isEdit ? "Save Changes" : "Admit Student"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
