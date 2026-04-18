import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export function SiteNav() {
  const { user, role, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.navigate({ to: "/" });
  };

  return (
    <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background/85 px-6 backdrop-blur md:px-10">
      <Link to="/" className="flex items-center gap-2">
        <span className="text-laurel">❦</span>
        <span className="font-display text-base font-bold tracking-[0.18em] uppercase">
          EduBridge
        </span>
      </Link>

      <ul className="hidden items-center gap-10 md:flex">
        <NavItem to="/agora">Agora</NavItem>
        <NavItem to="/how-it-works">How it Works</NavItem>
        {user && <NavItem to="/messages">Messages</NavItem>}
        {user && <NavItem to="/dashboard">Dashboard</NavItem>}
        {role === "admin" && <NavItem to="/admin">Admin</NavItem>}
      </ul>

      <div className="flex items-center gap-3">
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
              className="hidden font-display text-[0.65rem] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:text-foreground sm:inline"
            >
              Sign in
            </Link>
            <Link
              to="/sign-up"
              className="bg-primary px-5 py-2 font-display text-[0.62rem] tracking-[0.16em] text-primary-foreground uppercase shadow-[0_4px_18px_rgba(196,90,67,0.25)] transition-transform hover:-translate-y-0.5"
            >
              Begin
            </Link>
          </>
        )}
      </div>
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
