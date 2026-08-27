import { formatCurrency } from "@/lib/utils";

export function PayrollRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

export function PayrollLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className={value < 0 ? "text-destructive" : value > 0 ? "text-foreground" : ""}>{formatCurrency(value)}</span>
    </div>
  );
}
