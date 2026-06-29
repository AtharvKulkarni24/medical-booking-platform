import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  Building2,
  Stethoscope,
  Locate,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your account — LabBook" },
      { name: "description", content: "Register as a patient or diagnostic center on LabBook." },
    ],
  }),
  component: RegisterPage,
});

type Role = "patient" | "lab";

function RegisterPage() {
  const [role, setRole] = useState<Role>("patient");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "locating" | "located">("idle");

  const detectLocation = () => {
    setGpsStatus("locating");
    setTimeout(() => setGpsStatus("located"), 900);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card">
            <Stethoscope className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Join LabBook to book or list diagnostic tests.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <RoleToggle role={role} onChange={setRole} />

          <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <Field icon={User} label="Full name" placeholder={role === "patient" ? "Aarav Sharma" : "Pune Central Diagnostics"} />
            <Field icon={Mail} type="email" label="Email" placeholder="you@example.com" />
            <Field icon={Lock} type="password" label="Password" placeholder="Create a strong password" />

            {role === "patient" ? (
              <Field icon={Phone} type="tel" label="Phone number" placeholder="+91 98765 43210" />
            ) : (
              <>
                <Field
                  icon={MapPin}
                  label="Physical address"
                  placeholder="123 MG Road, Pune, Maharashtra"
                  as="textarea"
                />
                <button
                  type="button"
                  onClick={detectLocation}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-primary/40 bg-accent px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-accent/80"
                >
                  {gpsStatus === "located" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Location detected (18.5204° N, 73.8567° E)
                    </>
                  ) : (
                    <>
                      <Locate className={`h-4 w-4 ${gpsStatus === "locating" ? "animate-pulse" : ""}`} />
                      {gpsStatus === "locating" ? "Detecting…" : "Detect my GPS location"}
                    </>
                  )}
                </button>
              </>
            )}

            <button
              type="submit"
              className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              {role === "patient" ? "Create patient account" : "Register diagnostic center"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function RoleToggle({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
      <button
        type="button"
        onClick={() => onChange("patient")}
        className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          role === "patient"
            ? "bg-surface text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <User className="h-4 w-4" />
        I am a Patient
      </button>
      <button
        type="button"
        onClick={() => onChange("lab")}
        className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          role === "lab"
            ? "bg-surface text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Building2 className="h-4 w-4" />
        I am a Diagnostic Center
      </button>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  type = "text",
  placeholder,
  as,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  type?: string;
  placeholder?: string;
  as?: "textarea";
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        {as === "textarea" ? (
          <textarea
            rows={2}
            placeholder={placeholder}
            className="w-full resize-none rounded-md border border-input bg-surface py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        ) : (
          <input
            type={type}
            placeholder={placeholder}
            className="w-full rounded-md border border-input bg-surface py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        )}
      </div>
    </label>
  );
}
