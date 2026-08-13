"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

type Standard = { id: string; name: string };
type VillageOption = { id: string; name: string; taluka: string };

export function StudentsFilters({
  standards,
  villages,
}: {
  standards: Standard[];
  villages: VillageOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/students?${params.toString()}`);
  }

  return (
    <form
      className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        updateParam("q", q);
      }}
    >
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, register number, father's name, phone..."
          className="pl-8"
        />
      </div>
      <NativeSelect
        name="standard"
        defaultValue={searchParams.get("standard") || ""}
        className="sm:w-48"
        onChange={(e) => updateParam("standard", e.target.value)}
      >
        <option value="">All Standards</option>
        {standards.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        name="village"
        defaultValue={searchParams.get("village") || ""}
        className="sm:w-48"
        onChange={(e) => updateParam("village", e.target.value)}
      >
        <option value="">All Villages</option>
        {villages.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name} ({v.taluka})
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        name="status"
        defaultValue={searchParams.get("status") || ""}
        className="sm:w-40"
        onChange={(e) => updateParam("status", e.target.value)}
      >
        <option value="">All Status</option>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
      </NativeSelect>
      <Button type="submit" variant="outline">
        Search
      </Button>
    </form>
  );
}
