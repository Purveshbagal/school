"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** "Exam Date From / To" pair. "To" can't be picked earlier than "From", and moving
 * "From" past the current "To" pulls "To" along so the range never inverts. */
export function ExamDateRangeFields({
  idPrefix,
  defaultFrom = "",
  defaultTo = "",
}: {
  idPrefix: string;
  defaultFrom?: string;
  defaultTo?: string;
}) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const fromRef = useRef<HTMLInputElement>(null);

  // These inputs are controlled, so React's automatic reset after a successful form
  // action doesn't clear them — listen for the form's reset and clear them with it.
  useEffect(() => {
    const form = fromRef.current?.form;
    if (!form) return;
    function handleReset() {
      setFrom(defaultFrom);
      setTo(defaultTo);
    }
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, [defaultFrom, defaultTo]);

  function handleFromChange(value: string) {
    setFrom(value);
    if (!to || (value && to < value)) setTo(value);
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-examDate`}>Exam Date From</Label>
        <Input
          ref={fromRef}
          id={`${idPrefix}-examDate`}
          name="examDate"
          type="date"
          value={from}
          onChange={(e) => handleFromChange(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-examEndDate`}>Exam Date To</Label>
        <Input
          id={`${idPrefix}-examEndDate`}
          name="examEndDate"
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => setTo(e.target.value)}
          required
        />
      </div>
    </div>
  );
}
