"use client";

import { useActionState, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { createSaleAction } from "@/app/actions/stationary";
import { SaleItemsEditor, type CartLine, type CatalogItem } from "../sale-items-editor";

export function SaleForm({ studentId, items }: { studentId: string; items: CatalogItem[] }) {
  const [state, formAction, pending] = useActionState(createSaleAction, undefined);
  const [cart, setCart] = useState<CartLine[]>([]);

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="studentId" value={studentId} />

          <SaleItemsEditor catalogItems={items} cart={cart} setCart={setCart} />

          <div className="space-y-1.5">
            <Label htmlFor="paymentMode">Payment Method</Label>
            <NativeSelect id="paymentMode" name="paymentMode" defaultValue="CASH">
              <option value="CASH">Cash</option>
              <option value="ONLINE">Online</option>
            </NativeSelect>
          </div>

          {state?.error && (
            <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending || cart.length === 0}>
            {pending ? "Saving..." : "Save Sale"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
