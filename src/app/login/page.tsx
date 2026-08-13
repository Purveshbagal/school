import { redirect } from "next/navigation";
import { ShieldCheck, Wallet, Users, ScrollText } from "lucide-react";
import { getSession, getLandingPath } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LoginForm } from "./login-form";

const HIGHLIGHTS = [
  { icon: Users, text: "Admissions, students & staff in one place" },
  { icon: Wallet, text: "Fees, payroll & stationary sales tracked live" },
  { icon: ScrollText, text: "Print-ready receipts, certificates & invoices" },
];

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    const landingPath = getLandingPath(session);
    if (landingPath) redirect(landingPath);
    // Session valid but no accessible pages (e.g. staff account with no
    // permissions granted) — fall through to the login form rather than
    // looping. Signing in again will fail with a clear error (see loginAction).
  }

  const settings = await prisma.schoolSettings.findUnique({ where: { id: "main" } });
  const schoolName = settings?.name || "School Management System";

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Branded panel */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-sidebar px-12 py-12 text-sidebar-foreground lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sidebar-primary/25 via-transparent to-transparent" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="pointer-events-none absolute -top-32 -right-16 h-96 w-96 rounded-full bg-sidebar-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/30 ring-1 ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/image/logo.jpeg" alt="School Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-sm font-semibold">{schoolName}</p>
            <p className="text-xs text-sidebar-foreground/50">Management System</p>
          </div>
        </div>

        <div className="relative">
          <h2 className="max-w-sm text-3xl leading-tight font-bold text-white">
            Run your entire school from one dashboard.
          </h2>
          <p className="mt-3 max-w-sm text-sm text-sidebar-foreground/60">
            Admissions, fees, payroll, transport &amp; stationary — built for how
            Indian schools actually work.
          </p>

          <div className="mt-8 space-y-3.5">
            {HIGHLIGHTS.map((h) => (
              <div key={h.text} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <h.icon className="h-4 w-4 text-sidebar-primary" />
                </div>
                <p className="text-sm text-sidebar-foreground/75">{h.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-sidebar-foreground/40">
          <ShieldCheck className="h-3.5 w-3.5" />
          Authorized staff access only
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl lg:hidden" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl lg:hidden" />

        <div className="relative w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-900/10 ring-1 ring-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/image/logo.jpeg" alt="School Logo" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">{schoolName}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Sign in to manage admissions, fees &amp; staff payroll
            </p>
          </div>

          <div className="mb-6 hidden lg:block">
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="mt-1.5 text-sm text-slate-500">Sign in to continue to your dashboard</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-7 shadow-xl shadow-slate-900/5 backdrop-blur">
            <LoginForm />
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Authorized staff only &middot; {schoolName}
          </p>
        </div>
      </div>
    </div>
  );
}
