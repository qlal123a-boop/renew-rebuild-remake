import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartHandshake, Target, Eye, Mail, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "من نحن — المنارة التعليمية" },
      { name: "description", content: "المنارة التعليمية منصة فلسطينية هادفة تقدّم تعليمًا مجانيًا ومستدامًا لكل طالب فلسطيني: رسالتنا، رؤيتنا، وطرق التواصل." },
      { property: "og:title", content: "من نحن — المنارة التعليمية" },
      { property: "og:description", content: "منصة تعليمية فلسطينية مجانية ومستدامة — رسالتنا ورؤيتنا وطرق التواصل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function AboutPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="ghibli-sky absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute left-[10%] top-10 h-28 w-28 rounded-full bg-gold/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute right-[12%] top-40 h-24 w-24 rounded-3xl bg-sky-400/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <section className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        <div className="text-center">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-royal-deep">
            <HeartHandshake className="h-3.5 w-3.5" /> من نحن
          </span>
          <h1 className="reveal-up mt-5 text-3xl font-black text-royal-deep sm:text-5xl">
            <span className="bg-gradient-to-l from-amber-600 via-amber-500 to-yellow-600 bg-clip-text text-transparent">المنارة التعليمية</span>
          </h1>
          <div className="gold-divider mx-auto mt-5 w-24" />
        </div>

        <div className="reveal-up glass-card mt-10 rounded-3xl border border-white/25 p-7 sm:p-10">
          <p className="text-center text-base leading-loose text-royal-deep/90 sm:text-lg">
            منصة تعليمية فلسطينية هادفة تسعى لمساعدة الطلاب بشكل مجاني ومستدام. نؤمن بأن العلم حق للجميع
            وأن التكنولوجيا وسيلة لإيصال المعرفة لكل بيت فلسطيني.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="reveal-up glass-card rounded-3xl border border-white/25 p-7" style={{ animationDelay: "80ms" }}>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-luxury">
              <Target className="h-7 w-7 text-white" />
            </div>
            <h2 className="mt-5 text-xl font-extrabold text-royal-deep">رسالتنا</h2>
            <p className="mt-2 text-sm leading-loose text-royal-deep/80">
              توفير محتوى تعليمي فلسطيني موثوق ومجاني بالكامل — دروس مرئية، ملخّصات، أوراق عمل، ومكتبة
              إلكترونية — مدعومًا بأدوات ذكاء اصطناعي مضبوطة على المنهاج الرسمي، بحيث يجد كل طالب ما يحتاجه
              في مكان واحد ومن دون أي تكلفة.
            </p>
          </div>

          <div className="reveal-up glass-card rounded-3xl border border-white/25 p-7" style={{ animationDelay: "160ms" }}>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-luxury">
              <Eye className="h-7 w-7 text-white" />
            </div>
            <h2 className="mt-5 text-xl font-extrabold text-royal-deep">رؤيتنا</h2>
            <p className="mt-2 text-sm leading-loose text-royal-deep/80">
              أن تكون المنارة المرجع الرقمي الأول للطالب الفلسطيني في كل الصفوف، ومنصّة يشارك فيها المعلّمون
              والمتطوّعون في بناء محتوى يرتقي بجودة التعليم ويصل إلى كل بيت مهما كانت الظروف.
            </p>
          </div>
        </div>

        <div className="reveal-up glass-card mt-8 rounded-3xl border border-white/25 p-7" style={{ animationDelay: "240ms" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-xl font-extrabold text-royal-deep">
                <Mail className="h-5 w-5 text-gold" /> تواصل معنا
              </h2>
              <p className="mt-2 text-sm leading-loose text-royal-deep/80">
                لديك اقتراح، ملاحظة، أو ترغب بالانضمام كمشرف ومساهم في المحتوى؟ يسعدنا سماعك.
              </p>
            </div>
            <Link
              to="/moderator-request"
              className="shimmer-btn inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-3 text-sm font-extrabold shadow-gold transition-smooth hover:scale-105"
              style={{ color: "var(--royal-deep)" }}
            >
              انضم إلى الفريق <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
