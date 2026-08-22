import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useWorksheets, useChannels, useLessons, useSummaries, useCourses, useQuotes, type WorksheetLink, type ChannelLink, type Lesson, type Summary, type Course } from "@/lib/storage";
import { GRADES, subjectsForGrade } from "@/lib/curriculum";
import { Trash2, Plus, ShieldCheck, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAuthUser, signOut } from "@/lib/use-auth";
import { WorksheetUploadField, SmartImporter } from "@/components/admin-lesson-tools";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "إدارة المحتوى — المنارة" }, { name: "robots", content: "noindex" }] }),
});

function AdminPage() {
  const { user, loading, isSuperAdmin } = useAuthUser();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);
  if (loading || !user) return null;
  if (!isSuperAdmin) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <h1 className="text-2xl font-extrabold">غير مصرّح</h1>
        <p className="mt-2 text-sm text-muted-foreground">إدارة المحتوى متاحة للمسؤول الأعلى فقط.</p>
        <Link to="/" className="mt-6 inline-block rounded-xl bg-gradient-royal px-5 py-2.5 text-sm font-bold text-gold">العودة</Link>
      </div>
    );
  }
  return <Dashboard />;
}

function Dashboard() {
  const ws = useWorksheets();
  const ch = useChannels();
  const ls = useLessons();
  const sm = useSummaries();
  const co = useCourses();
  const qu = useQuotes();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"lessons" | "ws" | "ch" | "sm" | "co" | "qu">("lessons");

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold"><ShieldCheck className="h-7 w-7 text-gold" /> إدارة المحتوى</h1>
          <p className="text-sm text-muted-foreground">الدروس والفيديوهات وأوراق العمل والقنوات</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin-panel" className="rounded-xl bg-gradient-royal px-4 py-2 text-sm font-bold text-gold">لوحة الإدارة الرئيسية</Link>
          <button onClick={async () => { await signOut(); toast.success("تم تسجيل الخروج"); navigate({ to: "/" }); }} className="rounded-xl border border-border px-4 py-2 text-sm font-bold hover:border-destructive hover:text-destructive">
            تسجيل الخروج
          </button>
        </div>
      </header>

      <div className="mb-6 inline-flex flex-wrap rounded-xl border border-border bg-card p-1 shadow-card">
        {([
          ["lessons", "الدروس والفيديوهات"],
          ["ws", "أوراق العمل"],
          ["sm", "الملخصات"],
          ["co", "الكورسات"],
          ["ch", "القنوات التعليمية"],
          ["qu", "الاقتباسات"],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === t ? "bg-gradient-royal text-gold" : "text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "lessons" && <LessonsAdmin {...ls} />}
      {tab === "ws" && <WorksheetsAdmin {...ws} />}
      {tab === "ch" && <ChannelsAdmin {...ch} />}
      {tab === "sm" && <SummariesAdmin {...sm} />}
      {tab === "co" && <CoursesAdmin {...co} />}
      {tab === "qu" && <QuotesAdmin {...qu} />}
    </div>
  );
}

function LessonsAdmin({ items, save }: ReturnType<typeof useLessons>) {
  const [gradeId, setGradeId] = useState<number>(1);
  const [subject, setSubject] = useState<string>(subjectsForGrade(1)[0]);
  const [sem, setSem] = useState<1 | 2>(1);
  const subjects = subjectsForGrade(gradeId);

  useEffect(() => {
    if (!subjects.includes(subject)) setSubject(subjects[0]);
  }, [gradeId, subject, subjects]);

  const filtered = useMemo(
    () => items.filter((x) => x.gradeId === gradeId && x.subject === subject && x.semester === sem),
    [items, gradeId, subject, sem]
  );

  const [form, setForm] = useState<{ title: string; description: string; videoUrl: string; worksheetUrl?: string; worksheetName?: string }>({ title: "", description: "", videoUrl: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Lesson | null>(null);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gold/30 bg-card p-5 shadow-card">
        <div className="grid gap-3 md:grid-cols-3">
          <select value={gradeId} onChange={(e) => setGradeId(Number(e.target.value))} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {GRADES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={sem} onChange={(e) => setSem(Number(e.target.value) as 1 | 2)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value={1}>الفصل الأول</option>
            <option value={2}>الفصل الثاني</option>
          </select>
        </div>
      </div>

      <SmartImporter gradeId={gradeId} subject={subject} semester={sem} existing={items} save={save} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title.trim()) return toast.error("عنوان الدرس مطلوب");
          const newLesson: Lesson = {
            id: crypto.randomUUID(),
            gradeId, subject, semester: sem,
            title: form.title.trim(),
            description: form.description.trim() || `شرح درس ${form.title}`,
            videoUrl: form.videoUrl.trim() || `https://www.youtube.com/results?search_query=${encodeURIComponent(form.title)}`,
            worksheetUrl: form.worksheetUrl,
            worksheetName: form.worksheetName,
          };
          save([newLesson, ...items]);
          setForm({ title: "", description: "", videoUrl: "" });
          toast.success("تمت إضافة الدرس");
        }}
        className="rounded-2xl border border-gold/30 bg-card p-5 shadow-card"
      >
        <h2 className="mb-4 flex items-center gap-2 font-extrabold"><Plus className="h-4 w-4 text-gold" /> إضافة درس جديد</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان الدرس" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="رابط فيديو يوتيوب (اختياري)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="شرح الدرس / الوصف" rows={3} className="md:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <div className="md:col-span-2">
            <WorksheetUploadField
              value={form.worksheetUrl}
              name={form.worksheetName}
              onChange={(v) => setForm({ ...form, worksheetUrl: v?.url, worksheetName: v?.name })}
            />
          </div>
        </div>
        <button className="mt-4 rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-bold shadow-gold" style={{ color: "var(--royal-deep)" }}>إضافة</button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border bg-secondary px-4 py-3 text-sm font-bold">
          {filtered.length} درس · {GRADES.find((g) => g.id === gradeId)?.name} · {subject} · الفصل {sem === 1 ? "الأول" : "الثاني"}
        </div>
        <ul className="divide-y divide-border">
          {filtered.map((les) => {
            const isEditing = editingId === les.id && editForm;
            return (
              <li key={les.id} className="p-4">
                {isEditing && editForm ? (
                  <div className="space-y-2">
                    <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                    <input value={editForm.videoUrl} onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="رابط الفيديو" />
                    <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                    <WorksheetUploadField
                      value={editForm.worksheetUrl}
                      name={editForm.worksheetName}
                      onChange={(v) => setEditForm({ ...editForm, worksheetUrl: v?.url, worksheetName: v?.name })}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => { save(items.map((x) => x.id === editForm.id ? editForm : x)); setEditingId(null); setEditForm(null); toast.success("تم الحفظ"); }} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"><Check className="h-3.5 w-3.5" /> حفظ</button>
                      <button onClick={() => { setEditingId(null); setEditForm(null); }} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold"><X className="h-3.5 w-3.5" /> إلغاء</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="font-extrabold">{les.title}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{les.description}</div>
                      <a href={les.videoUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] text-primary underline">{les.videoUrl}</a>
                      {les.worksheetUrl && (
                        <a href={les.worksheetUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-gold underline">📎 {les.worksheetName || "ورقة عمل"}</a>
                      )}
                    </div>
                    <button onClick={() => { setEditingId(les.id); setEditForm(les); }} className="rounded-lg p-2 text-primary hover:bg-primary/10"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => { save(items.filter((x) => x.id !== les.id)); toast.success("حُذف الدرس"); }} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
              </li>
            );
          })}
          {filtered.length === 0 && <li className="p-8 text-center text-sm text-muted-foreground">لا توجد دروس — أضف أوّل درس بالأعلى.</li>}
        </ul>
      </div>
    </div>
  );
}

function WorksheetsAdmin({ items, save }: ReturnType<typeof useWorksheets>) {
  const [form, setForm] = useState<Omit<WorksheetLink, "id">>({ gradeId: 1, subject: "", title: "", url: "", source: "" });
  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title || !form.url || !form.subject) return toast.error("املأ جميع الحقول الأساسية");
          save([{ id: crypto.randomUUID(), ...form }, ...items]);
          setForm({ gradeId: form.gradeId, subject: "", title: "", url: "", source: "" });
          toast.success("تمت الإضافة");
        }}
        className="rounded-2xl border border-gold/30 bg-card p-5 shadow-card"
      >
        <h2 className="mb-4 flex items-center gap-2 font-extrabold"><Plus className="h-4 w-4 text-gold" /> إضافة ورقة عمل</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <select value={form.gradeId} onChange={(e) => setForm({ ...form, gradeId: Number(e.target.value) })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {GRADES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="المادة" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان الورقة" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={form.source ?? ""} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="المصدر (اختياري)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <div className="md:col-span-2">
            <WorksheetUploadField
              value={form.url || undefined}
              name={form.title}
              onChange={(v) => {
                if (v) setForm({ ...form, url: v.url, title: form.title || v.name, source: form.source || "رفع مباشر" });
                else setForm({ ...form, url: "" });
              }}
            />
          </div>
        </div>
        <button className="mt-4 rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-bold shadow-gold" style={{ color: "var(--royal-deep)" }}>إضافة</button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-right text-sm">
          <thead className="bg-secondary text-xs uppercase">
            <tr><th className="p-3">الصف</th><th className="p-3">المادة</th><th className="p-3">العنوان</th><th className="p-3">المصدر</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {items.map((w) => (
              <tr key={w.id} className="border-t border-border">
                <td className="p-3 font-bold">{GRADES.find((g) => g.id === w.gradeId)?.name}</td>
                <td className="p-3">{w.subject}</td>
                <td className="p-3"><a href={w.url} target="_blank" rel="noreferrer" className="text-primary underline">{w.title}</a></td>
                <td className="p-3 text-muted-foreground">{w.source}</td>
                <td className="p-3"><button onClick={() => { save(items.filter((x) => x.id !== w.id)); toast.success("حُذفت"); }} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">لا يوجد بيانات</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChannelsAdmin({ items, save }: ReturnType<typeof useChannels>) {
  const [form, setForm] = useState<Omit<ChannelLink, "id">>({ subject: "", name: "", url: "", provider: "Rawafed" });
  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name || !form.url || !form.subject) return toast.error("املأ جميع الحقول الأساسية");
          save([{ id: crypto.randomUUID(), ...form }, ...items]);
          setForm({ subject: "", name: "", url: "", provider: "Rawafed" });
          toast.success("تمت الإضافة");
        }}
        className="rounded-2xl border border-gold/30 bg-card p-5 shadow-card"
      >
        <h2 className="mb-4 flex items-center gap-2 font-extrabold"><Plus className="h-4 w-4 text-gold" /> إضافة قناة</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="المادة" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم القناة" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value as ChannelLink["provider"] })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="Rawafed">روافد</option>
            <option value="Palestine Educational Portal">البوابة الفلسطينية</option>
            <option value="YouTube">يوتيوب</option>
            <option value="Other">أخرى</option>
          </select>
          <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="رابط القناة" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <button className="mt-4 rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-bold shadow-gold" style={{ color: "var(--royal-deep)" }}>إضافة</button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-right text-sm">
          <thead className="bg-secondary text-xs uppercase">
            <tr><th className="p-3">المادة</th><th className="p-3">القناة</th><th className="p-3">المزوّد</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-bold">{c.subject}</td>
                <td className="p-3"><a href={c.url} target="_blank" rel="noreferrer" className="text-primary underline">{c.name}</a></td>
                <td className="p-3 text-muted-foreground">{c.provider}</td>
                <td className="p-3"><button onClick={() => { save(items.filter((x) => x.id !== c.id)); toast.success("حُذفت"); }} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">لا يوجد بيانات</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Summaries Admin ----------
function SummariesAdmin({ items, save }: ReturnType<typeof useSummaries>) {
  const [form, setForm] = useState<Omit<Summary, "id">>({ gradeId: 1, subject: "", title: "", content: "", fileUrl: "", thumbnailUrl: "" });
  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title || !form.subject) return toast.error("العنوان والمادة مطلوبان");
          save([{ id: crypto.randomUUID(), ...form }, ...items]);
          setForm({ gradeId: form.gradeId, subject: "", title: "", content: "", fileUrl: "", thumbnailUrl: "" });
          toast.success("تمت إضافة الملخص");
        }}
        className="rounded-2xl border border-gold/30 bg-card p-5 shadow-card"
      >
        <h2 className="mb-4 flex items-center gap-2 font-extrabold"><Plus className="h-4 w-4 text-gold" /> إضافة ملخص جديد</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <select value={form.gradeId} onChange={(e) => setForm({ ...form, gradeId: Number(e.target.value) })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {GRADES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">— اختر المادة —</option>
            {subjectsForGrade(form.gradeId).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان الملخص" className="md:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="نص الملخص (Markdown مدعوم)" rows={5} className="md:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">الصورة المصغرة (اختياري)</label>
            <WorksheetUploadField value={form.thumbnailUrl || undefined} name="غلاف" onChange={(v) => setForm({ ...form, thumbnailUrl: v?.url || "" })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">ملف PDF (اختياري)</label>
            <WorksheetUploadField value={form.fileUrl || undefined} name={form.title} onChange={(v) => setForm({ ...form, fileUrl: v?.url || "" })} />
          </div>
        </div>
        <button className="mt-4 rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-bold shadow-gold" style={{ color: "var(--royal-deep)" }}>إضافة</button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <div key={s.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            {s.thumbnailUrl && <img src={s.thumbnailUrl} alt={s.title} className="h-32 w-full object-cover" />}
            <div className="p-4">
              <div className="text-[11px] font-bold text-muted-foreground">{GRADES.find((g) => g.id === s.gradeId)?.name} · {s.subject}</div>
              <h3 className="mt-1 font-extrabold">{s.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.content}</p>
              <div className="mt-3 flex items-center justify-between">
                {s.fileUrl ? <a href={s.fileUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary underline">عرض الملف</a> : <span className="text-xs text-muted-foreground">بدون ملف</span>}
                <button onClick={() => { save(items.filter((x) => x.id !== s.id)); toast.success("حُذف"); }} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">لا توجد ملخصات بعد</div>}
      </div>
    </div>
  );
}

// ---------- Courses Admin ----------
function CoursesAdmin({ items, save }: ReturnType<typeof useCourses>) {
  const [form, setForm] = useState<Omit<Course, "id">>({ title: "", description: "", subject: "", gradeId: undefined, videoUrl: "", thumbnailUrl: "" });
  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title || !form.subject) return toast.error("العنوان والمادة مطلوبان");
          save([{ id: crypto.randomUUID(), ...form }, ...items]);
          setForm({ title: "", description: "", subject: "", gradeId: undefined, videoUrl: "", thumbnailUrl: "" });
          toast.success("تمت إضافة الكورس");
        }}
        className="rounded-2xl border border-gold/30 bg-card p-5 shadow-card"
      >
        <h2 className="mb-4 flex items-center gap-2 font-extrabold"><Plus className="h-4 w-4 text-gold" /> إضافة كورس جديد</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان الكورس" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="المادة" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <select value={form.gradeId ?? ""} onChange={(e) => setForm({ ...form, gradeId: e.target.value ? Number(e.target.value) : undefined })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">— عام (لكل الصفوف) —</option>
            {GRADES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <input value={form.videoUrl ?? ""} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="رابط فيديو (اختياري)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف الكورس" rows={3} className="md:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold text-muted-foreground">صورة الغلاف</label>
            <WorksheetUploadField value={form.thumbnailUrl || undefined} name="cover" onChange={(v) => setForm({ ...form, thumbnailUrl: v?.url || "" })} />
          </div>
        </div>
        <button className="mt-4 rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-bold shadow-gold" style={{ color: "var(--royal-deep)" }}>إضافة</button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <div key={c.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            {c.thumbnailUrl && <img src={c.thumbnailUrl} alt={c.title} className="h-36 w-full object-cover" />}
            <div className="p-4">
              <div className="text-[11px] font-bold text-muted-foreground">{c.subject}{c.gradeId ? ` · ${GRADES.find((g) => g.id === c.gradeId)?.name}` : ""}</div>
              <h3 className="mt-1 font-extrabold">{c.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
              <div className="mt-3 flex items-center justify-between">
                {c.videoUrl ? <a href={c.videoUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary underline">فتح الفيديو</a> : <span className="text-xs text-muted-foreground">بدون فيديو</span>}
                <button onClick={() => { save(items.filter((x) => x.id !== c.id)); toast.success("حُذف"); }} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">لا توجد كورسات بعد</div>}
      </div>
    </div>
  );
}

// ---------- Quotes CMS ----------
function QuotesAdmin({ items, save }: ReturnType<typeof useQuotes>) {
  const [draft, setDraft] = useState("");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = draft.trim();
          if (!v) return toast.error("اكتب اقتباسًا أولاً");
          save([v, ...items]);
          setDraft("");
          toast.success("تمت إضافة الاقتباس");
        }}
        className="rounded-2xl border border-gold/30 bg-card p-5 shadow-card"
      >
        <h2 className="mb-3 flex items-center gap-2 font-extrabold"><Plus className="h-4 w-4 text-gold" /> اقتباس / شعار جديد</h2>
        <div className="flex gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder='مثال: "العلم نور والجهل ظلام"' className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <button className="rounded-xl bg-gradient-gold px-5 py-2 text-sm font-bold shadow-gold" style={{ color: "var(--royal-deep)" }}>إضافة</button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">تظهر هذه الاقتباسات في الصفحة الرئيسية وفي شريط الاقتباسات السفلي.</p>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border bg-secondary px-4 py-3 text-sm font-bold">{items.length} اقتباس</div>
        <ul className="divide-y divide-border">
          {items.map((q, i) => (
            <li key={`${i}-${q}`} className="flex items-center gap-3 p-4">
              {editingIdx === i ? (
                <>
                  <input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  <button onClick={() => { const next = [...items]; next[i] = editValue.trim() || q; save(next); setEditingIdx(null); toast.success("تم الحفظ"); }} className="rounded-lg bg-emerald-600 p-2 text-white"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setEditingIdx(null)} className="rounded-lg border border-border p-2"><X className="h-4 w-4" /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-semibold leading-relaxed">«{q}»</span>
                  <button onClick={() => { setEditingIdx(i); setEditValue(q); }} className="rounded-lg p-2 text-primary hover:bg-primary/10"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { save(items.filter((_, j) => j !== i)); toast.success("حُذف"); }} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </>
              )}
            </li>
          ))}
          {items.length === 0 && <li className="p-8 text-center text-sm text-muted-foreground">لا توجد اقتباسات بعد — أضف أوّل اقتباس بالأعلى.</li>}
        </ul>
      </div>
    </div>
  );
}
