import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { useQuranicVerses } from "@/lib/site-settings";

/** Default 20 Quranic verses with full harakat — used when admin hasn't customized list. */
export const DEFAULT_VERSES: string[] = [
  "وَقُل رَّبِّ زِدْنِي عِلْمًا",
  "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ",
  "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
  "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا",
  "وَقُلِ اعْمَلُوا فَسَيَرَى اللَّهُ عَمَلَكُمْ وَرَسُولُهُ وَالْمُؤْمِنُونَ",
  "هَلْ يَسْتَوِي الَّذِينَ يَعْلَمُونَ وَالَّذِينَ لَا يَعْلَمُونَ",
  "يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ",
  "وَأَن لَّيْسَ لِلْإِنسَانِ إِلَّا مَا سَعَىٰ",
  "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",
  "وَبَشِّرِ الصَّابِرِينَ",
  "فَاذْكُرُونِي أَذْكُرْكُمْ",
  "إِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ",
  "وَتَوَكَّلْ عَلَى اللَّهِ وَكَفَىٰ بِاللَّهِ وَكِيلًا",
  "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ",
  "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي",
  "إِنَّ اللَّهَ يُحِبُّ الْمُتَوَكِّلِينَ",
  "وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ",
  "وَفَوْقَ كُلِّ ذِي عِلْمٍ عَلِيمٌ",
  "وَمَن جَاهَدَ فَإِنَّمَا يُجَاهِدُ لِنَفْسِهِ",
  "إِنَّمَا أَمْرُهُ إِذَا أَرَادَ شَيْئًا أَن يَقُولَ لَهُ كُن فَيَكُونُ",
];

/** Deduped, non-empty verse list (admin list wins, otherwise defaults). */
export function useVersesList() {
  const { items } = useQuranicVerses();
  const source = items.length ? items : DEFAULT_VERSES;
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of source) {
    const v = (raw || "").trim();
    if (!v) continue;
    const key = v.replace(/[\u064B-\u0652\s﴿﴾]/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(v);
  }
  return unique;
}

function useRotatingVerse(intervalMs: number) {
  const items = useVersesList();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), intervalMs);
    return () => clearInterval(t);
  }, [items.length, intervalMs]);

  return { items, idx: items.length ? idx % items.length : 0 };
}

/** Hero verse rotator (large calligraphic display) */
export function QuranicVerses() {
  const { items, idx } = useRotatingVerse(7000);
  if (!items.length) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 pt-6">
      <div
        className="relative overflow-hidden rounded-3xl border border-gold/40 p-6 text-primary-foreground shadow-luxury md:p-8"
        style={{ background: "linear-gradient(135deg, #0a3d2e 0%, #1a5d3f 50%, #0a3d2e 100%)" }}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold/15 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <BookOpen className="hidden h-10 w-10 shrink-0 text-gold/90 md:block" />
          <div className="min-h-[5rem] flex-1 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/5 px-3 py-1 text-[11px] font-bold text-gold">
              ﴿ آية اليوم ﴾
            </span>
            <p
              key={idx}
              className="font-quran mt-3 animate-fade-in font-bold leading-loose text-gold"
              style={{ fontSize: "clamp(1.4rem, 2.8vw, 2.2rem)" }}
            >
              ﴿ {items[idx]} ﴾
            </p>
            <p className="mt-2 text-xs text-gold/70">صدق الله العظيم</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Slim single-verse strip — one centered verse at a time, fading between verses.
 * (Replaces the old endlessly repeating marquee.)
 */
export function QuranicVersesMarquee() {
  const { items, idx } = useRotatingVerse(6000);
  if (!items.length) return null;

  return (
    <div
      className="border-y border-gold/30 px-4 py-2.5 text-gold"
      style={{ background: "linear-gradient(90deg, #0a3d2e, #1a5d3f, #0a3d2e)" }}
      aria-label="آيات قرآنية"
      aria-live="polite"
    >
      <p
        key={idx}
        className="animate-fade-in mx-auto max-w-4xl truncate text-center font-quran text-sm leading-relaxed md:text-lg"
        title={items[idx]}
      >
        ﴿ {items[idx]} ﴾
      </p>
    </div>
  );
}
