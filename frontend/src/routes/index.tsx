import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, MapPin, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LabBook — Find the best diagnostic centers near you" },
      { name: "description", content: "Search verified diagnostic labs near you, compare prices for MRI, CBC, X-Ray and more, and book instantly." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-accent/60 via-background to-background" />
      <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Trusted by 500+ diagnostic centers
        </span>
        <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Find the Best Diagnostic <br className="hidden sm:block" />
          Centers <span className="text-primary">Near You</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          Compare verified labs, transparent pricing, and instant slot booking — all in one place.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Sign in
          </Link>
        </div>

        <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, label: "Verified labs", value: "100% NABL-certified" },
            { icon: MapPin, label: "Nearby search", value: "Within 15 km" },
            { icon: Sparkles, label: "Best prices", value: "Up to 40% off" },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-surface p-4 text-left shadow-card"
            >
              <Icon className="h-5 w-5 text-primary" />
              <dt className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </dt>
              <dd className="text-sm font-semibold text-foreground">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-10 text-xs text-muted-foreground">
          Patient Home grid (tests like MRI Brain, CBC, X-Ray, Lipid Profile) ships in the next chunk.
        </p>
      </div>
    </section>
  );
}
