"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RANGE_OPTIONS } from "@/lib/date-ranges";

export function PaymentsDateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentRange = searchParams.get("range") || "all";
  const [range, setRange] = useState(currentRange);
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");

  function applyRange(value: string) {
    setRange(value);
    if (value === "custom") return; // wait for from/to + Apply
    router.push(`/payments?range=${value}`);
  }

  function applyCustom() {
    if (!from || !to) return;
    router.push(`/payments?range=custom&from=${from}&to=${to}`);
  }

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <NativeSelect
        value={range}
        onChange={(e) => applyRange(e.target.value)}
        className="sm:w-48"
      >
        {RANGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </NativeSelect>

      {range === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          <span className="text-sm text-muted-foreground">to</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          <Button variant="outline" size="sm" onClick={applyCustom} disabled={!from || !to}>
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
