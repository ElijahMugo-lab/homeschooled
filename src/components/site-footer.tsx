import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-parchment/60 px-6 py-12 md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center">
        <div className="ornament-row w-full max-w-md">Homeschooled</div>
        <p className="max-w-md font-body text-sm text-muted-foreground">
          Helping homeschooling families in Kenya find safe, qualified tutors.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-6 font-display text-[0.62rem] tracking-[0.18em] text-muted-foreground uppercase">
          <Link to="/agora" className="hover:text-foreground">Find a Tutor</Link>
          <Link to="/how-it-works" className="hover:text-foreground">How it Works</Link>
          <Link to="/sign-up" className="hover:text-foreground">Sign up</Link>
          <Link to="/sign-in" className="hover:text-foreground">Sign in</Link>
        </nav>
        <div className="h-[2px] w-32 greek-key opacity-60" />
        <p className="font-display text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
          © {new Date().getFullYear()} Homeschooled · Nairobi
        </p>
      </div>
    </footer>
  );
}
