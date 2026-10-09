"use client";

import { useActionState, useState } from "react";
import { User, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <User className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            defaultValue="admin"
            className="h-12 pl-10"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="h-12 pr-12 pl-10"
          />
          <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-lg text-muted-foreground hover:text-primary">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
        </div>
      </div>

      {state?.error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <Button type="submit" size="lg" className="h-12 w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign in to workspace"}
        {!pending && <ArrowRight className="size-4" />}
      </Button>
    </form>
  );
}
