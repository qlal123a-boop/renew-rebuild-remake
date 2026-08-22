import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useChannels } from "@/lib/storage";
import { Youtube, ExternalLink, PlayCircle, Search } from "lucide-react";

export const Route = createFileRoute("/channels")({
  component: ChannelsPage,
  head: () => ({
    meta: [
      { title: "دليل القنوات التعليمية — المنارة" },
      { name: "description", content: "روافد، البوابة الفلسطينية، وقنوات يوتيوب الرسمية لكل مادة." },
    ],
  }),
});

const PROVIDER_BADGE: Record<string, string> = {
  "Rawafed": "روافد",
  "Palestine Educational Portal": "البوابة الفلسطينية",
  "YouTube": "يوتيوب",
  "Other": "أخرى",
};

function ChannelsPage() {
  const { items } = useChannels();
  const [q, setQ] = useState("");

  const grouped = useMemo(() => {
    const filtered = items.filter(
      (c) => !q || c.subject.includes(q) || c.name.includes(q)
    );
    const map = new Map<string, typeof items>();
    for (const c of filtered) {
      if (!map.has(c.subject)) map.set(c.subject, []);
      map.get(c.subject)!.push(c);
    }
    return Array.from(map.entries());
  }, [items, q]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold md:text-4xl">دليل القنوات التعليمية</h1>
        <p className="mt-2 text-sm text-muted-foreground">قنوات روافد والبوابة التعليمية الفلسطينية لكل مادة</p>
        <div className="gold-divider mx-auto mt-6 w-32" />
      </header>

      <section className="mb-10 grid gap-4 md:grid-cols-2">
        <a href="https://www.youtube.com/@RawafedPS" target="_blank" rel="noreferrer" className="group flex items-center gap-4 rounded-3xl border border-gold/40 bg-gradient-royal p-5 text-primary-foreground shadow-luxury transition-smooth hover:-translate-y-1">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-red-600 shadow-card">
            <Youtube className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold text-gold">قناة رسمية · يوتيوب</div>
            <div className="text-lg font-extrabold">قناة روافد التعليمية</div>
            <div className="text-xs text-primary-foreground/70">المنهاج الفلسطيني الكامل بالفيديو</div>
          </div>
          <ExternalLink className="h-5 w-5 text-gold opacity-70 group-hover:opacity-100" />
        </a>
        <a href="https://elearn.moe.edu.ps/" target="_blank" rel="noreferrer" className="group flex items-center gap-4 rounded-3xl border border-gold/40 bg-gradient-royal p-5 text-primary-foreground shadow-luxury transition-smooth hover:-translate-y-1">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-gold shadow-gold">
            <PlayCircle className="h-7 w-7" style={{ color: "var(--royal-deep)" }} />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold text-gold">المصدر الرسمي · وزارة التربية</div>
            <div className="text-lg font-extrabold">بوابة فلسطين التعليمية</div>
            <div className="text-xs text-primary-foreground/70">منصة التعليم الإلكتروني الرسمية</div>
          </div>
          <ExternalLink className="h-5 w-5 text-gold opacity-70 group-hover:opacity-100" />
        </a>
      </section>

      <div className="relative mx-auto mb-8 max-w-md">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن مادة أو قناة..."
          className="w-full rounded-xl border border-border bg-card py-3 pr-10 pl-4 text-sm outline-none transition-smooth focus:border-gold"
        />
      </div>

      <div className="space-y-8">
        {grouped.map(([subject, list]) => (
          <section key={subject}>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold">
              <span className="h-6 w-1 rounded-full bg-gradient-gold" />
              {subject}
              <span className="text-xs font-semibold text-muted-foreground">({list.length})</span>
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <div key={c.id} className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-smooth hover:-translate-y-1 hover:border-gold/60 hover:shadow-luxury">
                  <div className="flex items-start justify-between">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-white shadow-card">
                      <Youtube className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[10px] font-bold" style={{ color: "var(--royal-deep)" }}>
                      {PROVIDER_BADGE[c.provider]}
                    </span>
                  </div>
                  <h3 className="mt-3 flex-1 font-extrabold leading-snug">{c.name}</h3>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-royal py-2.5 text-sm font-bold text-gold transition-smooth hover:bg-gradient-gold hover:text-royal-deep"
                  >
                    <PlayCircle className="h-4 w-4" /> شاهد الآن <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </section>
        ))}
        {grouped.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            لا توجد نتائج. جرّب بحثًا آخر.
          </div>
        )}
      </div>
    </div>
  );
}
