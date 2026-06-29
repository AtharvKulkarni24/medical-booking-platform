import { Link, useRouterState } from "@tanstack/react-router";
import {
  Stethoscope,
  Home,
  Search,
  CalendarCheck,
  User,
  LayoutDashboard,
  FlaskConical,
  Clock,
  Users,
  Star,
} from "lucide-react";
import { useMemo } from "react";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const patientNav: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/patient/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/patient/profile", label: "Profile", icon: User },
];

const labNav: NavItem[] = [
  { to: "/lab/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/lab/tests/add", label: "Tests", icon: FlaskConical },
  { to: "/lab/timeslots/manage", label: "Slots", icon: Clock },
  { to: "/lab/patients", label: "Patients", icon: Users },
  { to: "/lab/reviews", label: "Reviews", icon: Star },
  { to: "/lab/profile", label: "Profile", icon: User },
];

export function Navbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLabRoute = pathname.startsWith("/lab/") && pathname !== "/lab/";
  const items = useMemo(() => (isLabRoute ? labNav : patientNav), [isLabRoute]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Stethoscope className="h-5 w-5" />
          </span>
          <span className="text-base font-semibold tracking-tight text-foreground">
            LabBook<span className="text-primary">.</span>
          </span>
          {isLabRoute && (
            <span className="ml-2 hidden rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground sm:inline">
              Lab Portal
            </span>
          )}
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "bg-accent text-accent-foreground" }}
                inactiveProps={{ className: "text-muted-foreground hover:text-foreground hover:bg-muted" }}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Get started
          </Link>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border bg-surface px-3 py-2 md:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
