"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DocumentHeader } from "@/components/document-header";
import { PrintDownloadActions } from "@/components/print-download-actions";
import { MobileScaleWrapper } from "@/components/mobile-scale-wrapper";
import { ResultCard } from "./result-card";
import { lookupResultAction, type ResultLookupResult } from "@/app/actions/marks";

export function AadharLookupForm({
  token,
  schoolName,
  address,
  udise,
  phone,
  examName,
}: {
  token: string;
  schoolName: string;
  address: string | null;
  udise: string | null;
  phone: string | null;
  examName: string;
}) {
  const [aadhar, setAadhar] = useState("");
  const [result, setResult] = useState<ResultLookupResult | null>(null);
  const [pending, startTransition] = useTransition();

  function showResult() {
    startTransition(async () => {
      const res = await lookupResultAction(token, aadhar);
      setResult(res);
    });
  }

  if (result && !("error" in result)) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 print:max-w-none">
        <div className="flex justify-end">
          <PrintDownloadActions targetId="exam-result-card" fileName={`Result-${result.studentName}`} />
        </div>

        <MobileScaleWrapper desktopWidth={640}>
          <ResultCard
            schoolName={schoolName}
            address={address}
            phone={phone}
            studentName={result.studentName}
            motherName={result.motherName}
            standardName={result.standardName}
            examName={result.examName}
            resultDate={result.resultDate}
            rows={result.rows}
            totalObtained={result.totalObtained}
            totalMax={result.totalMax}
            percentage={result.percentage}
            rank={result.rank}
            totalStudents={result.totalStudents}
          />
        </MobileScaleWrapper>

        <Button
          variant="outline"
          className="w-full border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 print:hidden"
          onClick={() => setResult(null)}
        >
          Check Another
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <DocumentHeader docType="Exam Result" schoolName={schoolName} address={address} udise={udise} phone={phone} />
      {examName && (
        <p className="mt-3 text-center text-sm font-medium text-muted-foreground">{examName}</p>
      )}

      <div className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="aadharNumber">Student Aadhar Card Number</Label>
          <Input
            id="aadharNumber"
            value={aadhar}
            onChange={(e) => setAadhar(e.target.value)}
            placeholder="Enter Aadhar card number"
          />
        </div>

        {result && "error" in result && (
          <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
            {result.error}
          </div>
        )}

        <Button type="button" className="w-full" disabled={pending || !aadhar.trim()} onClick={showResult}>
          {pending ? "Checking..." : "Show Result"}
        </Button>
      </div>
    </div>
  );
}
