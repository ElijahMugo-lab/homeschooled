import { useEffect, type ReactNode } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, FileBarChart, Settings, ShieldCheck, LogOut, ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/teachers", label: "Teachers", icon: Users },
  { to: "/admin/reports", label: "Reports", icon: FileBarChart, soon: true },
  { to: "/admin/settings", label: "Settings", icon: Settings, soon: true },
] as const;

export function AdminShell({ children, title, eyebrow, actions }: {
  children: ReactNode;
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  const { user, role, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.navigate({ to: "/sign-in" });
      return;
    }
    if (role !== "admin") {
      toast.error("Admin access required");
      router.navigate({ to: "/dashboard" });
    }
  }, [user, role, loading, router]);

  if (loading || role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-alabaster">
        <p className="font-display text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Verifying credentials…
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-alabaster">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-parchment/50 lg:flex lg:flex-col">
        <div className="border-b border-border px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-laurel">❦</span>
            <span className="font-display text-sm font-bold tracking-[0.18em] uppercase">
              EduBridge
            </span>
          </Link>
          <p className="mt-2 ornament-row text-[0.55rem]" style={{ width: "100%" }}>
            Admin Council
          </p>
        </div>
        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`group flex items-center gap-3 px-3 py-2.5 font-display text-[0.7rem] tracking-[0.14em] uppercase transition-colors ${
                      active
                        ? "border-l-2 border-terracotta bg-card text-foreground"
                        : "border-l-2 border-transparent text-muted-foreground hover:border-gold/60 hover:bg-card/60 hover:text-foreground"
                    }`}
                  >
                    <Icon size={14} className={active ? "text-terracotta" : "text-muted-foreground group-hover:text-foreground"} />
                    <span className="flex-1">{item.label}</span>
                    {item.soon && (
                      <span className="font-display text-[0.5rem] tracking-[0.14em] text-muted-foreground/70 uppercase">
                        Soon
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-border px-6 py-4">
          <div className="mb-3 flex items-center gap-2 text-xs italic text-muted-foreground">
            <ShieldCheck size={12} className="text-laurel" />
            <span>Signed in as admin</span>
          </div>
          <p className="truncate text-sm">{user?.email}</p>
          <button
            onClick={async () => {
              await signOut();
              router.navigate({ to: "/" });
            }}
            className="mt-3 flex items-center gap-2 font-display text-[0.62rem] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:text-terracotta"
          >
            <LogOut size={12} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-border bg-parchment/50 px-4 py-3 lg:hidden">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-laurel">❦</span>
            <span className="font-display text-xs font-bold tracking-[0.16em] uppercase">
              EduBridge · Admin
            </span>
          </Link>
          <Link
            to="/admin/dashboard"
            className="font-display text-[0.6rem] tracking-[0.16em] text-muted-foreground uppercase"
          >
            Menu
          </Link>
        </div>

        {/* Mobile nav strip */}
        <div className="flex gap-1 overflow-x-auto border-b border-border bg-parchment/30 px-4 py-2 lg:hidden">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`shrink-0 px-3 py-1.5 font-display text-[0.58rem] tracking-[0.14em] uppercase ${
                  active ? "border border-terracotta text-terracotta" : "border border-border text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Page header */}
        <header className="border-b border-border bg-card px-6 py-6 md:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              {eyebrow && (
                <p className="mb-3 font-display text-[0.55rem] tracking-[0.32em] text-gold uppercase">
                  {eyebrow}
                </p>
              )}
              <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
        </header>

        {/* Content */}
        <div className="min-w-0 flex-1 p-6 md:p-10">{children}</div>
      </div>
    </div>
  );
}

export function BackLink({ to, label = "Back" }: { to: string; label?: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 font-display text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:text-terracotta"
    >
      <ArrowLeft size={12} />
      {label}
    </Link>
  );
}
