"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";

function shiftDay(day: string, by: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
}

export function HistoryFilters({
  date,
  today,
  busId,
  buses,
}: {
  date: string;
  today: string;
  busId: string;
  buses: { id: string; vehicleNumber: string }[];
}) {
  const router = useRouter();

  function go(next: { date?: string; bus?: string }) {
    const params = new URLSearchParams();
    const nextDate = next.date ?? date;
    const nextBus = next.bus ?? busId;
    if (nextDate) params.set("date", nextDate);
    if (nextBus) params.set("bus", nextBus);
    router.push(`/live-tracking/history?${params.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="icon" onClick={() => go({ date: shiftDay(date, -1) })} aria-label="Previous day">
          <ChevronLeft />
        </Button>
        <Input
          type="date"
          value={date}
          max={today}
          onChange={(e) => e.target.value && go({ date: e.target.value })}
          className="w-40"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => go({ date: shiftDay(date, 1) })}
          disabled={date >= today}
          aria-label="Next day"
        >
          <ChevronRight />
        </Button>
        {date !== today && (
          <Button variant="ghost" size="sm" onClick={() => go({ date: today })}>
            Today
          </Button>
        )}
      </div>
      <NativeSelect value={busId} onChange={(e) => go({ bus: e.target.value })} className="sm:w-52">
        <option value="">All buses</option>
        {buses.map((b) => (
          <option key={b.id} value={b.id}>
            {b.vehicleNumber}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
