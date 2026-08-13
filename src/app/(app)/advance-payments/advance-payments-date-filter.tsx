"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RANGE_OPTIONS } from "@/lib/date-ranges";

export function AdvancePaymentsDateFilter({ basePath = "/advance-payments" }: { basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentRange = searchParams.get("range") || "all";
  const [range, setRange] = useState(currentRange);
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");

  function navigate(params: URLSearchParams) {
    router.push(`${basePath}?${params.toString()}`);
  }

  function applyRange(value: string) {
    setRange(value);
    if (value === "custom") return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    params.delete("from");
    params.delete("to");
    navigate(params);
  }

  function applyCustom() {
    if (!from || !to) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("from", from);
    params.set("to", to);
    navigate(params);
  }

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <NativeSelect value={range} onChange={(e) => applyRange(e.target.value)} className="sm:w-48">
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
