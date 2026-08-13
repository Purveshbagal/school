"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateSaleAction } from "@/app/actions/stationary";
import { formatCurrency } from "@/lib/utils";
import { SaleItemsEditor, type CartLine, type CatalogItem } from "../../sale-items-editor";
import { Wallet } from "lucide-react";

export function EditSaleForm({
  saleId,
  paymentMode,
  totalPaid,
  due,
  items,
  initialCart,
}: {
  saleId: string;
  paymentMode: string;
  totalPaid: number;
  due: number;
  items: CatalogItem[];
  initialCart: CartLine[];
}) {
  const [state, formAction, pending] = useActionState(updateSaleAction, undefined);
  const [cart, setCart] = useState<CartLine[]>(initialCart);

  return (
    <Card>
      <CardContent>
        <div className="mb-5 flex items-center justify-between rounded-lg bg-muted/60 p-3.5">
          <div>
            <p className="text-xs text-muted-foreground">Received so far</p>
            <p className="text-lg font-semibold text-success">{formatCurrency(totalPaid)}</p>
          </div>
          {due > 0 ? (
            <Button size="sm" variant="outline" render={<Link href={`/stationary/payments/new?sale=${saleId}`} />}>
              <Wallet /> Record Payment
            </Button>
          ) : (
            <Badge variant="success">Fully Paid</Badge>
          )}
        </div>

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="id" value={saleId} />

          <SaleItemsEditor catalogItems={items} cart={cart} setCart={setCart} showPaymentInput={false} />

          <div className="space-y-1.5">
            <Label htmlFor="paymentMode">Payment Method</Label>
            <NativeSelect id="paymentMode" name="paymentMode" defaultValue={paymentMode}>
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
            {pending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
