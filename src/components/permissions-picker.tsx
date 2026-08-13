"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { GRANTABLE_NAV_SECTIONS } from "@/lib/nav-sections";

export function PermissionsPicker({ defaultValue = [] }: { defaultValue?: string[] }) {
  const [selected, setSelected] = useState<string[]>(defaultValue);

  function toggle(href: string, checked: boolean) {
    setSelected((prev) => (checked ? [...prev, href] : prev.filter((h) => h !== href)));
  }

  return (
    <div>
      {selected.map((href) => (
        <input key={href} type="hidden" name="permissions" value={href} />
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button type="button" variant="outline" className="w-full justify-between">
              <span>
                {selected.length === 0
                  ? "Select functions to allow"
                  : `${selected.length} function${selected.length === 1 ? "" : "s"} selected`}
              </span>
              <ChevronDown className="h-4 w-4 opacity-60" />
            </Button>
          }
        />
        <DropdownMenuContent className="max-h-80 w-[var(--anchor-width)] min-w-64">
          {GRANTABLE_NAV_SECTIONS.map((section, i) => (
            <div key={section.label}>
              {i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuGroup>
                <DropdownMenuLabel>{section.label}</DropdownMenuLabel>
                {section.items.map((item) => (
                  <DropdownMenuCheckboxItem
                    key={item.href}
                    checked={selected.includes(item.href)}
                    onCheckedChange={(checked) => toggle(item.href, checked)}
                  >
                    {item.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((href) => {
            const label = GRANTABLE_NAV_SECTIONS.flatMap((s) => s.items).find(
              (item) => item.href === href
            )?.label;
            return (
              <button
                key={href}
                type="button"
                onClick={() => toggle(href, false)}
                className="rounded-full border border-border bg-accent/40 px-2.5 py-0.5 text-xs text-foreground/80 transition hover:bg-destructive/10 hover:text-destructive"
              >
                {label || href} &times;
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
