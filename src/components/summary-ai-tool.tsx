import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateSummary, type GeneratedSummary } from "@/lib/summary-ai.functions";
import { GRADES, subjectsForGrade } from "@/lib/curriculum";
import { ImagePlus, Loader2, Printer, Sparkles, X, Download } from "lucide-react";
import { toast } from "sonner";
import { EduVisuals } from "@/components/edu-visual";
import { downloadNodeAsPdf, printNode } from "@/lib/doc-export";
import { generateEduImage } from "@/lib/edu-image.functions";
import { EduLessonImage } from "@/components/edu-lesson-image";

/** AI summary generator — lives inside the Summaries section. */
export function SummaryAiTool() {
  const run = useServerFn(generateSummary);
  const runImage = useServerFn(generateEduImage);
  const fileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLElement>(null);

  const [gradeId, setGradeId] = useState(9);
  const [subject, setSubject] = useState("");
  const [lesson, setLesson] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sum, setSum] = useState<GeneratedSummary | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "print" | null>(null);
  const [eduImg, setEduImg] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);

  /** DOWNLOAD ONLY — never opens the print dialog. */
  const handleDownload = async () => {
    if (!docRef.current || exporting) return;
    setExporting("pdf");
    try {
      await downloadNodeAsPdf(docRef.current, `ملخص-${sum?.title ?? subject}`);
      toast.success("تم تحميل ملف PDF");
    } catch { toast.error("تعذّر إنشاء ملف PDF، حاول مرة أخرى"); }
    finally { setExporting(null); }
  };

  /** PRINT ONLY — never downloads a file. */
  const handlePrint = async () => {
    if (!docRef.current || exporting) return;
    setExporting("print");
    try { await printNode(docRef.current, sum?.title ?? "ملخص"); }
    catch { toast.error("تعذّرت الطباعة، حاول مرة أخرى"); }
    finally { setExporting(null); }
  };

  const subjects = useMemo(() => subjectsForGrade(gradeId), [gradeId]);

  const pickImage = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 6_000_000) { toast.error("حجم الصورة كبير جدًا (الحد 6 ميجابايت)"); return; }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(f);
  };

  const submit = async () => {
    if (!subject) { toast.error("اختر المادة أولًا"); return; }
    if (!lesson.trim() && !image) { toast.error("اكتب اسم الدرس أو ارفع صورة من الكتاب"); return; }
    setLoading(true); setSum(null); setEduImg(null);
    try {
      const res = await run({ data: { gradeId, subject, lesson: lesson.trim() || undefined, imageDataUrl: image ?? undefined } });
      if (res.summary) {
        setSum(res.summary);
        const topic = res.summary.title || lesson.trim();
        if (topic) {
          setImgLoading(true);
          runImage({ data: { topic, subject, gradeId } })
            .then((r) => setEduImg(r.imageDataUrl))
            .catch(() => setEduImg(null))
            .finally(() => setImgLoading(false));
        }
      }
      else toast.error(res.error || "تعذّر التوليد");
    } catch {
      toast.error("تعذّر الاتصال بالخدمة، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <section className="rounded-3xl border border-gold/30 bg-gradient-royal p-5 text-primary-foreground shadow-luxury print:hidden md:p-6">
        <p className="mb-4 text-xs text-primary-foreground/80">
          اكتب اسم الدرس أو ارفع صورة من صفحة الكتاب — واحصل على ملخّص منظّم: نقاط رئيسية، مصطلحات، أمثلة، وإرشادات للامتحان.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-gold">الصف</label>
            <select
              value={gradeId}
              onChange={(e) => { setGradeId(Number(e.target.value)); setSubject(""); }}
              className="w-full rounded-xl border border-gold/30 bg-white/10 px-4 py-3 text-sm font-bold backdrop-blur outline-none focus:border-gold"
            >
              {GRADES.map((g) => <option key={g.id} value={g.id} className="text-foreground">{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-gold">المادة</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-gold/30 bg-white/10 px-4 py-3 text-sm font-bold backdrop-blur outline-none focus:border-gold"
            >
              <option value="" className="text-foreground">— اختر المادة —</option>
              {subjects.map((s) => <option key={s} value={s} className="text-foreground">{s}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-gold">اسم الدرس</label>
            <input
              value={lesson}
              onChange={(e) => setLesson(e.target.value)}
              placeholder="مثال: الجهاز الدوري"
              className="w-full rounded-xl border border-gold/30 bg-white/10 px-4 py-3 text-sm font-bold placeholder:text-primary-foreground/50 backdrop-blur outline-none focus:border-gold"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickImage(e.target.files?.[0])} />
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-gold/40 bg-white/10 px-4 py-2.5 text-xs font-bold backdrop-blur hover:bg-white/20"
          >
            <ImagePlus className="h-4 w-4" /> {image ? "تغيير صورة صفحة الكتاب" : "رفع صورة من الكتاب"}
          </button>
          {image && (
            <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs">
              <img src={image} alt="صفحة الكتاب" className="h-10 w-10 rounded object-cover" />
              تم إرفاق الصورة
              <button onClick={() => setImage(null)} aria-label="إزالة الصورة"><X className="h-3.5 w-3.5" /></button>
            </span>
          )}
          <button
            onClick={submit}
            disabled={loading}
            className="ms-auto inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-6 py-3 text-sm font-extrabold shadow-gold transition-smooth hover:scale-[1.02] disabled:opacity-60"
            style={{ color: "var(--royal-deep)" }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "جارٍ التلخيص…" : "توليد الملخّص"}
          </button>
        </div>
      </section>

      {sum && (
        <article ref={docRef} className="mt-6 rounded-3xl border border-gold/40 bg-card p-6 shadow-luxury md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <h2 className="text-2xl font-extrabold">{sum.title}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={handleDownload} disabled={!!exporting} className="inline-flex items-center gap-2 rounded-xl bg-gradient-royal px-4 py-2.5 text-xs font-bold text-gold disabled:opacity-60">
                {exporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} تحميل PDF
              </button>
              <button onClick={handlePrint} disabled={!!exporting} className="inline-flex items-center gap-2 rounded-xl border border-gold/50 px-4 py-2.5 text-xs font-bold disabled:opacity-60">
                {exporting === "print" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} طباعة
              </button>
            </div>
          </div>
          <div className="gold-divider mt-4 w-24" />

          {sum.overview && <p className="mt-4 leading-loose text-foreground/90">{sum.overview}</p>}

          <EduLessonImage src={eduImg} loading={imgLoading} title={sum.title} />

          {sum.keyPoints.length > 0 && (
            <section className="mt-6">
              <h3 className="text-sm font-extrabold text-gold">المفاهيم الأساسية</h3>
              <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm leading-relaxed">
                {sum.keyPoints.map((k, i) => <li key={i}>{k}</li>)}
              </ul>
            </section>
          )}

          {sum.explanation.length > 0 && (
            <section className="mt-6">
              <h3 className="text-sm font-extrabold text-gold">الشرح</h3>
              <div className="mt-2 space-y-2 text-sm leading-loose">
                {sum.explanation.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </section>
          )}

          {sum.notes.length > 0 && (
            <section className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-4">
              <h3 className="text-sm font-extrabold text-gold">ملاحظات مهمة</h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                {sum.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </section>
          )}

          <EduVisuals visuals={sum.visuals} />


          {sum.definitions.length > 0 && (
            <section className="mt-6">
              <h3 className="text-sm font-extrabold text-gold">المصطلحات</h3>
              <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                {sum.definitions.map((d, i) => (
                  <div key={i} className="rounded-xl bg-secondary p-3 text-sm">
                    <dt className="font-extrabold">{d.term}</dt>
                    <dd className="mt-0.5 text-muted-foreground">{d.meaning}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {sum.examples.length > 0 && (
            <section className="mt-6">
              <h3 className="text-sm font-extrabold text-gold">أمثلة محلولة</h3>
              <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm leading-relaxed">
                {sum.examples.map((e, i) => <li key={i}>{e}</li>)}
              </ol>
            </section>
          )}

          {sum.exam_tips.length > 0 && (
            <section className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-4">
              <h3 className="text-sm font-extrabold text-gold">إرشادات للامتحان</h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                {sum.exam_tips.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </section>
          )}

          {sum.questions.length > 0 && (
            <section className="mt-6">
              <h3 className="text-sm font-extrabold text-gold">أسئلة مراجعة</h3>
              <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm">
                {sum.questions.map((q, i) => <li key={i}>{q}</li>)}
              </ol>
            </section>
          )}
        </article>
      )}
    </div>
  );
}
