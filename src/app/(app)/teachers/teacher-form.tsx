"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { createTeacherAction, updateTeacherAction } from "@/app/actions/teachers";

type TeacherValues = {
  id?: string;
  name?: string;
  designation?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  monthlySalary?: number;
  joiningDate?: Date | string | null;
  status?: string;
};

export function TeacherForm({ teacher, today }: { teacher?: TeacherValues; today: string }) {
  const isEdit = Boolean(teacher?.id);
  const [state, formAction, pending] = useActionState(
    isEdit ? updateTeacherAction : createTeacherAction,
    undefined
  );

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-5">
          {isEdit && <input type="hidden" name="id" value={teacher!.id} />}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" name="name" required defaultValue={teacher?.name} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                name="designation"
                placeholder="e.g. Teacher, Principal, Clerk"
                defaultValue={teacher?.designation || ""}
              />
            </div>
            {isEdit ? (
              <div className="space-y-1.5">
                <Label>Monthly Salary</Label>
                <p className="text-sm text-muted-foreground">
                  Managed via{" "}
                  <Link href={`/salary-structure/${teacher!.id}`} className="text-primary underline">
                    Salary Structure
                  </Link>{" "}
                  so every change keeps a revision history.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="monthlySalary">Monthly Salary (₹) *</Label>
                <Input
                  id="monthlySalary"
                  name="monthlySalary"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={teacher?.monthlySalary}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={teacher?.phone || ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={teacher?.email || ""} />
            </div>

            {!isEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="joiningDate">Joining Date</Label>
                <Input
                  id="joiningDate"
                  name="joiningDate"
                  type="date"
                  defaultValue={today}
                />
              </div>
            )}
            {isEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <NativeSelect id="status" name="status" defaultValue={teacher?.status || "ACTIVE"}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </NativeSelect>
              </div>
            )}

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={teacher?.address || ""} />
            </div>
          </div>

          {state?.error && (
            <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Saving..." : isEdit ? "Save Changes" : "Add Teacher"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
