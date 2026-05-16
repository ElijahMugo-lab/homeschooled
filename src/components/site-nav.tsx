import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function SiteNav() {
  const { user, role, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.navigate({ to: "/" });
  };

  const close = () => setOpen(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-6 md:px-10">
        <Link to="/" className="flex items-center gap-2" onClick={close}>
          <span className="text-laurel">❦</span>
          <span className="font-display text-base font-bold tracking-[0.18em] uppercase">
            Homeschooled
          </span>
        </Link>

        <ul className="hidden items-center gap-10 md:flex">
          <NavItem to="/agora">Find a Tutor</NavItem>
          <NavItem to="/how-it-works">How it Works</NavItem>
          {user && <NavItem to="/messages">Messages</NavItem>}
          {user && <NavItem to="/dashboard">Dashboard</NavItem>}
          {role === "admin" && <NavItem to="/admin">Admin</NavItem>}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="hidden font-display text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase md:inline">
                {role ?? "member"}
              </span>
              <button
                onClick={handleSignOut}
                className="font-display text-[0.65rem] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:text-foreground"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/sign-in"
                className="font-display text-[0.65rem] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                to="/sign-up"
                className="bg-primary px-5 py-2 font-display text-[0.62rem] tracking-[0.16em] text-primary-foreground uppercase shadow-[0_4px_18px_rgba(196,90,67,0.25)] transition-transform hover:-translate-y-0.5"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center border border-border text-foreground md:hidden"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <ul className="flex flex-col px-6 py-4">
            <MobileItem to="/agora" onClick={close}>Find a Tutor</MobileItem>
            <MobileItem to="/how-it-works" onClick={close}>How it Works</MobileItem>
            {user && <MobileItem to="/messages" onClick={close}>Messages</MobileItem>}
            {user && <MobileItem to="/dashboard" onClick={close}>Dashboard</MobileItem>}
            {role === "admin" && <MobileItem to="/admin" onClick={close}>Admin</MobileItem>}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
            {user ? (
              <>
                <span className="font-display text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase">
                  {role ?? "member"}
                </span>
                <button
                  onClick={handleSignOut}
                  className="font-display text-[0.65rem] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:text-foreground"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/sign-in"
                  onClick={close}
                  className="font-display text-[0.65rem] tracking-[0.16em] text-muted-foreground uppercase"
                >
                  Sign in
                </Link>
                <Link
                  to="/sign-up"
                  onClick={close}
                  className="bg-primary px-5 py-2 font-display text-[0.62rem] tracking-[0.16em] text-primary-foreground uppercase"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        activeProps={{ className: "text-terracotta" }}
        inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
        className="font-display text-[0.68rem] tracking-[0.18em] uppercase transition-colors"
      >
        {children}
      </Link>
    </li>
  );
}

function MobileItem({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        onClick={onClick}
        activeProps={{ className: "text-terracotta" }}
        inactiveProps={{ className: "text-foreground" }}
        className="block py-3 font-display text-sm tracking-[0.18em] uppercase"
      >
        {children}
      </Link>
    </li>
  );
}
