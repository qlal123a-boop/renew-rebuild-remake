import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StudyBar } from "@/components/study-bar";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { Toaster } from "@/components/ui/sonner";
import { useVisitorPing } from "@/lib/site-settings";
import { I18nProvider } from "@/lib/i18n";

// Defer chatbot bundle until after first paint — non-critical for LCP.
const ChatbotWidget = lazy(() =>
  import("@/components/chatbot-widget").then((m) => ({ default: m.ChatbotWidget })),
);

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-extrabold text-gold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">يبدو أن الرابط الذي بحثت عنه لا يقود إلى أي درس.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-smooth hover:opacity-90">
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">تعذّر تحميل هذه الصفحة</h1>
        <p className="mt-2 text-sm text-muted-foreground">حدث خطأ غير متوقع. حاول مجددًا.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-smooth hover:opacity-90"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "المنارة التعليمية — بوابة تعليمية فاخرة" },
      { name: "description", content: "بوابة تعليمية فلسطينية فاخرة: الصفوف، أوراق العمل، مساعد ذكي، وقنوات تعليمية رسمية." },
      { property: "og:title", content: "المنارة التعليمية — بوابة تعليمية فاخرة" },
      { property: "og:description", content: "بوابة تعليمية فلسطينية فاخرة: الصفوف، أوراق العمل، مساعد ذكي، وقنوات تعليمية رسمية." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "المنارة التعليمية — بوابة تعليمية فاخرة" },
      { name: "twitter:description", content: "بوابة تعليمية فلسطينية فاخرة: الصفوف، أوراق العمل، مساعد ذكي، وقنوات تعليمية رسمية." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/LSb6nelt0PQtfzQuuZcLzIIyvgT2/social-images/social-1778275377619-1000021282.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/LSb6nelt0PQtfzQuuZcLzIIyvgT2/social-images/social-1778275377619-1000021282.webp" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800&family=Almarai:wght@400;700;800&family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useVisitorPing();
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <div className="pb-safe-nav flex min-h-screen flex-col">
          <SiteHeader />
          <StudyBar />
          <main className="flex-1">
            <Outlet />
          </main>
          <SiteFooter />
        </div>
        <MobileTabBar />
        <Suspense fallback={null}><ChatbotWidget /></Suspense>
        <Toaster richColors position="top-center" />
      </I18nProvider>
    </QueryClientProvider>
  );
}
