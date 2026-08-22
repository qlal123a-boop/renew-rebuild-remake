import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateWorksheet, type GeneratedWorksheet } from "@/lib/worksheet-ai.functions";
import { GRADES, subjectsForGrade } from "@/lib/curriculum";
import { ImagePlus, Loader2, Printer, Sparkles, X, Eye, EyeOff, Download } from "lucide-react";
import { toast } from "sonner";
import { EduVisuals } from "@/components/edu-visual";
import { downloadNodeAsPdf, printNode } from "@/lib/doc-export";
import { generateEduImage } from "@/lib/edu-image.functions";
import { EduLessonImage } from "@/components/edu-lesson-image";

const TYPE_LABEL: Record<string, string> = {
  mcq: "اختيار من متعدد",
  truefalse: "صواب / خطأ",
  fill: "أكمل الفراغ",
  short: "سؤال قصير",
  problem: "مسألة تطبيقية",
};

/** AI worksheet generator — lives inside the Worksheets section. */
export function WorksheetAiTool({ defaultGrade = 9, defaultSubject = "" }: { defaultGrade?: number; defaultSubject?: string }) {
  const run = useServerFn(generateWorksheet);
  const runImage = useServerFn(generateEduImage);
  const fileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLDivElement>(null);

  const [gradeId, setGradeId] = useState(defaultGrade);
  const [subject, setSubject] = useState(defaultSubject);
  const [lesson, setLesson] = useState("");
  const [count, setCount] = useState(10);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sheet, setSheet] = useState<GeneratedWorksheet | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "print" | null>(null);
  const [eduImg, setEduImg] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);

  /** DOWNLOAD ONLY — never opens the print dialog. */
  const handleDownload = async () => {
    if (!docRef.current || exporting) return;
    setExporting("pdf");
    try {
      await downloadNodeAsPdf(docRef.current, `ورقة-عمل-${sheet?.title ?? subject}`);
      toast.success("تم تحميل ملف PDF");
    } catch { toast.error("تعذّر إنشاء ملف PDF، حاول مرة أخرى"); }
    finally { setExporting(null); }
  };

  /** PRINT ONLY — never downloads a file. */
  const handlePrint = async () => {
    if (!docRef.current || exporting) return;
    setExporting("print");
    try { await printNode(docRef.current, sheet?.title ?? "ورقة عمل"); }
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
    setLoading(true); setSheet(null); setShowAnswers(false); setEduImg(null);
    try {
      const res = await run({ data: { gradeId, subject, lesson: lesson.trim() || undefined, count, imageDataUrl: image ?? undefined } });
      if (res.worksheet) {
        setSheet(res.worksheet);
        const topic = res.worksheet.title || lesson.trim();
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
          اكتب اسم الدرس أو ارفع صورة من صفحة الكتاب — واحصل على ورقة عمل قابلة للطباعة مع مفتاح الإجابات، من المنهاج الفلسطيني فقط.
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
            <label className="mb-1 block text-xs font-bold text-gold">عدد الأسئلة</label>
            <input
              type="number" min={3} max={30} value={count}
              onChange={(e) => setCount(Math.min(30, Math.max(3, Number(e.target.value) || 10)))}
              className="w-full rounded-xl border border-gold/30 bg-white/10 px-4 py-3 text-sm font-bold backdrop-blur outline-none focus:border-gold"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-bold text-gold">اسم الدرس</label>
          <input
            value={lesson}
            onChange={(e) => setLesson(e.target.value)}
            placeholder="مثال: الوحدة الثانية — المتتاليات الحسابية"
            className="w-full rounded-xl border border-gold/30 bg-white/10 px-4 py-3 text-sm font-bold placeholder:text-primary-foreground/50 backdrop-blur outline-none focus:border-gold"
          />
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
            {loading ? "جارٍ التوليد…" : "توليد ورقة العمل"}
          </button>
        </div>
      </section>

      {sheet && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2 print:hidden">
            <button onClick={handleDownload} disabled={!!exporting} className="inline-flex items-center gap-2 rounded-xl bg-gradient-royal px-4 py-2.5 text-xs font-bold text-gold disabled:opacity-60">
              {exporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} تحميل PDF
            </button>
            <button onClick={handlePrint} disabled={!!exporting} className="inline-flex items-center gap-2 rounded-xl border border-gold/50 px-4 py-2.5 text-xs font-bold disabled:opacity-60">
              {exporting === "print" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} طباعة
            </button>
            <button onClick={() => setShowAnswers((v) => !v)} className="inline-flex items-center gap-2 rounded-xl border border-gold/50 px-4 py-2.5 text-xs font-bold">
              {showAnswers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showAnswers ? "إخفاء مفتاح الإجابات" : "عرض مفتاح الإجابات"}
            </button>
          </div>

          <div ref={docRef} className="mt-4 bg-card">
          <article className="rounded-2xl border border-border bg-card p-6 shadow-card print:border-0 print:shadow-none">
            <header className="border-b border-border pb-4 text-center">
              <h2 className="text-2xl font-extrabold">{sheet.title}</h2>
              <p className="mt-1 text-xs font-bold text-muted-foreground">
                {GRADES.find((g) => g.id === gradeId)?.name} · {subject} · منصّة المنارة التعليمية
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
                <span>الاسم: ...............................</span>
                <span>التاريخ: ....../....../..........</span>
                <span>العلامة: ......... / {sheet.questions.length}</span>
              </div>
            </header>

            {sheet.objectives.length > 0 && (
              <section className="mt-4 rounded-xl bg-secondary p-4">
                <h3 className="text-sm font-extrabold">🎯 الأهداف التعليمية</h3>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  {sheet.objectives.map((o, i) => <li key={i}>{o}</li>)}
                </ul>
              </section>
            )}

            <p className="mt-4 text-sm font-bold">{sheet.instructions}</p>

            {sheet.keyNotes.length > 0 && (
              <section className="mt-4 rounded-xl border border-gold/40 bg-gold/5 p-4">
                <h3 className="text-sm font-extrabold">📌 نقاط مهمة</h3>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  {sheet.keyNotes.map((k, i) => <li key={i}>{k}</li>)}
                </ul>
              </section>
            )}

            <EduLessonImage src={eduImg} loading={imgLoading} title={sheet.title} />

            <EduVisuals visuals={sheet.visuals} />


            <ol className="mt-4 space-y-5">
              {sheet.questions.map((q) => (
                <li key={q.n} className="break-inside-avoid rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold leading-relaxed">{q.n}. {q.text}</p>
                    <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold" style={{ color: "var(--royal-deep)" }}>
                      {TYPE_LABEL[q.type] || "سؤال"}
                    </span>
                  </div>
                  {q.options.length > 0 ? (
                    <ul className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
                      {q.options.map((o, i) => (
                        <li key={i} className="rounded-lg border border-border px-3 py-1.5">{o}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <div className="h-px w-full bg-border" />
                      <div className="h-px w-full bg-border" />
                    </div>
                  )}
                </li>
              ))}
            </ol>

            {sheet.activities.length > 0 && (
              <section className="mt-5 rounded-xl bg-secondary p-4">
                <h3 className="text-sm font-extrabold">🧪 أنشطة تطبيقية</h3>
                <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm">
                  {sheet.activities.map((a, i) => <li key={i}>{a}</li>)}
                </ol>
              </section>
            )}

            {sheet.criticalThinking.length > 0 && (
              <section className="mt-4 rounded-xl border border-border p-4">
                <h3 className="text-sm font-extrabold">🧠 أسئلة تفكير ناقد</h3>
                <ol className="mt-2 list-inside list-decimal space-y-3 text-sm">
                  {sheet.criticalThinking.map((c, i) => (
                    <li key={i}>
                      {c}
                      <div className="mt-2 h-px w-full bg-border" />
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </article>


          {showAnswers && (
            <article className="mt-6 rounded-2xl border border-gold/40 bg-card p-6 shadow-card">
              <h2 className="text-xl font-extrabold">مفتاح الإجابات النموذجي</h2>
              <ol className="mt-3 space-y-3">
                {sheet.questions.map((q) => (
                  <li key={q.n} className="break-inside-avoid rounded-xl bg-secondary p-3 text-sm">
                    <span className="font-extrabold">{q.n}. </span>
                    <span className="font-bold">{q.answer || "—"}</span>
                    {q.explanation && <p className="mt-1 text-xs text-muted-foreground">{q.explanation}</p>}
                  </li>
                ))}
              </ol>
            </article>
          )}
          </div>
        </>
      )}
    </div>
  );
}
