"use client";

import { useActionState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { createBusAction, updateBusAction } from "@/app/actions/buses";

type BusValues = {
  id?: string;
  vehicleNumber?: string;
  driverName?: string | null;
  phone?: string | null;
  capacity?: number | null;
  status?: string;
};

export function BusForm({ bus }: { bus?: BusValues }) {
  const isEdit = Boolean(bus?.id);
  const [state, formAction, pending] = useActionState(
    isEdit ? updateBusAction : createBusAction,
    undefined
  );

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-5">
          {isEdit && <input type="hidden" name="id" value={bus!.id} />}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vehicleNumber">Vehicle Number *</Label>
              <Input
                id="vehicleNumber"
                name="vehicleNumber"
                required
                placeholder="e.g. MH16 AB 1234"
                defaultValue={bus?.vehicleNumber}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="driverName">Driver Name</Label>
              <Input id="driverName" name="driverName" defaultValue={bus?.driverName || ""} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Driver Phone</Label>
              <Input id="phone" name="phone" defaultValue={bus?.phone || ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacity">Seating Capacity</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min={0}
                defaultValue={bus?.capacity ?? ""}
              />
            </div>

            {isEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <NativeSelect id="status" name="status" defaultValue={bus?.status || "ACTIVE"}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </NativeSelect>
              </div>
            )}
          </div>

          {state?.error && (
            <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Saving..." : isEdit ? "Save Changes" : "Add Bus"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
