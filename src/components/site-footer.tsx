export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-parchment/60 px-6 py-12 md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center">
        <div className="ornament-row w-full max-w-md">EduBridge</div>
        <p className="max-w-md font-body text-sm italic text-muted-foreground">
          “The roots of education are bitter, but the fruit is sweet.” <br />
          <span className="font-display text-[0.65rem] tracking-[0.18em] not-italic text-gold uppercase">
            — Aristotle
          </span>
        </p>
        <div className="h-[2px] w-32 greek-key opacity-60" />
        <p className="font-display text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
          © {new Date().getFullYear()} EduBridge · Nairobi
        </p>
      </div>
    </footer>
  );
}
