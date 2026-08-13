"use client";

import { useActionState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { createItemAction, updateItemAction } from "@/app/actions/stationary";

type ItemValues = {
  id?: string;
  name?: string;
  price?: number;
  status?: string;
};

export function ItemForm({ item }: { item?: ItemValues }) {
  const isEdit = Boolean(item?.id);
  const [state, formAction, pending] = useActionState(
    isEdit ? updateItemAction : createItemAction,
    undefined
  );

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {isEdit && <input type="hidden" name="id" value={item!.id} />}

          <div className="space-y-1.5">
            <Label htmlFor="name">Item Name *</Label>
            <Input id="name" name="name" required defaultValue={item?.name} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="price">Price (₹) *</Label>
            <Input id="price" name="price" type="number" step="0.01" min="0.01" required defaultValue={item?.price} />
          </div>
          {isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <NativeSelect id="status" name="status" defaultValue={item?.status || "ACTIVE"}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </NativeSelect>
            </div>
          )}

          {state?.error && (
            <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving..." : isEdit ? "Save Changes" : "Add Item"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
