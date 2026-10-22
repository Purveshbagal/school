"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { createDriverAction, updateDriverAction } from "@/app/actions/bus-drivers";
import { VillagePicker, type VillageOption } from "./village-picker";

export type BusOption = { id: string; vehicleNumber: string; status: string; assignedTo: string[] };

type DriverValues = {
  id: string;
  name: string;
  phone: string | null;
  username: string;
  busId: string | null;
  villageIds: string[];
  status: string;
};

export function DriverForm({
  buses,
  villages,
  driver,
}: {
  buses: BusOption[];
  villages: VillageOption[];
  driver?: DriverValues;
}) {
  const isEdit = Boolean(driver);
  const [state, formAction, pending] = useActionState(isEdit ? updateDriverAction : createDriverAction, undefined);

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-5">
          {driver && <input type="hidden" name="id" value={driver.id} />}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Driver Name *</Label>
              <Input id="name" name="name" required placeholder="e.g. Ramesh Jadhav" defaultValue={driver?.name} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Mobile Number</Label>
              <Input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={driver?.phone || ""} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="busId">Select Bus *</Label>
            {buses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-3.5 py-3 text-sm text-muted-foreground">
                No school bus added yet.{" "}
                <Link href="/buses/new" className="text-primary hover:underline">
                  Add a bus first
                </Link>
                .
              </div>
            ) : (
              <NativeSelect id="busId" name="busId" required defaultValue={driver?.busId || ""}>
                <option value="" disabled>
                  Choose a bus…
                </option>
                {buses.map((b) => {
                  const others = b.assignedTo.filter((name) => name !== driver?.name);
                  return (
                    <option key={b.id} value={b.id}>
                      {b.vehicleNumber}
                      {b.status !== "ACTIVE" ? " (inactive)" : ""}
                      {others.length ? ` — also: ${others.join(", ")}` : ""}
                    </option>
                  );
                })}
              </NativeSelect>
            )}
            <p className="text-xs text-muted-foreground">
              The driver&apos;s live location shows on the map as this bus.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="villageIds">Select Villages</Label>
            <VillagePicker villages={villages} defaultSelected={driver?.villageIds} />
            <p className="text-xs text-muted-foreground">
              Villages this bus goes to. Students admitted from these villages see this bus live in the student app.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username *</Label>
              {driver ? (
                <Input id="username" value={driver.username} disabled readOnly />
              ) : (
                <Input
                  id="username"
                  name="username"
                  required
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="e.g. ramesh"
                  pattern="[A-Za-z0-9._\-]{3,30}"
                  title="3–30 letters, numbers, dot, dash or underscore — no spaces"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{driver ? "New Password" : "Password *"}</Label>
              <Input
                id="password"
                name="password"
                type="text"
                required={!driver}
                minLength={4}
                autoComplete="new-password"
                placeholder={driver ? "Leave blank to keep the current one" : "At least 4 characters"}
              />
            </div>
          </div>

          {driver && (
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <NativeSelect id="status" name="status" defaultValue={driver.status}>
                <option value="ACTIVE">Active — can log in and drive</option>
                <option value="INACTIVE">Inactive — logged out, cannot log in</option>
              </NativeSelect>
            </div>
          )}

          {state?.error && (
            <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{state.error}</div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending || buses.length === 0}>
            {pending ? "Saving..." : driver ? "Save Changes" : "Create Driver Login"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
