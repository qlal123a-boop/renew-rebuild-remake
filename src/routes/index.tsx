import { createFileRoute, Link } from "@tanstack/react-router";
import {
  GraduationCap, FileText, Bot, ArrowLeft, Sparkles, CheckSquare, CalendarDays, Calculator,
  BookOpen, Library, PenSquare, Timer, Wand2, ShoppingBag, Gamepad2, ChevronDown, MessagesSquare,
} from "lucide-react";
import { PremiumVersesBar } from "@/components/premium-verses-bar";
import { DailyDateBar } from "@/components/daily-date-bar";
import { DailyMotivation } from "@/components/daily-motivation";
import { useI18n } from "@/lib/i18n";


export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "المنارة التعليمية — بوابتك الذهبية إلى المنهاج الفلسطيني" },
      { name: "description", content: "منصة فلسطينية مجانية: مساعد ذكي، ملخصات، أوراق عمل، دروس مرئية، ألعاب ذهنية ومكتبة إلكترونية للمنهاج الفلسطيني." },
      { property: "og:title", content: "المنارة التعليمية — بوابتك الذهبية إلى المنهاج الفلسطيني" },
      { property: "og:description", content: "منصة فلسطينية مجانية: مساعد ذكي، ملخصات، أوراق عمل، دروس مرئية، ألعاب ذهنية ومكتبة إلكترونية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

/** Smart AI tools — first-class section. */
const AI_TOOLS = [
  { to: "/tutor" as const, title: "روبوت المنارة", desc: "إجابات فورية عن أي سؤال في المنهاج", icon: Bot, ring: "from-sky-500 to-cyan-600" },
  { to: "/courses" as const, title: "المعلّم الذكي", desc: "دروس مرئية مرتّبة مع شهادة إتمام", icon: GraduationCap, ring: "from-violet-500 to-indigo-600" },
  { to: "/quiz-generator" as const, title: "مولّد الأسئلة", desc: "اختبارات تدريبية فورية لأي درس", icon: Wand2, ring: "from-emerald-500 to-teal-600" },
  { to: "/worksheets" as const, title: "مولّد ورقة العمل", desc: "ورقة عمل قابلة للطباعة + مفتاح الحل", icon: FileText, ring: "from-amber-500 to-orange-600" },
  { to: "/summaries" as const, title: "مولّد الملخّص", desc: "ملخّص منظّم بنقاط رئيسية وأمثلة", icon: BookOpen, ring: "from-rose-500 to-pink-600" },
];

const PORTALS = [
  { to: "/library" as const, title: "المكتبة الإلكترونية", icon: Library },
  { to: "/grades" as const, title: "الصفوف المدرسية", icon: GraduationCap },
  { to: "/quiz-generator" as const, title: "مولّد الاختبارات", icon: Wand2 },
  { to: "/smart-board" as const, title: "اللوح الذكي", icon: PenSquare },
  { to: "/games" as const, title: "الألعاب الذهنية", icon: Gamepad2 },
  { to: "/pomodoro" as const, title: "جلسة التركيز", icon: Timer },
  { to: "/tasks" as const, title: "قسم المهام", icon: CheckSquare },
  { to: "/store" as const, title: "متجر كنز المنارة", icon: ShoppingBag },
  { to: "/gpa" as const, title: "حساب المعدل", icon: Calculator },
  { to: "/schedule" as const, title: "الجدول المدرسي", icon: CalendarDays },
];

function HomePage() {
  const { dir } = useI18n();
  const rtlArrow = dir === "ltr" ? "rotate-180" : "";

  return (
    <div>
      {/* ============ HERO ============ */}
      <section className="relative flex items-center overflow-hidden">
        <div className="ghibli-sky absolute inset-0" />
        <div className="ghibli-grain absolute inset-0" />
        {/* floating geometric shapes */}
        <div className="pointer-events-none absolute left-[6%] top-16 h-28 w-28 rotate-12 rounded-3xl bg-gold/20 blur-2xl animate-float" />
        <div className="pointer-events-none absolute right-[8%] top-28 h-24 w-24 rounded-full bg-sky-400/25 blur-2xl animate-float" style={{ animationDelay: "1.4s" }} />
        <div className="pointer-events-none absolute bottom-24 left-[30%] h-20 w-20 rotate-45 rounded-2xl bg-emerald-400/20 blur-2xl animate-float" style={{ animationDelay: "2.6s" }} />
        <div className="pointer-events-none absolute bottom-10 right-[24%] h-32 w-32 rounded-full bg-amber-300/25 blur-3xl animate-float" style={{ animationDelay: "3.4s" }} />

        <div className="page-shell relative w-full max-w-4xl py-14 text-center md:py-20">
          <span className="glass reveal-up inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-royal-deep">
            <Sparkles className="h-3.5 w-3.5" /> منصة تعليمية فلسطينية مجانية
          </span>
          <h1
            className="reveal-up mt-5 text-[2.1rem] font-black leading-[1.2] text-royal-deep sm:text-5xl md:text-6xl"
            style={{ animationDelay: "80ms", textShadow: "0 6px 24px rgba(0,0,0,0.12)" }}
          >
            <span className="bg-gradient-to-l from-amber-600 via-amber-500 to-yellow-600 bg-clip-text text-transparent">
              المنارة التعليمية
            </span>
          </h1>
          <p className="reveal-up mx-auto mt-4 max-w-xl text-sm leading-relaxed text-royal-deep/85 sm:text-base" style={{ animationDelay: "160ms" }}>
            بوابتك الذهبية إلى المنهاج الفلسطيني — تعلّم بأسلوب يجمع الجمال والعلم
          </p>
          <div className="reveal-up mt-7 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "240ms" }}>
            <Link to="/grades" className="shimmer-btn rounded-2xl bg-gradient-gold px-6 py-3 text-sm font-extrabold shadow-gold transition-smooth hover:scale-[1.03]" style={{ color: "var(--royal-deep)" }}>
              ابدأ رحلتك
            </Link>
            <Link to="/library" className="glass rounded-2xl border border-white/40 px-6 py-3 text-sm font-extrabold text-royal-deep transition-smooth hover:scale-[1.03]">
              تصفح المكتبة
            </Link>
          </div>

          <div className="mt-10 hidden justify-center md:flex">
            <ChevronDown className="h-6 w-6 animate-bounce text-royal-deep/50" aria-hidden />
          </div>
        </div>
      </section>

      {/* ============ DATE + MOTIVATION + QURAN ============ */}
      <section className="page-shell relative -mt-8 space-y-4">
        <div className="reveal-up">
          <DailyDateBar />
        </div>
        <div className="reveal-up" style={{ animationDelay: "80ms" }}>
          <DailyMotivation />
        </div>
        <div className="reveal-up" style={{ animationDelay: "160ms" }}>
          <PremiumVersesBar />
        </div>
      </section>

      {/* ============ SMART ASSISTANT ============ */}
      <section className="page-shell section-y">
        <div className="surface-card relative overflow-hidden bg-gradient-royal p-6 text-primary-foreground sm:p-8">
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="icon-tile h-14 w-14 shrink-0 bg-gradient-gold" style={{ color: "var(--royal-deep)" }}>
              <Bot className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-extrabold text-gold sm:text-2xl">المساعد الذكي — روبوت المنارة</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-primary-foreground/85">
                اسأل عن أي درس في المنهاج الفلسطيني واحصل على شرح فوري، أو ولّد ملخّصًا أو ورقة عمل جاهزة للطباعة خلال ثوانٍ.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link to="/tutor" className="rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-extrabold shadow-gold" style={{ color: "var(--royal-deep)" }}>
                ابدأ المحادثة
              </Link>
              <Link to="/summaries" className="rounded-xl border border-gold/50 px-5 py-2.5 text-sm font-extrabold text-gold">
                ملخّص ذكي
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* ============ SMART AI TOOLS ============ */}
      <section className="page-shell section-y">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="section-title">أدوات التعليم الذكي</h2>
            <p className="card-desc mt-1">ذكاء اصطناعي مضبوط على المنهاج الفلسطيني — مجاني وبلا حدود</p>
          </div>
          <Link to="/tutor" className="meta-text hidden shrink-0 items-center gap-1 font-bold text-royal-deep hover:text-gold sm:inline-flex">
            المساعد الذكي <ArrowLeft className={`h-3.5 w-3.5 ${rtlArrow}`} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AI_TOOLS.map((tool, i) => (
            <Link
              key={tool.title}
              to={tool.to}
              style={{ animationDelay: `${i * 60}ms` }}
              className="group reveal-up surface-card surface-interactive flex items-start gap-4 p-4 sm:p-5"
            >
              <div className={`icon-tile bg-gradient-to-br ${tool.ring}`}>
                <tool.icon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="card-title">{tool.title}</h3>
                <p className="card-desc mt-1 line-clamp-2">{tool.desc}</p>
              </div>
              <ArrowLeft className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5 ${rtlArrow}`} />
            </Link>
          ))}
        </div>
      </section>

      {/* ============ STUDY MATERIALS ============ */}
      <section className="page-shell">
        <Link
          to="/summaries"
          className="group reveal-up surface-card surface-interactive relative flex flex-col gap-4 overflow-hidden p-5 sm:flex-row sm:items-center sm:p-7"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-100/70 via-transparent to-rose-100/50" />
          <div className="icon-tile relative h-14 w-14 bg-gradient-to-br from-amber-500 to-orange-600">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <div className="relative min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="section-title">ملخّصات الدراسة</h3>
              <span className="pill bg-gold/25 text-royal-deep">PDF</span>
            </div>
            <p className="card-desc mt-1.5">
              ملخّصات جاهزة للطباعة لكل صف ومادة، مع مولّد ملخّصات ذكي يبني لك ملخّصًا من اسم الدرس أو صورة صفحة الكتاب.
            </p>
          </div>
          <span className="relative inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-extrabold shadow-gold" style={{ color: "var(--royal-deep)" }}>
            ادخل <ArrowLeft className={`h-4 w-4 ${rtlArrow}`} />
          </span>
        </Link>
      </section>

      {/* ============ PORTALS ============ */}
      <section className="page-shell section-y">
        <div className="mb-6">
          <h2 className="section-title">البوابات وأدوات إضافية</h2>
          <p className="card-desc mt-1">كل أقسام المنصة في مكان واحد</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {PORTALS.map((p, i) => (
            <Link
              key={p.to + p.title}
              to={p.to}
              style={{ animationDelay: `${i * 40}ms` }}
              className="group reveal-up surface-card surface-interactive flex h-full min-h-[7.5rem] flex-col items-center justify-center gap-2.5 p-4 text-center"
            >
              <div className="icon-tile bg-gradient-royal text-gold">
                <p.icon className="h-5 w-5" />
              </div>
              <span className="card-title text-royal-deep">{p.title}</span>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link to="/about" className="inline-flex items-center gap-2 rounded-xl border border-gold/40 px-5 py-2.5 text-sm font-bold text-royal-deep transition-smooth hover:bg-gold/10">
            <MessagesSquare className="h-4 w-4" /> من نحن
          </Link>
        </div>
      </section>
    </div>
  );
}
