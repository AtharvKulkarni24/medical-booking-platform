import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, Stethoscope } from "lucide-react";
import { RoleToggle } from "./register";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — LabBook" },
      { name: "description", content: "Sign in to your LabBook account as a patient or diagnostic center." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [role, setRole] = useState<"patient" | "lab">("patient");

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card">
            <Stethoscope className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to continue to LabBook.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <RoleToggle role={role} onChange={setRole} />

          <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full rounded-md border border-input bg-surface py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
            </label>

            <label className="block">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Password</span>
                <button type="button" className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-md border border-input bg-surface py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
            </label>

            <button
              type="submit"
              className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Sign in as {role === "patient" ? "Patient" : "Diagnostic Center"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            New to LabBook?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
