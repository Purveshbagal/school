"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export function StaffSearchFilter({ placeholder = "Search by name..." }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") || "";
  const [q, setQ] = useState(urlQ);

  // Keep the input in sync when the URL's ?q= changes from outside this form — e.g. the
  // browser Back/Forward buttons, which don't remount this component. Adjusting state
  // during render (rather than in an effect) avoids an extra render pass.
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ);
    setQ(urlQ);
  }

  return (
    <form
      className="mb-4 flex max-w-md items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams.toString());
        if (q) params.set("q", q);
        else params.delete("q");
        router.push(`${pathname}?${params.toString()}`);
      }}
    >
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="pl-8"
        />
      </div>
      <Button type="submit" variant="outline">
        Search
      </Button>
    </form>
  );
}
