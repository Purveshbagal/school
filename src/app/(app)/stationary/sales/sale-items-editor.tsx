"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { X } from "lucide-react";

export type CatalogItem = { id: string; name: string; price: number };
export type CartLine = CatalogItem & { qty: string };

export function SaleItemsEditor({
  catalogItems,
  cart,
  setCart,
  showPaymentInput = true,
}: {
  catalogItems: CatalogItem[];
  cart: CartLine[];
  setCart: Dispatch<SetStateAction<CartLine[]>>;
  /** Show the "Amount Received" input — only relevant when creating a new sale. Follow-up payments against an existing sale are recorded via the dedicated Stationary Payment In flow. */
  showPaymentInput?: boolean;
}) {
  const availableItems = catalogItems.filter((item) => !cart.some((c) => c.id === item.id));
  const total = cart.reduce((sum, line) => sum + line.price * (Number(line.qty) || 0), 0);

  const [paidAmount, setPaidAmount] = useState("");
  const paidTouched = useRef(false);

  useEffect(() => {
    if (!paidTouched.current) {
      setPaidAmount(total ? String(total) : "");
    }
  }, [total]);

  const pendingAmount = Math.max(0, total - (Number(paidAmount) || 0));

  function addItem(itemId: string) {
    const item = catalogItems.find((i) => i.id === itemId);
    if (!item) return;
    setCart((prev) => [...prev, { ...item, qty: "1" }]);
  }

  function updateQty(itemId: string, qty: string) {
    setCart((prev) => prev.map((line) => (line.id === itemId ? { ...line, qty } : line)));
  }

  function removeItem(itemId: string) {
    setCart((prev) => prev.filter((line) => line.id !== itemId));
  }

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="addItem">Add Item</Label>
        <NativeSelect
          id="addItem"
          value=""
          disabled={availableItems.length === 0}
          onChange={(e) => {
            if (e.target.value) addItem(e.target.value);
          }}
        >
          <option value="">
            {availableItems.length === 0 ? "No more items to add" : "Select item to add..."}
          </option>
          {availableItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — {formatCurrency(item.price)}
            </option>
          ))}
        </NativeSelect>
      </div>

      {cart.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No items added yet. Use &quot;Add Item&quot; above to start the sale.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {cart.map((line) => {
            const amount = line.price * (Number(line.qty) || 0);
            return (
              <div key={line.id} className="flex items-center gap-3 p-3">
                <input type="hidden" name="itemId" value={line.id} />
                <input type="hidden" name="itemName" value={line.name} />
                <input type="hidden" name="itemPrice" value={line.price} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{line.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(line.price)} each</p>
                </div>
                <Input
                  type="number"
                  name="itemQty"
                  min={1}
                  step={1}
                  value={line.qty}
                  onChange={(e) => updateQty(line.id, e.target.value)}
                  className="w-20 text-center"
                />
                <p className="w-24 shrink-0 text-right text-sm font-semibold">
                  {formatCurrency(amount)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeItem(line.id)}
                >
                  <X />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg bg-muted/60 p-3.5">
        <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
        <p className="text-xl font-bold">{formatCurrency(total)}</p>
      </div>

      {showPaymentInput && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="paidAmount">Amount Received (₹)</Label>
            <Input
              id="paidAmount"
              name="paidAmount"
              type="number"
              step="0.01"
              min={0}
              value={paidAmount}
              onChange={(e) => {
                paidTouched.current = true;
                setPaidAmount(e.target.value);
              }}
            />
          </div>

          {pendingAmount > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-destructive/10 p-3.5">
              <p className="text-sm font-medium text-destructive">Pending Amount</p>
              <p className="text-xl font-bold text-destructive">{formatCurrency(pendingAmount)}</p>
            </div>
          )}
        </>
      )}
    </>
  );
}
