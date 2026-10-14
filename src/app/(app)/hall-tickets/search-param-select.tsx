"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";

/** Dropdown bound to one URL search param (e.g. ?year= or ?exam=). Params listed in
 * `resetParams` are dropped on change, since they depend on this one (an exam picked
 * for one year isn't valid in another). */
export function SearchParamSelect({
  param,
  label,
  value,
  options,
  resetParams = [],
  className,
}: {
  param: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  resetParams?: string[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(param, next);
    for (const key of resetParams) params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className={className}>
      <Label htmlFor={`select-${param}`} className="mb-1.5">
        {label}
      </Label>
      <NativeSelect id={`select-${param}`} value={value} onChange={(e) => handleChange(e.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
