import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, UserCheck, UserX, Trash2, Save, Quote as QuoteIcon, Users, MessageSquare, Settings, Sparkles, PaintBucket, BookOpen, UserCircle2, Ghost, Wand2, Link2, FileText, GraduationCap, Award, ArrowUp, ArrowDown, ShoppingBag, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser, signOut } from "@/lib/use-auth";
import { useFeatureToggles, useBrand, useVisitorCount, useRegisteredUserCount, useUsersWithRoles, setUserRole, DEFAULT_TOGGLES, DEFAULT_BRAND, type FeatureToggles, type BrandSettings } from "@/lib/site-settings";

import { useServerFn } from "@tanstack/react-start";
import { aiFetchPlaylist, aiClassifyVideos, aiScrapeWorksheets, aiImportCourse, aiImportBooks } from "@/lib/ai-import.functions";
import { GRADES, subjectsForGrade } from "@/lib/curriculum";
import { useCustomSubjects } from "@/lib/use-custom-subjects";
import { COURSE_CATEGORY_LABELS } from "@/lib/certificate-theme";

export const Route = createFileRoute("/admin-panel")({
  component: AdminPanelPage,
  head: () => ({ meta: [{ title: "لوحة التحكم — المنارة" }, { name: "robots", content: "noindex" }] }),
});

type ModRow = {
  id: number;
  full_name: string;
  email: string;
  goal: string | null;
  status: string | null;
  created_at: string | null;
  user_id: string | null;
};

function AdminPanelPage() {
  const { user, loading, isSuperAdmin } = useAuthUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading) return <div className="p-12 text-center text-muted-foreground">جارٍ التحقق...</div>;
  if (!user) return null;

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-3 text-2xl font-extrabold">غير مصرّح</h1>
        <p className="mt-2 text-sm text-muted-foreground">لوحة التحكم متاحة فقط للمسؤول الأعلى.</p>
        <Link to="/" className="mt-6 inline-block rounded-xl bg-gradient-royal px-5 py-2.5 text-sm font-bold text-gold">العودة</Link>
      </div>
    );
  }
  return <Dashboard />;
}

function Dashboard() {
  const [tab, setTab] = useState<"stats" | "ai" | "courses" | "subjects" | "library" | "store" | "mods" | "quotes" | "quran" | "features" | "brand" | "settings">("stats");

  const navigate = useNavigate();

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 md:grid-cols-[260px_1fr] md:px-5 md:py-10">
      {/* AI Command Center sidebar */}
      <aside className="glass h-fit rounded-2xl p-4 md:sticky md:top-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-royal-deep">
          <Wand2 className="h-4 w-4 text-gold" /> مركز التحكّم الذكي
        </div>
        <nav className="flex flex-col gap-1">
          {([
            ["stats", "الإحصائيات", Users],
            ["ai", "المساعد الذكي", Wand2],
            ["courses", "إدارة الكورسات", GraduationCap],
            ["subjects", "إدارة المواد", BookOpen],
            ["library", "المكتبة", BookOpen],
            ["store", "متجر النقاط", ShoppingBag],
            ["mods", "طلبات المشرفين", MessageSquare],
            ["quotes", "الاقتباسات", QuoteIcon],
            ["quran", "الآيات القرآنية", BookOpen],
            ["features", "الميزات", Sparkles],
            ["brand", "العلامة", PaintBucket],
            ["settings", "إعدادات أخرى", Settings],
          ] as const).map(([t, label, Icon]) => (

            <button
              key={t}
              onClick={() => setTab(t)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-smooth ${
                tab === t ? "bg-gradient-royal text-gold shadow-luxury" : "text-royal-deep/80 hover:bg-white/40"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>
        <div className="mt-4 border-t border-border pt-3">
          <Link to="/admin" className="block rounded-lg bg-gradient-gold px-3 py-2 text-center text-xs font-bold shadow-gold" style={{ color: "var(--royal-deep)" }}>
            إدارة المحتوى
          </Link>
          <button
            onClick={async () => { await signOut(); toast.success("تم تسجيل الخروج"); navigate({ to: "/" }); }}
            className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-xs font-bold hover:border-destructive hover:text-destructive"
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <div>
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold md:text-3xl">
            <ShieldCheck className="h-6 w-6 text-gold md:h-7 md:w-7" /> لوحة التحكم
          </h1>
          <p className="text-xs text-muted-foreground md:text-sm">إدارة المحتوى، الإحصائيات، والاقتباسات والآيات</p>
        </header>

        {tab === "stats" && <StatsTab />}
        {tab === "ai" && <AICommandTab />}
        {tab === "courses" && <CoursesAdminTab />}
        {tab === "subjects" && <SubjectsAdminTab />}
        {tab === "library" && <LibraryAdminTab />}
        {tab === "store" && <StoreAdminTab />}
        {tab === "mods" && <ModsTab />}
        {tab === "quotes" && <QuotesTab />}
        {tab === "quran" && <QuranTab />}
        {tab === "settings" && <SettingsTab />}
        {tab === "features" && <FeaturesTab />}
        {tab === "brand" && <BrandTab />}

      </div>
    </div>
  );
}

/** AI Command Center — يوتيوب Playlist + سحب أوراق العمل/الملخصات من أي رابط، عبر Gemini */
type PlaylistItem = { videoId: string; video_url: string; title: string; description: string; grade_id: number; subject: string; semester: 1 | 2 };
type WorksheetItem = { url: string; title: string; description?: string; grade_id: number; subject: string; source: string; kind?: "summary" | "worksheet" };

function AICommandTab() {
  const [tab, setTab] = useState<"yt" | "course" | "ws" | "sum" | "books">("yt");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTab("yt")} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === "yt" ? "bg-gradient-royal text-gold shadow-luxury" : "border border-border"}`}>
          استيراد دروس (قائمة يوتيوب)
        </button>
        <button onClick={() => setTab("course")} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === "course" ? "bg-gradient-royal text-gold shadow-luxury" : "border border-border"}`}>
          استيراد كورس كامل
        </button>
        <button onClick={() => setTab("ws")} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === "ws" ? "bg-gradient-royal text-gold shadow-luxury" : "border border-border"}`}>
          سحب أوراق العمل
        </button>
        <button onClick={() => setTab("sum")} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === "sum" ? "bg-gradient-royal text-gold shadow-luxury" : "border border-border"}`}>
          سحب الملخصات
        </button>
        <button onClick={() => setTab("books")} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === "books" ? "bg-gradient-royal text-gold shadow-luxury" : "border border-border"}`}>
          استيراد كتب للمكتبة
        </button>
      </div>
      {tab === "yt" ? <PlaylistImporter />
        : tab === "course" ? <CourseImporter />
        : tab === "ws" ? <WorksheetsScraper kind="worksheet" />
        : tab === "sum" ? <WorksheetsScraper kind="summary" />
        : <BooksImporter />}
    </div>
  );
}

type BookImportItem = { title: string; author: string | null; description: string | null; pdf_url: string; cover_url: string | null; category: "textbook" | "reading" };

function BooksImporter() {
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<"textbook" | "reading">("reading");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<BookImportItem[]>([]);
  const run = useServerFn(aiImportBooks);

  const analyze = async () => {
    if (!url.trim()) { toast.error("الصق رابط موقع كتب (مثل هنداوي)"); return; }
    setLoading(true); setItems([]);
    try {
      const r = await run({ data: { url: url.trim(), category } });
      if (r.error) toast.error(r.error);
      if (r.books?.length) {
        setItems(r.books.map(b => ({ ...b, category })));
        toast.success(`تم اكتشاف ${r.books.length} كتاب`);
      }
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };

  const saveAll = async () => {
    if (!items.length) return;
    setSaving(true);
    try {
      const rows = items.map(b => ({
        title: b.title, author: b.author, description: b.description,
        category: b.category, grade_id: null, subject: null,
        pdf_url: b.pdf_url, cover_url: b.cover_url,
      }));
      const { error } = await supabase.from("library_books" as never).insert(rows as never);
      if (error) throw error;
      toast.success(`تمت إضافة ${rows.length} كتاب للمكتبة`);
      setItems([]); setUrl("");
    } catch (e) { toast.error((e as Error).message || "فشل الحفظ"); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl border border-gold/30 bg-card p-5 shadow-card">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-extrabold"><BookOpen className="h-5 w-5 text-gold" /> استيراد كتب للمكتبة الإلكترونية</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        الصق رابط صفحة كتب (مثال: hindawi.org أو أي موقع كتب PDF). سيقوم الذكاء الاصطناعي بزحف الصفحة، اكتشاف الكتب، استخراج ملفات PDF مع العنوان والمؤلف وصورة الغلاف، ثم إضافتها للمكتبة.
      </p>
      <input dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.hindawi.org/books/..." className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <div className="mb-3 flex items-center gap-2 text-xs">
        <span className="font-bold">القسم:</span>
        <select value={category} onChange={(e) => setCategory(e.target.value as "textbook" | "reading")} className="rounded border border-border bg-background px-2 py-1">
          <option value="reading">مكتبة القراءة</option>
          <option value="textbook">كتب مدرسية</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={analyze} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-gradient-royal px-4 py-2 text-sm font-bold text-gold shadow-luxury disabled:opacity-60">
          <Sparkles className="h-4 w-4" /> {loading ? "جارٍ الزحف والتحليل..." : "اكتشف الكتب"}
        </button>
        {items.length > 0 && (
          <button onClick={saveAll} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-4 py-2 text-sm font-bold shadow-gold disabled:opacity-60" style={{ color: "var(--royal-deep)" }}>
            <Save className="h-4 w-4" /> {saving ? "جارٍ الحفظ..." : `أضف ${items.length} كتاب للمكتبة`}
          </button>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-4 max-h-[500px] space-y-2 overflow-y-auto rounded-lg border border-border p-2">
          {items.map((b, i) => (
            <div key={b.pdf_url} className="flex gap-2 rounded border border-border bg-background p-2 text-xs">
              {b.cover_url ? (
                <img src={b.cover_url} alt="" className="h-16 w-12 flex-none rounded object-cover" loading="lazy" />
              ) : (
                <div className="grid h-16 w-12 flex-none place-items-center rounded bg-gradient-royal text-gold">
                  <BookOpen className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <input value={b.title} onChange={(e) => setItems(x => x.map((a, j) => j === i ? { ...a, title: e.target.value } : a))} className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] font-bold" />
                <input value={b.author || ""} onChange={(e) => setItems(x => x.map((a, j) => j === i ? { ...a, author: e.target.value || null } : a))} placeholder="المؤلف" className="w-full rounded border border-border bg-background px-2 py-1 text-[10px]" />
                <textarea value={b.description || ""} onChange={(e) => setItems(x => x.map((a, j) => j === i ? { ...a, description: e.target.value || null } : a))} rows={2} placeholder="الوصف" className="w-full rounded border border-border bg-background px-2 py-1 text-[10px]" />
                <div className="truncate text-[9px] text-muted-foreground" dir="ltr">{b.pdf_url}</div>
              </div>
              <button onClick={() => setItems(x => x.filter((_, j) => j !== i))} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type CourseImportLesson = { videoId: string; video_url: string; title: string; description: string; position: number };
type CourseImportData = { title: string; description: string; category: string; subject: string; grade_id: number | null; thumbnail_url: string };

function CourseImporter() {
  const [url, setUrl] = useState("");
  const [defaultGrade, setDefaultGrade] = useState<number>(1);
  const [defaultSubject, setDefaultSubject] = useState("اللغة العربية");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState<CourseImportData | null>(null);
  const [lessons, setLessons] = useState<CourseImportLesson[]>([]);
  const run = useServerFn(aiImportCourse);

  const analyze = async () => {
    if (!url.trim()) { toast.error("الصق رابط قائمة التشغيل"); return; }
    setLoading(true); setCourse(null); setLessons([]);
    try {
      const r = await run({ data: { url: url.trim(), defaultGradeId: defaultGrade, defaultSubject } });
      if (r.error) toast.error(r.error);
      if (r.course) {
        setCourse(r.course);
        setLessons(r.lessons);
        toast.success(`تم استخراج ${r.lessons.length} درس وتصنيف الكورس`);
      }
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };

  const saveAll = async () => {
    if (!course || !lessons.length) return;
    setSaving(true);
    try {
      // 1) create course
      const { data: createdCourse, error: cErr } = await supabase.from("courses").insert({
        title: course.title, description: course.description, subject: course.subject,
        grade_id: course.grade_id, thumbnail_url: course.thumbnail_url, video_url: lessons[0].video_url,
        category: course.category, auto_certificate_theme: true,
      }).select("id").single();
      if (cErr || !createdCourse) throw cErr || new Error("فشل إنشاء الكورس");

      // 2) create lessons and link them
      // Lessons table requires grade_id — fall back to picker's default when the course has no grade
      const lessonGrade = course.grade_id ?? defaultGrade;
      const lessonRows = lessons.map((l) => ({
        grade_id: lessonGrade, subject: course.subject, semester: 1 as const,
        title: l.title, description: l.description, video_url: l.video_url,
      }));
      const { data: insertedLessons, error: lErr } = await supabase.from("lessons").insert(lessonRows).select("id");
      if (lErr || !insertedLessons) throw lErr || new Error("فشل إنشاء الدروس");

      const links = insertedLessons.map((row, i) => ({
        course_id: createdCourse.id, lesson_id: row.id, position: i,
      }));
      const { error: linkErr } = await supabase.from("course_lessons").insert(links);
      if (linkErr) throw linkErr;

      toast.success(`تم إنشاء الكورس مع ${lessons.length} درس`);
      setCourse(null); setLessons([]); setUrl("");
    } catch (e) {
      toast.error((e as Error).message || "فشل الحفظ");
    } finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl border border-gold/30 bg-card p-5 shadow-card">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-extrabold"><GraduationCap className="h-5 w-5 text-gold" /> استيراد كورس كامل من قائمة يوتيوب</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        الصق رابط قائمة تشغيل. سيقوم الذكاء الاصطناعي بتصنيفها (برمجة/تلاوة/رياضيات...) وتوليد عنوان ووصف للكورس، ثم إنشاء الكورس مع جميع الدروس وربطها تلقائيًا.
      </p>
      <input dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/playlist?list=..." className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <div className="mb-3">
        <div className="mb-1 text-xs font-bold text-muted-foreground">افتراضات (إن لم يستطع التصنيف):</div>
        <GradeSubjectPicker gradeId={defaultGrade} subject={defaultSubject} onChange={(g, s) => { setDefaultGrade(g); setDefaultSubject(s); }} />
      </div>
      <div className="flex gap-2">
        <button onClick={analyze} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-gradient-royal px-4 py-2 text-sm font-bold text-gold shadow-luxury disabled:opacity-60">
          <Sparkles className="h-4 w-4" /> {loading ? "جارٍ التحليل..." : "حلّل وصنّف الكورس"}
        </button>
        {course && (
          <button onClick={saveAll} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-4 py-2 text-sm font-bold shadow-gold disabled:opacity-60" style={{ color: "var(--royal-deep)" }}>
            <Save className="h-4 w-4" /> {saving ? "جارٍ الحفظ..." : `إنشاء الكورس (${lessons.length} درس)`}
          </button>
        )}
      </div>

      {course && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-gold/40 bg-background p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full bg-gold/10 px-2 py-0.5 font-bold text-gold">{COURSE_CATEGORY_LABELS[course.category] || course.category}</span>
              <span className="text-muted-foreground">{course.subject}{course.grade_id ? ` · ${GRADES.find(g => g.id === course.grade_id)?.name}` : " · كورس عام"}</span>
            </div>
            <input value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm font-extrabold" />
            <textarea value={course.description} onChange={(e) => setCourse({ ...course, description: e.target.value })} rows={3} className="mt-2 w-full rounded border border-border bg-background px-2 py-1.5 text-xs" />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <select value={course.category} onChange={(e) => setCourse({ ...course, category: e.target.value })} className="rounded border border-border bg-background px-2 py-1 text-[11px]">
                {Object.entries(COURSE_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={course.grade_id ?? ""} onChange={(e) => { const v = e.target.value; if (!v) { setCourse({ ...course, grade_id: null }); return; } const g = Number(v); const ss = subjectsForGrade(g); setCourse({ ...course, grade_id: g, subject: ss.includes(course.subject) ? course.subject : ss[0] }); }} className="rounded border border-border bg-background px-2 py-1 text-[11px]">
                <option value="">بدون صف (كورس عام)</option>
                {GRADES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select value={course.subject} onChange={(e) => setCourse({ ...course, subject: e.target.value })} className="rounded border border-border bg-background px-2 py-1 text-[11px]">
                {subjectsForGrade(course.grade_id ?? 9).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="max-h-[400px] space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            {lessons.map((l, i) => (
              <div key={l.videoId} className="rounded border border-border bg-background p-2 text-xs">
                <div className="flex items-start gap-2">
                  <img src={`https://i.ytimg.com/vi/${l.videoId}/default.jpg`} alt="" className="h-10 w-16 rounded object-cover" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <input value={l.title} onChange={(e) => setLessons((x) => x.map((a, j) => j === i ? { ...a, title: e.target.value } : a))} className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] font-bold" />
                    <textarea value={l.description} onChange={(e) => setLessons((x) => x.map((a, j) => j === i ? { ...a, description: e.target.value } : a))} rows={2} className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-[10px]" />
                  </div>
                  <button onClick={() => setLessons((x) => x.filter((_, j) => j !== i))} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


function GradeSubjectPicker({ gradeId, subject, onChange }: { gradeId: number; subject: string; onChange: (g: number, s: string) => void }) {
  const subs = subjectsForGrade(gradeId);
  return (
    <div className="grid grid-cols-2 gap-2">
      <select value={gradeId} onChange={(e) => { const g = Number(e.target.value); const ss = subjectsForGrade(g); onChange(g, ss.includes(subject) ? subject : ss[0]); }} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
        {GRADES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      <select value={subject} onChange={(e) => onChange(gradeId, e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
        {subs.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
}

function PlaylistImporter() {
  const [url, setUrl] = useState("");
  const [defaultGrade, setDefaultGrade] = useState(9);
  const [defaultSubject, setDefaultSubject] = useState("جميع المواد");
  const [firstSemesterCount, setFirstSemesterCount] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const fetchPlaylist = useServerFn(aiFetchPlaylist);
  const classify = useServerFn(aiClassifyVideos);

  /** Optional manual split: first N videos -> semester 1, the rest -> semester 2. */
  const applyManualSplit = (list: PlaylistItem[]) => {
    const n = Number(firstSemesterCount);
    if (!firstSemesterCount.trim() || !Number.isFinite(n) || n <= 0) return list;
    return list.map((it, i) => ({ ...it, semester: (i < n ? 1 : 2) as 1 | 2 }));
  };

  /**
   * Fast path: one bulk scrape of the entire playlist, then AI classification
   * of all videos in parallel chunks of 25 (4 chunks in flight). A failed
   * chunk falls back to raw titles instead of cancelling the run.
   */
  const analyze = async () => {
    if (!url.trim()) { toast.error("الصق رابط القائمة"); return; }
    setLoading(true); setItems([]); setProgress("جارٍ استخراج كل الفيديوهات دفعة واحدة...");
    try {
      const bulk = await fetchPlaylist({ data: { url: url.trim() } });
      if (!bulk.videos.length) { toast.error(bulk.error || "لم يتم استخراج أي فيديو"); return; }
      setProgress(`تم استخراج ${bulk.total} فيديو — جارٍ التصنيف المتوازي...`);

      const CHUNK = 25;
      const CONCURRENCY = 4;
      const chunks: (typeof bulk.videos)[] = [];
      for (let i = 0; i < bulk.videos.length; i += CHUNK) chunks.push(bulk.videos.slice(i, i + CHUNK));

      const results: PlaylistItem[][] = new Array(chunks.length).fill(null).map(() => []);
      let done = 0, failedBatches = 0;
      let cursor = 0;
      const worker = async () => {
        while (cursor < chunks.length) {
          const idx = cursor++;
          const chunk = chunks[idx];
          try {
            const r = await classify({
              data: {
                videos: chunk.map((v) => ({ videoId: v.videoId, title: v.title, position: v.position, video_url: v.video_url })),
                playlistTitle: bulk.playlistTitle,
                defaultGradeId: defaultGrade,
                ...(defaultSubject !== "جميع المواد" ? { defaultSubject } : {}),
              },
            });
            if (r.error) failedBatches++;
            results[idx] = r.items as PlaylistItem[];
          } catch {
            failedBatches++;
            results[idx] = chunk.map((v) => ({
              videoId: v.videoId, video_url: v.video_url, title: v.title, description: "",
              grade_id: defaultGrade, subject: defaultSubject === "جميع المواد" ? "العلوم" : defaultSubject,
              semester: 1 as 1 | 2,
            }));
          }
          done += chunk.length;
          setProgress(`تم تصنيف ${done} من ${bulk.total} فيديو...`);
          setItems(applyManualSplit(results.flat()));
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, worker));

      const all = applyManualSplit(results.flat());
      setItems(all);
      toast.success(`تم تصنيف ${all.length} فيديو${failedBatches ? ` — دفعات متعثّرة: ${failedBatches}` : ""}`);
    } catch (e) {
      toast.error(`تعذّر الاستيراد: ${(e as Error).message}`);
    } finally { setLoading(false); setProgress(null); }
  };

  const saveAll = async () => {
    if (!items.length) return;
    setSaving(true);
    setProgress("جارٍ الحفظ...");
    let inserted = 0, failed = 0, duplicates = 0;
    try {
      // Skip videos already stored
      const urls = items.map((i) => i.video_url);
      const { data: existing } = await supabase.from("lessons").select("video_url").in("video_url", urls);
      const seen = new Set(((existing as { video_url: string }[]) || []).map((e) => e.video_url));
      const fresh = items.filter((it) => {
        if (seen.has(it.video_url)) { duplicates++; return false; }
        seen.add(it.video_url);
        return true;
      });

      // Single bulk insert for the whole playlist; only on failure do we fall
      // back to smaller chunks and finally row-by-row.
      const allRows = fresh.map((it) => ({
        grade_id: it.grade_id, subject: it.subject, semester: it.semester,
        title: it.title, description: it.description, video_url: it.video_url,
      }));
      if (allRows.length) {
        setProgress(`جارٍ حفظ ${allRows.length} درسًا دفعة واحدة...`);
        const { error: bulkErr } = await supabase.from("lessons").insert(allRows);
        if (!bulkErr) {
          inserted = allRows.length;
        } else {
          const CHUNK = 25;
          for (let i = 0; i < allRows.length; i += CHUNK) {
            const rows = allRows.slice(i, i + CHUNK);
            const { error } = await supabase.from("lessons").insert(rows);
            if (!error) inserted += rows.length;
            else {
              for (const row of rows) {
                const { error: e2 } = await supabase.from("lessons").insert(row);
                if (e2) failed++; else inserted++;
              }
            }
            setProgress(`تم حفظ ${inserted} / ${allRows.length}...`);
          }
        }
      }
      toast.success(`تم الاستيراد: ${inserted} — فشل: ${failed} — مكرر: ${duplicates}`);
      if (inserted > 0 && failed === 0) { setItems([]); setUrl(""); }
    } finally { setSaving(false); setProgress(null); }
  };


  return (
    <div className="rounded-2xl border border-gold/30 bg-card p-5 shadow-card">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-extrabold"><Wand2 className="h-5 w-5 text-gold" /> استيراد قائمة تشغيل يوتيوب (AI)</h2>
      <p className="mb-3 text-xs text-muted-foreground">يستخرج كل الفيديوهات ويصنّفها تلقائيًا بـ Gemini 2.5 Pro (صف/مادة/فصل/وصف).</p>
      <input dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/playlist?list=..." className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <div className="mb-3">
        <div className="mb-1 text-xs font-bold text-muted-foreground">الصف والمادة (تُستخدم إذا فشل التصنيف):</div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={defaultGrade}
            onChange={(e) => setDefaultGrade(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
          >
            {GRADES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select
            value={defaultSubject}
            onChange={(e) => setDefaultSubject(e.target.value)}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
          >
            <option value="جميع المواد">جميع المواد (تصنيف تلقائي لكل فيديو)</option>
            {subjectsForGrade(defaultGrade).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {defaultSubject === "جميع المواد" && (
          <p className="mt-1 text-[11px] text-muted-foreground">سيتم تحليل عنوان ووصف كل فيديو واستنتاج المادة المناسبة له تلقائيًا.</p>
        )}
      </div>

      <div className="mb-3 rounded-xl border border-dashed border-border p-3">
        <div className="mb-1 text-xs font-bold">تقسيم يدوي (اختياري)</div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[11px] text-muted-foreground">عدد فيديوهات الفصل الأول</label>
          <input
            type="number"
            min={1}
            value={firstSemesterCount}
            onChange={(e) => {
              setFirstSemesterCount(e.target.value);
              const n = Number(e.target.value);
              if (e.target.value.trim() && Number.isFinite(n) && n > 0) {
                setItems((x) => x.map((it, i) => ({ ...it, semester: (i < n ? 1 : 2) as 1 | 2 })));
              }
            }}
            placeholder="مثال: 16"
            className="w-28 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">إذا تُرك الحقل فارغًا يعتمد النظام على التصنيف التلقائي من عناوين الفيديوهات.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={analyze} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-gradient-royal px-4 py-2 text-sm font-bold text-gold shadow-luxury disabled:opacity-60">
          <Sparkles className="h-4 w-4" /> {loading ? "جارٍ التحليل..." : "حلّل وصنّف"}
        </button>
        {items.length > 0 && (
          <button onClick={saveAll} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-4 py-2 text-sm font-bold shadow-gold disabled:opacity-60" style={{ color: "var(--royal-deep)" }}>
            <Save className="h-4 w-4" /> {saving ? "جارٍ الحفظ..." : `حفظ ${items.length} درس`}
          </button>
        )}
      </div>
      {progress && <div className="mt-2 text-xs font-bold text-muted-foreground">{progress}</div>}


      {items.length > 0 && (
        <div className="mt-4 max-h-[500px] space-y-2 overflow-y-auto rounded-lg border border-border p-2">
          {items.map((it, i) => (
            <div key={it.videoId} className="rounded-lg border border-border bg-background p-2 text-xs">
              <div className="flex items-start gap-2">
                <img src={`https://i.ytimg.com/vi/${it.videoId}/default.jpg`} alt="" className="h-12 w-20 rounded object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <input value={it.title} onChange={(e) => setItems((x) => x.map((a, j) => j === i ? { ...a, title: e.target.value } : a))} className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-bold" />
                  <input value={it.description} onChange={(e) => setItems((x) => x.map((a, j) => j === i ? { ...a, description: e.target.value } : a))} placeholder="وصف" className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-[11px]" />
                  <div className="mt-1 grid grid-cols-3 gap-1">
                    <select value={it.grade_id} onChange={(e) => { const g = Number(e.target.value); const ss = subjectsForGrade(g); setItems((x) => x.map((a, j) => j === i ? { ...a, grade_id: g, subject: ss.includes(a.subject) ? a.subject : ss[0] } : a)); }} className="rounded border border-border bg-background px-1 py-1 text-[11px]">
                      {GRADES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <select value={it.subject} onChange={(e) => setItems((x) => x.map((a, j) => j === i ? { ...a, subject: e.target.value } : a))} className="rounded border border-border bg-background px-1 py-1 text-[11px]">
                      {subjectsForGrade(it.grade_id).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={it.semester} onChange={(e) => setItems((x) => x.map((a, j) => j === i ? { ...a, semester: Number(e.target.value) as 1 | 2 } : a))} className="rounded border border-border bg-background px-1 py-1 text-[11px]">
                      <option value={1}>الفصل 1</option>
                      <option value={2}>الفصل 2</option>
                    </select>
                  </div>
                </div>
                <button onClick={() => setItems((x) => x.filter((_, j) => j !== i))} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorksheetsScraper({ kind }: { kind: "worksheet" | "summary" }) {
  const isSummary = kind === "summary";
  const [url, setUrl] = useState("");
  const [defaultGrade, setDefaultGrade] = useState(9);
  const [defaultSubject, setDefaultSubject] = useState("الرياضيات");
  const [allSubjects, setAllSubjects] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<WorksheetItem[]>([]);
  const [saving, setSaving] = useState(false);
  const run = useServerFn(aiScrapeWorksheets);

  const analyze = async () => {
    if (!url.trim()) { toast.error("الصق رابط الصفحة"); return; }
    setLoading(true); setItems([]);
    try {
      const r = await run({ data: {
        url: url.trim(),
        defaultGradeId: defaultGrade,
        defaultSubject: allSubjects ? undefined : defaultSubject,
        allSubjects,
        kind,
        maxDepth: 2,
      } });
      if (r.error) toast.error(r.error);
      setItems(r.items as WorksheetItem[]);
      if (r.items.length) toast.success(`تم العثور على ${r.items.length} ملف`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };

  const saveAll = async () => {
    if (!items.length) return;
    setSaving(true);
    if (isSummary) {
      const rows = items.map((it) => ({
        grade_id: it.grade_id, subject: it.subject, title: it.title,
        content: it.description || "", file_url: it.url,
      }));
      const { error } = await supabase.from("summaries").insert(rows);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success(`تم حفظ ${rows.length} ملخّص`);
    } else {
      const rows = items.map((it) => ({ grade_id: it.grade_id, subject: it.subject, title: it.title, url: it.url, source: it.source }));
      const { error } = await supabase.from("worksheets").insert(rows);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success(`تم حفظ ${rows.length} ورقة عمل`);
    }
    setItems([]); setUrl("");
  };

  return (
    <div className="rounded-2xl border border-gold/30 bg-card p-5 shadow-card">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-extrabold">
        {isSummary ? <FileText className="h-5 w-5 text-gold" /> : <Link2 className="h-5 w-5 text-gold" />}
        {isSummary ? "سحب الملخصات من أي رابط (AI)" : "سحب أوراق العمل من أي رابط (AI)"}
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        يفتح صفحات الفهرس والمنشورات الداخلية تلقائيًا (حتى مستويَين مثل صفحة "معاينة وتنزيل")، يستخرج ملفات PDF/Word/Drive، ويصنّفها بالذكاء الاصطناعي (الصف، المادة، الوحدة، الدرس، النوع).
      </p>
      <input dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.sh-pal.com/search/label/..." className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <label className="mb-2 flex items-center gap-2 text-xs font-bold text-royal-deep/80">
        <input type="checkbox" checked={allSubjects} onChange={(e) => setAllSubjects(e.target.checked)} className="h-4 w-4 accent-gold" />
        كل المواد (اسمح للذكاء بتصنيف كل ملف بمادّته المستقلّة)
      </label>
      {!allSubjects ? (
        <div className="mb-3"><GradeSubjectPicker gradeId={defaultGrade} subject={defaultSubject} onChange={(g, s) => { setDefaultGrade(g); setDefaultSubject(s); }} /></div>
      ) : (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-bold text-muted-foreground">الصف الافتراضي (يُستخدم عند تعذّر الاستنتاج)</label>
          <select value={defaultGrade} onChange={(e) => setDefaultGrade(Number(e.target.value))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {GRADES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={analyze} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-gradient-royal px-4 py-2 text-sm font-bold text-gold shadow-luxury disabled:opacity-60">
          <Sparkles className="h-4 w-4" /> {loading ? "جارٍ السحب..." : "اسحب وصنّف"}
        </button>
        {items.length > 0 && (
          <button onClick={saveAll} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-4 py-2 text-sm font-bold shadow-gold disabled:opacity-60" style={{ color: "var(--royal-deep)" }}>
            <Save className="h-4 w-4" /> {saving ? "جارٍ الحفظ..." : `حفظ ${items.length} ${isSummary ? "ملخّص" : "ورقة"}`}
          </button>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-4 max-h-[500px] space-y-2 overflow-y-auto rounded-lg border border-border p-2">
          {items.map((it, i) => (
            <div key={it.url} className="rounded-lg border border-border bg-background p-2 text-xs">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <input value={it.title} onChange={(e) => setItems((x) => x.map((a, j) => j === i ? { ...a, title: e.target.value } : a))} className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-bold" />
                  <textarea value={it.description || ""} onChange={(e) => setItems((x) => x.map((a, j) => j === i ? { ...a, description: e.target.value } : a))} placeholder="وصف تعليمي" rows={2} className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-[11px]" />
                  <div className="mt-1 truncate text-[10px] text-muted-foreground" dir="ltr">{it.url}</div>
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    <select value={it.grade_id} onChange={(e) => { const g = Number(e.target.value); const ss = subjectsForGrade(g); setItems((x) => x.map((a, j) => j === i ? { ...a, grade_id: g, subject: ss.includes(a.subject) ? a.subject : ss[0] } : a)); }} className="rounded border border-border bg-background px-1 py-1 text-[11px]">
                      {GRADES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <select value={it.subject} onChange={(e) => setItems((x) => x.map((a, j) => j === i ? { ...a, subject: e.target.value } : a))} className="rounded border border-border bg-background px-1 py-1 text-[11px]">
                      {subjectsForGrade(it.grade_id).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={() => setItems((x) => x.filter((_, j) => j !== i))} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== Courses Admin: link lessons + certificate theme ==========
type CourseAdminRow = { id: string; title: string; subject: string; grade_id: number | null; auto_certificate_theme: boolean; certificate_theme: string | null };
type LessonOpt = { id: string; title: string; grade_id: number; subject: string; semester: number };
type CourseLessonOpt = { lesson_id: string; position: number; title: string };

const CERT_THEME_LABELS: Record<string, string> = {
  traditional: "تقليدي إسلامي (ذهبي/زمردي)",
  "modern-tech": "تقني حديث (بنفسجي/أزرق)",
  academic: "أكاديمي كلاسيكي (أزرق ذهبي)",
  nature: "طبيعي أخضر",
};

function CoursesAdminTab() {
  const [courses, setCourses] = useState<CourseAdminRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [allLessons, setAllLessons] = useState<LessonOpt[]>([]);
  const [linked, setLinked] = useState<CourseLessonOpt[]>([]);
  const [filterGrade, setFilterGrade] = useState<number | "">("");
  const [filterSubject, setFilterSubject] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const loadCourses = async () => {
    const { data } = await supabase.from("courses").select("id, title, subject, grade_id, auto_certificate_theme, certificate_theme").order("created_at", { ascending: false });
    setCourses((data as CourseAdminRow[]) || []);
  };
  const loadLessons = async () => {
    const { data } = await supabase.from("lessons").select("id, title, grade_id, subject, semester").order("grade_id").order("subject");
    setAllLessons((data as LessonOpt[]) || []);
  };
  const loadLinked = async (cid: string) => {
    if (!cid) { setLinked([]); return; }
    const { data } = await supabase
      .from("course_lessons")
      .select("lesson_id, position, lessons:lesson_id (title)")
      .eq("course_id", cid)
      .order("position");
    type Row = { lesson_id: string; position: number; lessons: { title: string } | null };
    setLinked(((data as unknown as Row[]) || []).map(r => ({ lesson_id: r.lesson_id, position: r.position, title: r.lessons?.title || "" })));
  };

  useEffect(() => { loadCourses(); loadLessons(); }, []);
  useEffect(() => { loadLinked(selectedId); }, [selectedId]);

  const selectedCourse = courses.find(c => c.id === selectedId);
  const linkedIds = new Set(linked.map(l => l.lesson_id));
  const candidates = allLessons.filter(l =>
    !linkedIds.has(l.id) &&
    (!filterGrade || l.grade_id === filterGrade) &&
    (!filterSubject || l.subject === filterSubject)
  );

  const addLesson = async (lessonId: string) => {
    if (!selectedId) return;
    setBusy(true);
    const nextPos = (linked.at(-1)?.position ?? -1) + 1;
    const { error } = await supabase.from("course_lessons").insert({ course_id: selectedId, lesson_id: lessonId, position: nextPos });
    setBusy(false);
    if (error) return toast.error(error.message);
    loadLinked(selectedId);
  };
  const removeLesson = async (lessonId: string) => {
    setBusy(true);
    const { error } = await supabase.from("course_lessons").delete().eq("course_id", selectedId).eq("lesson_id", lessonId);
    setBusy(false);
    if (error) return toast.error(error.message);
    loadLinked(selectedId);
  };
  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= linked.length) return;
    const a = linked[idx], b = linked[j];
    setBusy(true);
    const { error: e1 } = await supabase.from("course_lessons").update({ position: b.position }).eq("course_id", selectedId).eq("lesson_id", a.lesson_id);
    const { error: e2 } = await supabase.from("course_lessons").update({ position: a.position }).eq("course_id", selectedId).eq("lesson_id", b.lesson_id);
    setBusy(false);
    if (e1 || e2) return toast.error((e1 || e2)!.message);
    loadLinked(selectedId);
  };

  const updateCert = async (patch: Partial<Pick<CourseAdminRow, "auto_certificate_theme" | "certificate_theme">>) => {
    if (!selectedCourse) return;
    setBusy(true);
    const { error } = await supabase.from("courses").update(patch).eq("id", selectedCourse.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
    loadCourses();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gold/30 bg-card p-5 shadow-card">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold"><GraduationCap className="h-5 w-5 text-gold" /> إدارة دروس الكورس وتصميم الشهادة</h2>
        <label className="block text-xs font-bold text-muted-foreground">اختر الكورس</label>
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="">— اختر —</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title} ({c.subject})</option>)}
        </select>
      </div>

      {selectedCourse && (
        <>
          <div className="rounded-2xl border border-gold/30 bg-card p-5 shadow-card">
            <h3 className="mb-3 flex items-center gap-2 text-base font-extrabold"><Award className="h-4 w-4 text-gold" /> تصميم شهادة الإتمام</h3>
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={selectedCourse.auto_certificate_theme} onChange={(e) => updateCert({ auto_certificate_theme: e.target.checked })} className="h-5 w-5 accent-gold" />
              اختيار تلقائي ذكي حسب موضوع الكورس
            </label>
            {!selectedCourse.auto_certificate_theme && (
              <div className="mt-3">
                <label className="block text-xs font-bold text-muted-foreground">اختر تصميمًا يدويًا</label>
                <select
                  value={selectedCourse.certificate_theme || "academic"}
                  onChange={(e) => updateCert({ certificate_theme: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {Object.entries(CERT_THEME_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              عند تفعيل الاختيار التلقائي: تلاوة/قرآن → تقليدي، برمجة/تكنولوجيا → تقني، أحياء/جغرافيا → طبيعي، باقي المواد → أكاديمي.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-gold/30 bg-card p-5 shadow-card">
              <h3 className="mb-3 text-base font-extrabold">دروس الكورس ({linked.length})</h3>
              {linked.length === 0 ? (
                <p className="text-xs text-muted-foreground">لا توجد دروس مرتبطة بعد.</p>
              ) : (
                <ul className="space-y-1">
                  {linked.map((l, i) => (
                    <li key={l.lesson_id} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2 text-xs">
                      <span className="font-bold text-gold">{i + 1}.</span>
                      <span className="min-w-0 flex-1 truncate font-bold">{l.title}</span>
                      <button disabled={busy || i === 0} onClick={() => move(i, -1)} className="rounded p-1 hover:bg-secondary disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button disabled={busy || i === linked.length - 1} onClick={() => move(i, 1)} className="rounded p-1 hover:bg-secondary disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                      <button disabled={busy} onClick={() => removeLesson(l.lesson_id)} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-gold/30 bg-card p-5 shadow-card">
              <h3 className="mb-3 text-base font-extrabold">إضافة دروس من المكتبة</h3>
              <div className="mb-2 grid grid-cols-2 gap-2">
                <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value ? Number(e.target.value) : "")} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
                  <option value="">كل الصفوف</option>
                  {GRADES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
                  <option value="">كل المواد</option>
                  {(filterGrade ? subjectsForGrade(filterGrade) : Array.from(new Set(allLessons.map(l => l.subject)))).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="max-h-[400px] space-y-1 overflow-y-auto">
                {candidates.slice(0, 100).map(l => (
                  <button key={l.id} disabled={busy} onClick={() => addLesson(l.id)} className="flex w-full items-center justify-between rounded-lg border border-border bg-background p-2 text-right text-xs hover:border-gold disabled:opacity-50">
                    <span className="min-w-0 flex-1 truncate">{l.title}</span>
                    <span className="ms-2 text-[10px] text-muted-foreground">{l.subject} · {GRADES.find(g => g.id === l.grade_id)?.name}</span>
                  </button>
                ))}
                {candidates.length === 0 && <p className="text-xs text-muted-foreground">لا توجد دروس متاحة بهذا الفلتر.</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


function StatsTab() {
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, admins: 0 });
  const guests = useVisitorCount();
  const registered = useRegisteredUserCount();

  useEffect(() => {
    (async () => {
      const [reqs, admins] = await Promise.all([
        supabase.from("moderator_requests").select("status"),
        supabase.from("site_admins").select("id", { count: "exact", head: true }),
      ]);
      const items = reqs.data || [];
      setStats({
        total: items.length,
        pending: items.filter((x) => x.status === "pending").length,
        approved: items.filter((x) => x.status === "approved").length,
        rejected: items.filter((x) => x.status === "rejected").length,
        admins: admins.count || 0,
      });
    })();
  }, []);

  const cards = [
    { label: "الطلاب المسجّلون", value: registered, color: "from-emerald-500 to-emerald-700", Icon: UserCircle2 },
    { label: "الزوار الضيوف", value: guests, color: "from-gold to-amber-600", Icon: Ghost },
    { label: "إجمالي الطلبات", value: stats.total, color: "from-blue-500 to-blue-700", Icon: MessageSquare },
    { label: "بانتظار المراجعة", value: stats.pending, color: "from-amber-500 to-amber-700", Icon: MessageSquare },
    { label: "مقبولة", value: stats.approved, color: "from-emerald-500 to-emerald-700", Icon: UserCheck },
    { label: "مرفوضة", value: stats.rejected, color: "from-red-500 to-red-700", Icon: UserX },
    { label: "عدد المشرفين", value: stats.admins, color: "from-purple-500 to-purple-700", Icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="overflow-hidden rounded-2xl border border-gold/30 bg-card p-5 shadow-card">
            <div className={`mb-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br ${c.color} px-3 py-1 text-[11px] font-bold text-white`}>
              <c.Icon className="h-3.5 w-3.5" /> {c.label}
            </div>
            <div className="text-4xl font-extrabold text-gold">{c.value}</div>
          </div>
        ))}
      </div>
      <RegisteredUsersList />
    </div>
  );
}

function RegisteredUsersList() {
  const { users, loading, error, refresh } = useUsersWithRoles();
  const fmt = (s: string | null) =>
    s ? new Date(s).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" }) : "—";

  const onSetRole = async (userId: string, role: "admin" | "teacher" | "student") => {
    const err = await setUserRole(userId, role);
    if (err) return toast.error(err.message);
    toast.success("تم تحديث الدور");
    refresh();
  };

  const roleLabel = (r: string) =>
    r === "admin" ? "مشرف" : r === "teacher" ? "معلم" : "طالب";
  const roleColor = (r: string) =>
    r === "admin" ? "bg-purple-100 text-purple-800 border-purple-300"
    : r === "teacher" ? "bg-blue-100 text-blue-800 border-blue-300"
    : "bg-emerald-100 text-emerald-800 border-emerald-300";

  return (
    <div className="overflow-hidden rounded-2xl border border-gold/30 bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-gold/20 bg-gradient-royal px-5 py-3 text-gold">
        <div className="flex items-center gap-2 text-sm font-extrabold">
          <UserCircle2 className="h-4 w-4" /> المستخدمون والأدوار ({users.length})
        </div>
        <button onClick={refresh} className="rounded-md border border-gold/40 px-3 py-1 text-xs font-bold hover:bg-gold/10">
          تحديث
        </button>
      </div>
      {error && <div className="p-4 text-sm text-destructive">تعذّر التحميل: {error}</div>}
      {loading ? (
        <div className="p-6 text-center text-sm text-muted-foreground">جارٍ التحميل...</div>
      ) : users.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">لا يوجد مستخدمون بعد.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-secondary/60 text-xs font-bold text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">البريد</th>
                <th className="px-4 py-2.5">الدور الحالي</th>
                <th className="px-4 py-2.5">التسجيل</th>
                <th className="px-4 py-2.5">آخر دخول</th>
                <th className="px-4 py-2.5">تعيين دور</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border/60 hover:bg-secondary/30">
                  <td className="px-4 py-2.5 font-semibold">{u.email}</td>
                  <td className="px-4 py-2.5">
                    {u.roles.length === 0 ? (
                      <span className="text-xs text-muted-foreground">— لا يوجد</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <span key={r} className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${roleColor(r)}`}>{roleLabel(r)}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmt(u.created_at)}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmt(u.last_sign_in_at)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      {(["student", "teacher", "admin"] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => onSetRole(u.id, r)}
                          className="rounded-md border border-gold/40 px-2 py-1 text-[11px] font-bold hover:bg-gold/10"
                          title={`تعيين كـ ${roleLabel(r)}`}
                        >
                          {roleLabel(r)}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ModsTab() {
  const [items, setItems] = useState<ModRow[]>([]);
  const [busy, setBusy] = useState(true);

  const refresh = async () => {
    setBusy(true);
    const { data, error } = await supabase.from("moderator_requests").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as ModRow[]) || []);
    setBusy(false);
  };

  useEffect(() => { refresh(); }, []);

  const setStatus = async (row: ModRow, status: "approved" | "rejected") => {
    const { error } = await supabase.from("moderator_requests").update({ status }).eq("id", row.id);
    if (error) return toast.error(error.message);
    if (status === "approved") {
      await supabase.from("site_admins").insert({ email: row.email, role: "moderator" });
    }
    toast.success(status === "approved" ? "تمت الموافقة" : "تم الرفض");
    refresh();
  };

  const remove = async (id: number) => {
    const { error } = await supabase.from("moderator_requests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("حُذف الطلب");
    refresh();
  };

  if (busy) return <div className="p-8 text-center text-sm text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="border-b border-border bg-secondary px-4 py-3 text-sm font-bold">{items.length} طلب</div>
      <ul className="divide-y divide-border">
        {items.map((r) => (
          <li key={r.id} className="flex flex-wrap items-start gap-3 p-4">
            <div className="min-w-[200px] flex-1">
              <div className="font-extrabold">{r.full_name} <span className="text-xs font-normal text-muted-foreground">— {r.email}</span></div>
              {r.goal && <p className="mt-1 text-sm text-muted-foreground"><span className="font-bold">الهدف:</span> {r.goal}</p>}
              <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-[11px] font-bold ${
                r.status === "pending" ? "bg-amber-500/20 text-amber-700" :
                r.status === "approved" ? "bg-emerald-500/20 text-emerald-700" :
                "bg-destructive/20 text-destructive"
              }`}>
                {r.status === "pending" ? "بانتظار المراجعة" : r.status === "approved" ? "مقبول" : "مرفوض"}
              </span>
            </div>
            <div className="flex gap-2">
              {r.status === "pending" && (
                <>
                  <button onClick={() => setStatus(r, "approved")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"><UserCheck className="h-3.5 w-3.5" /> قبول</button>
                  <button onClick={() => setStatus(r, "rejected")} className="inline-flex items-center gap-1 rounded-lg bg-destructive px-3 py-1.5 text-xs font-bold text-white"><UserX className="h-3.5 w-3.5" /> رفض</button>
                </>
              )}
              <button onClick={() => remove(r.id)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="p-8 text-center text-sm text-muted-foreground">لا توجد طلبات بعد.</li>}
      </ul>
    </div>
  );
}

function ListEditor({
  title, icon, helpText, loadKey, saveLabel, placeholder,
}: {
  title: string; icon: React.ReactNode; helpText: string;
  loadKey: "quotes" | "quranic_verses"; saveLabel: string; placeholder: string;
}) {
  const [items, setItems] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", loadKey).maybeSingle().then(({ data }) => {
      const arr = Array.isArray(data?.value) ? (data.value as string[]) : [];
      setItems(arr);
      setText(arr.join("\n"));
    });
  }, [loadKey]);

  const save = async () => {
    const next = text.split("\n").map((s) => s.trim()).filter(Boolean);
    setBusy(true);
    const { error } = await supabase.from("site_settings").upsert({ key: loadKey, value: next as unknown as never, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) return toast.error(error.message);
    setItems(next);
    toast.success(saveLabel);
  };

  return (
    <div className="rounded-2xl border border-gold/30 bg-card p-5 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold">{icon} {title}</h2>
      <p className="mb-3 text-xs text-muted-foreground">{helpText}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium"
        dir="rtl"
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{items.length} عنصر مفعّل</span>
        <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-bold shadow-gold disabled:opacity-60" style={{ color: "var(--royal-deep)" }}>
          <Save className="h-4 w-4" /> {busy ? "جارٍ الحفظ..." : "حفظ"}
        </button>
      </div>
    </div>
  );
}

function QuotesTab() {
  return (
    <ListEditor
      title="الاقتباسات الملهمة"
      icon={<QuoteIcon className="h-5 w-5 text-gold" />}
      helpText="اقتباس واحد في كل سطر. تظهر في القسم التحفيزي وفي الشريط المتحرك أسفل الموقع."
      loadKey="quotes"
      saveLabel="تم حفظ الاقتباسات"
      placeholder="مثال: العلمُ نورٌ والجهلُ ظلام"
    />
  );
}

function QuranTab() {
  return (
    <ListEditor
      title="الآيات القرآنية"
      icon={<BookOpen className="h-5 w-5 text-gold" />}
      helpText="آية واحدة في كل سطر. تُعرض في أعلى الصفحة الرئيسية بشكل دوّار."
      loadKey="quranic_verses"
      saveLabel="تم حفظ الآيات"
      placeholder="مثال: وَقُل رَّبِّ زِدْنِي عِلْمًا"
    />
  );
}

function SettingsTab() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-card">
      لإدارة الدروس والقنوات وأوراق العمل، استخدم
      <Link to="/admin" className="mx-1 font-bold text-primary underline">قسم إدارة المحتوى</Link>.
    </div>
  );
}

function FeaturesTab() {
  const { value, refresh } = useFeatureToggles();
  const [local, setLocal] = useState<FeatureToggles>(DEFAULT_TOGGLES);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setLocal(value); }, [value]);
  const labels: Record<keyof FeatureToggles, string> = {
    ai_exam: "الاختبارات الذكية", ai_tutor: "المساعد الذكي", summaries: "الملخّصات",
    worksheets: "أوراق العمل", channels: "القنوات", courses: "الكورسات", gpa: "حساب المعدل",
  };
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("site_settings").upsert({ key: "feature_toggles", value: local as unknown as never, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ إعدادات الميزات");
    refresh();
  };
  return (
    <div className="rounded-2xl border border-gold/30 bg-card p-5 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold"><Sparkles className="h-5 w-5 text-gold" /> تفعيل/تعطيل الميزات</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {(Object.keys(labels) as Array<keyof FeatureToggles>).map((k) => (
          <label key={k} className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-sm">
            <span className="font-bold">{labels[k]}</span>
            <input type="checkbox" checked={!!local[k]} onChange={(e) => setLocal({ ...local, [k]: e.target.checked })} className="h-5 w-5 accent-gold" />
          </label>
        ))}
      </div>
      <button onClick={save} disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-bold shadow-gold disabled:opacity-60" style={{ color: "var(--royal-deep)" }}>
        <Save className="h-4 w-4" /> {busy ? "جارٍ الحفظ..." : "حفظ"}
      </button>
    </div>
  );
}

function BrandTab() {
  const { value, refresh } = useBrand();
  const [local, setLocal] = useState<BrandSettings>(DEFAULT_BRAND);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setLocal(value); }, [value]);
  const fields: Array<[keyof BrandSettings, string]> = [
    ["name", "اسم المنصة"], ["logo_url", "رابط الشعار"], ["jerusalem_icon_url", "رابط أيقونة القدس"],
    ["contact_email", "البريد الإلكتروني"], ["contact_phone", "الهاتف"],
    ["whatsapp", "رابط واتساب"], ["facebook", "رابط فيسبوك"],
  ];
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("site_settings").upsert({ key: "brand", value: local as unknown as never, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ بيانات العلامة");
    refresh();
  };
  return (
    <div className="rounded-2xl border border-gold/30 bg-card p-5 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold"><PaintBucket className="h-5 w-5 text-gold" /> العلامة والتواصل</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(([k, label]) => (
          <label key={k} className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">{label}</span>
            <input value={local[k] ?? ""} onChange={(e) => setLocal({ ...local, [k]: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
        ))}
      </div>
      <button onClick={save} disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-bold shadow-gold disabled:opacity-60" style={{ color: "var(--royal-deep)" }}>
        <Save className="h-4 w-4" /> {busy ? "جارٍ الحفظ..." : "حفظ"}
      </button>
    </div>
  );
}

/* ============================================================
 * Subjects Admin Tab — add/remove custom subjects per grade
 * ============================================================ */
function SubjectsAdminTab() {
  const { items, loading, add, remove, subjectsForGrade } = useCustomSubjects();
  const [grade, setGrade] = useState<number>(1);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    setBusy(true);
    const r = await add(grade, name);
    setBusy(false);
    if (r.error) { toast.error(r.error); return; }
    toast.success("تمت إضافة المادة");
    setName("");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gold/30 bg-card p-5 shadow-card">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-extrabold">
          <BookOpen className="h-5 w-5 text-gold" /> إدارة المواد الدراسية
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          أضف مواد إضافية إلى أي صف بحسب المنهاج الفلسطيني. تظهر المواد المضافة في كل القوائم تلقائياً.
        </p>

        <div className="grid gap-2 md:grid-cols-[180px_1fr_auto]">
          <select
            value={grade}
            onChange={(e) => setGrade(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {GRADES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم المادة (مثال: التربية الفنية الاختيارية)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          />
          <button
            onClick={handleAdd}
            disabled={busy || !name.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-gold px-4 py-2 text-sm font-bold shadow-gold disabled:opacity-50"
            style={{ color: "var(--royal-deep)" }}
          >
            <Save className="h-4 w-4" /> إضافة
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="mb-3 text-sm font-extrabold">مواد الصف {GRADES.find((g) => g.id === grade)?.name}</h3>
        <div className="flex flex-wrap gap-2">
          {subjectsForGrade(grade).map((s) => {
            const custom = items.find((i) => i.grade_id === grade && i.name === s);
            return (
              <span key={s} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                custom ? "border-gold/50 bg-gold/10" : "border-border bg-secondary"
              }`}>
                {s}
                {custom && (
                  <button
                    onClick={async () => {
                      const r = await remove(custom.id);
                      if (r.error) toast.error(r.error); else toast.success("تم الحذف");
                    }}
                    className="rounded-full p-0.5 text-destructive hover:bg-destructive/10"
                    title="حذف"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
                {!custom && <span className="text-[10px] text-muted-foreground">(افتراضية)</span>}
              </span>
            );
          })}
        </div>
        {loading && <div className="mt-3 text-xs text-muted-foreground">جارٍ التحميل...</div>}
        <p className="mt-3 text-[11px] text-muted-foreground">
          المواد الافتراضية للمنهاج الفلسطيني لا يمكن حذفها — لكن يمكنك إضافة مواد جديدة كما تشاء.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="mb-3 text-sm font-extrabold">جميع المواد المضافة ({items.length})</h3>
        {items.length === 0 ? (
          <div className="text-xs text-muted-foreground">لا توجد مواد مضافة بعد.</div>
        ) : (
          <div className="space-y-1">
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs">
                <span>
                  <span className="font-bold">{it.name}</span>
                  <span className="me-2 text-muted-foreground"> · {GRADES.find((g) => g.id === it.grade_id)?.name}</span>
                </span>
                <button
                  onClick={async () => {
                    const r = await remove(it.id);
                    if (r.error) toast.error(r.error); else toast.success("تم الحذف");
                  }}
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


type LibraryBookRow = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  category: "textbook" | "reading";
  grade_id: number | null;
  subject: string | null;
  pdf_url: string;
  cover_url: string | null;
};

function LibraryAdminTab() {
  const [items, setItems] = useState<LibraryBookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{
    title: string; author: string; description: string;
    category: "textbook" | "reading"; grade_id: number | "";
    subject: string; pdf_url: string; cover_url: string;
  }>({ title: "", author: "", description: "", category: "textbook", grade_id: "", subject: "", pdf_url: "", cover_url: "" });

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("library_books" as never)
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as LibraryBookRow[]) || []);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const submit = async () => {
    if (!form.title.trim() || !form.pdf_url.trim()) { toast.error("العنوان ورابط PDF مطلوبان"); return; }
    setBusy(true);
    const payload = {
      title: form.title.trim(),
      author: form.author.trim() || null,
      description: form.description.trim() || null,
      category: form.category,
      grade_id: form.grade_id === "" ? null : Number(form.grade_id),
      subject: form.subject.trim() || null,
      pdf_url: form.pdf_url.trim(),
      cover_url: form.cover_url.trim() || null,
    };
    const { error } = await supabase.from("library_books" as never).insert(payload as never);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة الكتاب");
    setForm({ title: "", author: "", description: "", category: form.category, grade_id: "", subject: "", pdf_url: "", cover_url: "" });
    refresh();
  };

  const removeBook = async (id: string) => {
    if (!confirm("حذف الكتاب نهائياً؟")) return;
    const { error } = await supabase.from("library_books" as never).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    setItems((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gold/30 bg-card p-5 shadow-card">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-extrabold">
          <BookOpen className="h-5 w-5 text-gold" /> إضافة كتاب جديد
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          الكتب المدرسية تظهر في قسم «الكتب المدرسية» ومُصنّفة حسب الصف. كتب القراءة تظهر في قسم «مكتبة القراءة».
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان الكتاب *" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="المؤلف (اختياري)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as "textbook" | "reading" })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="textbook">كتاب مدرسي</option>
            <option value="reading">كتاب قراءة / رواية / قصة</option>
          </select>
          <select value={form.grade_id} onChange={(e) => setForm({ ...form, grade_id: e.target.value === "" ? "" : Number(e.target.value) })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">— الصف (للكتب المدرسية) —</option>
            {GRADES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="المادة (اختياري للكتب المدرسية)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="رابط صورة الغلاف (اختياري)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={form.pdf_url} onChange={(e) => setForm({ ...form, pdf_url: e.target.value })} placeholder="رابط ملف PDF *" className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف الكتاب (اختياري)" rows={3} className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2" />
        </div>
        <button onClick={submit} disabled={busy} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-gold px-4 py-2 text-sm font-bold shadow-gold disabled:opacity-50" style={{ color: "var(--royal-deep)" }}>
          <Save className="h-4 w-4" /> {busy ? "جارٍ الحفظ..." : "إضافة الكتاب"}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="mb-3 text-sm font-extrabold">جميع الكتب ({items.length})</h3>
        {loading ? (
          <div className="text-xs text-muted-foreground">جارٍ التحميل...</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-muted-foreground">لا توجد كتب بعد.</div>
        ) : (
          <div className="space-y-1.5">
            {items.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{b.title}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {b.category === "textbook" ? "مدرسي" : "قراءة"}
                    {b.grade_id ? ` · ${GRADES.find((g) => g.id === b.grade_id)?.name}` : ""}
                    {b.subject ? ` · ${b.subject}` : ""}
                  </div>
                </div>
                <a href={b.pdf_url} target="_blank" rel="noopener noreferrer" className="me-2 rounded px-2 py-1 text-[10px] font-bold text-primary hover:bg-secondary">فتح</a>
                <button onClick={() => removeBook(b.id)} className="rounded p-1 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** ===================== Store Admin (CRUD store_items) ===================== */
type StoreItem = {
  id: string;
  title: string;
  description: string | null;
  kind: "avatar" | "wallpaper" | "book" | "badge";
  image_url: string | null;
  payload_url: string | null;
  price: number;
  active: boolean;
  created_at?: string;
};

const emptyItem: Omit<StoreItem, "id" | "created_at"> = {
  title: "", description: "", kind: "avatar", image_url: "", payload_url: "", price: 50, active: true,
};

function StoreAdminTab() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof emptyItem>(emptyItem);
  const [editing, setEditing] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"image" | "payload" | null>(null);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | StoreItem["kind"]>("all");

  /** Uploads to the private "store" bucket and stores a long-lived signed URL. */
  const uploadFile = async (file: File, field: "image" | "payload") => {
    const maxMb = field === "image" ? 5 : 25;
    if (file.size > maxMb * 1024 * 1024) { toast.error(`الحجم الأقصى ${maxMb}MB`); return; }
    const okType = field === "image" ? file.type.startsWith("image/") : file.type === "application/pdf";
    if (!okType) { toast.error(field === "image" ? "الرجاء اختيار صورة JPG/PNG" : "الرجاء اختيار ملف PDF"); return; }
    setUploading(field);
    try {
      const ext = (file.name.split(".").pop() || (field === "image" ? "jpg" : "pdf")).toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${field}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("store").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: signed, error: sErr } = await supabase.storage.from("store").createSignedUrl(path, 60 * 60 * 24 * 3650);
      if (sErr || !signed?.signedUrl) throw sErr || new Error("تعذّر إنشاء الرابط");
      setForm((f) => field === "image" ? { ...f, image_url: signed.signedUrl } : { ...f, payload_url: signed.signedUrl });
      toast.success("تم رفع الملف");
    } catch (e) {
      toast.error((e as Error).message || "فشل الرفع");
    } finally { setUploading(null); }
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("store_items" as never).select("*").order("created_at", { ascending: false });
    setItems((data as never as StoreItem[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title.trim()) { toast.error("العنوان مطلوب"); return; }
    if (form.price < 0) { toast.error("السعر غير صالح"); return; }
    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || null,
      kind: form.kind,
      image_url: form.image_url?.trim() || null,
      payload_url: form.payload_url?.trim() || null,
      price: Math.floor(form.price),
      active: form.active,
    };
    if (editing) {
      const { error } = await supabase.from("store_items" as never).update(payload as never).eq("id", editing);
      if (error) { toast.error(error.message); return; }
      toast.success("تم التحديث");
    } else {
      const { error } = await supabase.from("store_items" as never).insert(payload as never);
      if (error) { toast.error(error.message); return; }
      toast.success("تمت الإضافة");
    }
    setForm(emptyItem); setEditing(null); load();
  };

  const edit = (it: StoreItem) => {
    setEditing(it.id);
    setForm({
      title: it.title, description: it.description || "", kind: it.kind,
      image_url: it.image_url || "", payload_url: it.payload_url || "",
      price: it.price, active: it.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا العنصر؟")) return;
    const { error } = await supabase.from("store_items" as never).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف"); load();
  };

  const toggleActive = async (it: StoreItem) => {
    const { error } = await supabase.from("store_items" as never).update({ active: !it.active } as never).eq("id", it.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl p-5">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-extrabold">
          <Plus className="h-5 w-5 text-gold" /> {editing ? "تعديل عنصر" : "إضافة عنصر متجر"}
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-bold">
            العنوان
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="مثال: أفاتار ذهبي" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold">
            النوع
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as StoreItem["kind"] })}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="avatar">أفاتار</option>
              <option value="wallpaper">خلفية</option>
              <option value="book">كتاب حصري</option>
              <option value="badge">شارة</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold md:col-span-2">
            الوصف
            <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="min-h-[70px] rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold">
            صورة المنتج (JPG/PNG)
            <input type="file" accept="image/png,image/jpeg,image/webp"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f, "image"); e.target.value = ""; }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs" />
            {uploading === "image" && <span className="text-[11px] text-muted-foreground">جارٍ الرفع...</span>}
            {form.image_url && (
              <span className="mt-1 flex items-center gap-2">
                <img src={form.image_url} alt="معاينة" className="h-16 w-16 rounded-lg object-cover" />
                <button type="button" onClick={() => setForm({ ...form, image_url: "" })} className="text-[11px] font-bold text-destructive">إزالة</button>
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold">
            ملف المحتوى (PDF — للمكافآت الرقمية)
            <input type="file" accept="application/pdf"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f, "payload"); e.target.value = ""; }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs" />
            {uploading === "payload" && <span className="text-[11px] text-muted-foreground">جارٍ الرفع...</span>}
            {form.payload_url && (
              <span className="mt-1 flex items-center gap-2 text-[11px]">
                <span className="truncate text-emerald-700">تم إرفاق ملف PDF</span>
                <button type="button" onClick={() => setForm({ ...form, payload_url: "" })} className="font-bold text-destructive">إزالة</button>
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold">
            السعر (نقاط)
            <input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="flex items-center gap-2 text-xs font-bold">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            نشط ومعروض في المتجر
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-gradient-gold px-5 py-2 text-sm font-bold shadow-gold" style={{ color: "var(--royal-deep)" }}>
            <Save className="h-4 w-4" /> {editing ? "حفظ التعديلات" : "إضافة"}
          </button>
          {editing && (
            <button onClick={() => { setEditing(null); setForm(emptyItem); }} className="rounded-lg border border-border px-4 py-2 text-sm font-bold">
              إلغاء
            </button>
          )}
        </div>
      </section>

      <section className="glass rounded-2xl p-5">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-extrabold">
          <ShoppingBag className="h-5 w-5 text-gold" /> عناصر المتجر ({items.length})
        </h3>
        <div className="mb-4 flex flex-wrap gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث بالاسم..."
            className="min-w-[180px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="all">كل الأقسام</option>
            <option value="avatar">أفاتار</option>
            <option value="wallpaper">خلفية</option>
            <option value="book">كتاب حصري</option>
            <option value="badge">شارة</option>
          </select>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد عناصر بعد. أضف أول عنصر من الأعلى.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {items
              .filter((it) => (kindFilter === "all" || it.kind === kindFilter) && it.title.toLowerCase().includes(query.trim().toLowerCase()))
              .map((it) => (
              <div key={it.id} className="flex gap-3 rounded-xl border border-border bg-card p-3">
                {it.image_url ? (
                  <img src={it.image_url} alt={it.title} loading="lazy" className="h-20 w-20 flex-none rounded-lg object-cover" />
                ) : (
                  <div className="grid h-20 w-20 flex-none place-items-center rounded-lg bg-gradient-royal text-gold">
                    <ShoppingBag className="h-8 w-8" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-extrabold">{it.title}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{it.kind} • {it.price} نقطة</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${it.active ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {it.active ? "نشط" : "معطّل"}
                    </span>
                  </div>
                  {it.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{it.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button onClick={() => edit(it)} className="rounded-md border border-border px-2 py-1 text-[11px] font-bold hover:border-gold">تعديل</button>
                    <button onClick={() => toggleActive(it)} className="rounded-md border border-border px-2 py-1 text-[11px] font-bold hover:border-gold">
                      {it.active ? "تعطيل" : "تفعيل"}
                    </button>
                    <button onClick={() => remove(it.id)} className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3 w-3" /> حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
