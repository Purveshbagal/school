"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { TEACHER_HISTORY_RANGE_OPTIONS } from "@/lib/date-ranges";

export function TeacherHistoryFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRange = searchParams.get("historyRange") || "all";

  function applyRange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("historyRange", value);
    router.push(`${pathname}?${params.toString()}#history`);
  }

  return (
    <NativeSelect value={currentRange} onChange={(e) => applyRange(e.target.value)} className="w-full sm:w-48">
      {TEACHER_HISTORY_RANGE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </NativeSelect>
  );
}
