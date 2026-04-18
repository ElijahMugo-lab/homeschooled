import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <p className="ornament-row w-64 mb-6">404</p>
      <h1 className="font-display text-5xl font-bold tracking-tight">Lost in the Agora</h1>
      <p className="mt-4 max-w-md text-muted-foreground italic">
        The path you sought leads nowhere. Even Socrates wandered before finding the marketplace.
      </p>
      <Link
        to="/"
        className="mt-8 bg-primary px-7 py-3 font-display text-[0.7rem] tracking-[0.16em] text-primary-foreground uppercase transition-transform hover:-translate-y-0.5"
      >
        Return Home
      </Link>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "EduBridge — A vetted marketplace for homeschooling families" },
      {
        name: "description",
        content:
          "EduBridge connects homeschooling parents with vetted, credentialed educators. A quiet, classical marketplace built on trust.",
      },
      { property: "og:title", content: "EduBridge — Where homeschooling families meet vetted educators" },
      {
        property: "og:description",
        content:
          "A minimalist, high-trust marketplace for homeschooling. Search by subject, philosophy, and credentials.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster />
    </AuthProvider>
  );
}
