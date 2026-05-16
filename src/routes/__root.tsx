import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { ChatbotWidget } from "@/components/chatbot-widget";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <p className="ornament-row w-64 mb-6">404</p>
      <h1 className="font-display text-5xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-4 max-w-md text-muted-foreground italic">
        The page you’re looking for doesn’t exist or may have moved.
      </p>
      <Link
        to="/"
        className="mt-8 bg-primary px-7 py-3 font-display text-[0.7rem] tracking-[0.16em] text-primary-foreground uppercase transition-transform hover:-translate-y-0.5"
      >
        Back to home
      </Link>
    </div>
  );
}

const SITE_TITLE = "Homeschooled — Find vetted homeschool tutors in Kenya";
const SITE_DESCRIPTION =
  "Homeschooled helps parents find safe, qualified homeschool tutors. Every teacher is ID-checked and police-cleared before joining.";
const SITE_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3bf2ee7f-a31a-439a-b7ce-aa13a684e05b/id-preview-cf49ebc8--8189d4c5-bd2c-4bc6-b0b1-8411957df5ed.lovable.app-1776500883975.png";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { property: "og:site_name", content: "Homeschooled" },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:image", content: SITE_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE_TITLE },
      { name: "twitter:description", content: SITE_DESCRIPTION },
      { name: "twitter:image", content: SITE_IMAGE },
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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Homeschooled",
          url: "https://homeschooled.lovable.app",
          description: SITE_DESCRIPTION,
          areaServed: "KE",
        }),
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
      <ChatbotWidget />
    </AuthProvider>
  );
}
