"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, MapPin, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type VillageOption = {
  id: string;
  name: string;
  taluka: string;
  /** Other drivers whose route already covers this village. */
  coveredBy: string[];
};

/**
 * Multi-select dropdown of villages with checkboxes and search. Each ticked village is
 * submitted as its own `villageIds` form field.
 */
export function VillagePicker({ villages, defaultSelected = [] }: { villages: VillageOption[]; defaultSelected?: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelected.filter((id) => villages.some((v) => v.id === id)))
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    searchRef.current?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return villages;
    return villages.filter((v) => v.name.toLowerCase().includes(q) || v.taluka.toLowerCase().includes(q));
  }, [villages, query]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setMany = (ids: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const chosen = villages.filter((v) => selected.has(v.id));

  if (villages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-3.5 py-3 text-sm text-muted-foreground">
        No villages set up yet. Add them under{" "}
        <Link href="/settings?tab=locations" className="text-primary hover:underline">
          Settings → Village Setting
        </Link>
        .
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="villageIds" value={id} />
      ))}

      <button
        type="button"
        id="villageIds"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
      >
        <span className={cn("truncate", chosen.length === 0 && "text-muted-foreground")}>
          {chosen.length === 0
            ? "Choose villages…"
            : chosen.length === 1
              ? chosen[0].name
              : `${chosen.length} villages selected`}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search village or taluka"
              className="h-6 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center justify-between border-b border-border px-2.5 py-1.5 text-xs">
            <span className="text-muted-foreground">{selected.size} selected</span>
            <span className="flex gap-3">
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => setMany(visible.map((v) => v.id), true)}>
                Select {query ? "shown" : "all"}
              </button>
              <button type="button" className="font-medium text-muted-foreground hover:text-foreground" onClick={() => setMany(visible.map((v) => v.id), false)}>
                Clear
              </button>
            </span>
          </div>
          <ul role="listbox" aria-multiselectable="true" className="max-h-72 overflow-y-auto py-1">
            {visible.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">No village matches.</li>}
            {visible.map((v) => {
              const on = selected.has(v.id);
              return (
                <li key={v.id} role="option" aria-selected={on}>
                  <button
                    type="button"
                    onClick={() => toggle(v.id)}
                    className="flex w-full items-start gap-2.5 px-2.5 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-input"
                      )}
                    >
                      {on && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{v.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {v.taluka}
                        {v.coveredBy.length > 0 && ` · also: ${v.coveredBy.join(", ")}`}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {chosen.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chosen.map((v) => (
            <span key={v.id} className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 py-0.5 pr-1 pl-2 text-xs font-medium text-orange-700 dark:text-orange-300">
              <MapPin className="h-3 w-3" />
              {v.name}
              <button
                type="button"
                onClick={() => toggle(v.id)}
                aria-label={`Remove ${v.name}`}
                className="rounded-full p-0.5 hover:bg-orange-500/20"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
