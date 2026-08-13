"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveFeeStructureAction } from "@/app/actions/standards";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

type Component = { name: string; amount: number };

export function FeeStructureForm({
  standardId,
  academicYear,
  initialComponents,
}: {
  standardId: string;
  academicYear: string;
  initialComponents: Component[];
}) {
  const router = useRouter();
  const [components, setComponents] = useState<Component[]>(initialComponents);
  const [pending, setPending] = useState(false);
  const total = components.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  function updateRow(index: number, patch: Partial<Component>) {
    setComponents((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c))
    );
  }

  function addRow() {
    setComponents((prev) => [...prev, { name: "", amount: 0 }]);
  }

  function removeRow(index: number) {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const formData = new FormData();
    formData.set("standardId", standardId);
    formData.set("academicYear", academicYear);
    formData.set("components", JSON.stringify(components));
    await saveFeeStructureAction(formData);
    router.push("/standards");
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            {components.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Fee component e.g. Tuition Fee"
                  value={c.name}
                  onChange={(e) => updateRow(i, { name: e.target.value })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Amount"
                  value={c.amount || ""}
                  onChange={(e) => updateRow(i, { amount: Number(e.target.value) })}
                  className="w-32"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(i)}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus /> Add Fee Component
          </Button>

          <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
            <span className="text-sm font-medium text-muted-foreground">
              Total Annual Fee
            </span>
            <span className="text-lg font-semibold">{formatCurrency(total)}</span>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Saving..." : "Save Fee Structure"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
