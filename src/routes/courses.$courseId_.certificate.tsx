import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/lib/use-auth";
import { Certificate } from "@/components/certificate";
import { themeForCategory, COURSE_CATEGORY_LABELS, type CertificateTheme } from "@/lib/certificate-theme";
import { Download, FileImage, ArrowRight, Award, Printer } from "lucide-react";
import { makeCertificateId } from "@/lib/certificate-id";
import { toast } from "sonner";

export const Route = createFileRoute("/courses/$courseId_/certificate")({
  component: CertificatePage,
  head: () => ({ meta: [{ title: "شهادة الكورس — المنارة" }, { name: "robots", content: "noindex" }] }),
});

/** Never let the export hang silently — surface a real error instead. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("تعذّر توليد الملف، حاول مجددًا")), ms)),
  ]);
}

function CertificatePage() {
  const { courseId } = Route.useParams();
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();
  const certRef = useRef<HTMLDivElement>(null);
  const [course, setCourse] = useState<{ title: string; subject: string; auto_certificate_theme: boolean; certificate_theme: string | null; category: string | null } | null>(null);

  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [theme, setTheme] = useState<CertificateTheme>("academic");
  const [studentName, setStudentName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: c }, { data: comp }] = await Promise.all([
        supabase.from("courses").select("title, subject, auto_certificate_theme, certificate_theme, category").eq("id", courseId).maybeSingle(),
        supabase.from("course_completions").select("completed_at, certificate_theme, student_name").eq("user_id", user.id).eq("course_id", courseId).maybeSingle(),
      ]);
      if (!c) { toast.error("الكورس غير موجود"); navigate({ to: "/courses" }); return; }
      if (!comp) { toast.error("يجب إتمام الكورس أولًا"); navigate({ to: "/courses/$courseId", params: { courseId } }); return; }
      const courseRow = c as { title: string; subject: string; auto_certificate_theme: boolean; certificate_theme: string | null; category: string | null };
      setCourse(courseRow);
      setCompletedAt(comp.completed_at);
      // Always derive the design from the real course (category → subject → title),
      // so "التربية الإسلامية" never renders a generic/unrelated certificate.
      const initialTheme = themeForCategory(courseRow.category, `${courseRow.title} ${courseRow.subject}`)
        || (courseRow.certificate_theme as CertificateTheme)
        || (comp.certificate_theme as CertificateTheme)
        || "academic";
      setTheme(initialTheme);
      const meta = (user.user_metadata || {}) as { full_name?: string; name?: string };
      setStudentName((comp as { student_name?: string }).student_name || meta.full_name || meta.name || user.email?.split("@")[0] || "الطالب");
    })();
  }, [user, courseId, navigate]);

  /**
   * Render the certificate node to a canvas once, reused by PNG/PDF/print.
   * Tailwind v4 emits modern `lab()`/`oklch()` colors that html2canvas cannot parse
   * ("Attempting to parse an unsupported color function"), so we sanitize the clone.
   */
  const renderCanvas = async () => {
    const { default: html2canvas } = await import("html2canvas");
    const COLOR_PROPS = [
      "color", "backgroundColor", "borderTopColor", "borderRightColor",
      "borderBottomColor", "borderLeftColor", "outlineColor",
      "textDecorationColor", "caretColor", "columnRuleColor",
    ] as const;
    const isModern = (v: string) => /\b(lab|lch|oklab|oklch|color)\(/.test(v);
    return withTimeout(
      html2canvas(certRef.current!, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        onclone: (doc: Document) => {
          doc.querySelectorAll<HTMLElement>("*").forEach((el) => {
            const cs = doc.defaultView?.getComputedStyle(el);
            if (!cs) return;
            for (const prop of COLOR_PROPS) {
              const val = cs[prop] as string;
              if (val && isModern(val)) {
                el.style.setProperty(
                  prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
                  prop === "backgroundColor" ? "transparent" : "#1f2937",
                );
              }
            }
            const bg = cs.backgroundImage;
            if (bg && isModern(bg)) el.style.backgroundImage = "none";
          });
        },
      }),
      45000,
    );
  };


  /** Blob + object URL — data: URLs silently fail to download on Android Chrome. */
  const saveBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const fileBase = `certificate-${(course?.title || "course").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 60)}`;

  const downloadPNG = async () => {
    if (!certRef.current) return;
    setBusy(true);
    try {
      const canvas = await renderCanvas();
      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("تعذّر إنشاء الصورة"))), "image/png"),
      );
      saveBlob(blob, `${fileBase}.png`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const downloadPDF = async () => {
    if (!certRef.current) return;
    setBusy(true);
    try {
      const [canvas, { default: jsPDF }] = await Promise.all([renderCanvas(), import("jspdf")]);
      const img = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width, canvas.height] });
      pdf.addImage(img, "JPEG", 0, 0, canvas.width, canvas.height);
      saveBlob(pdf.output("blob"), `${fileBase}.pdf`);
      toast.success("تم تحميل الشهادة بصيغة PDF");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const printCert = async () => {
    if (!certRef.current) return;
    setBusy(true);
    try {
      const canvas = await renderCanvas();
      const w = window.open("", "_blank");
      if (!w) { toast.error("اسمح بالنوافذ المنبثقة للطباعة"); return; }
      w.document.write(
        `<html dir="rtl"><head><title>${fileBase}</title><style>@page{size:landscape;margin:0}body{margin:0}img{width:100%}</style></head><body><img src="${canvas.toDataURL("image/png")}" onload="window.focus();window.print()"/></body></html>`,
      );
      w.document.close();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  if (loading || !course || !completedAt) return <div className="p-12 text-center text-muted-foreground">جارٍ التحميل...</div>;

  const certTitle = `شهادة إتمام دورة ${course.title}`;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-5 md:py-10">
      <Link to="/courses/$courseId" params={{ courseId }} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowRight className="h-4 w-4 rotate-180" /> العودة للكورس
      </Link>

      <header className="mb-6 text-center">
        <h1 className="flex items-center justify-center gap-2 text-xl font-extrabold md:text-3xl">
          <Award className="h-7 w-7 text-gold" /> {certTitle}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">حمّل شهادتك بصيغة PDF أو صورة، أو اطبعها مباشرة.</p>
      </header>

      <div className="mb-5 rounded-2xl border border-gold/30 bg-card p-4 shadow-card">
        <label className="block text-xs font-bold text-muted-foreground">الاسم على الشهادة</label>
        <input
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold"
        />
        <p className="mt-2 text-[11px] text-muted-foreground">
          نوع الشهادة يُستمد تلقائيًا من الكورس: <span className="font-bold">{(course.category && COURSE_CATEGORY_LABELS[course.category]) || course.subject}</span>
        </p>
      </div>

      <div className="mb-5 flex flex-wrap justify-center gap-3">
        <button onClick={downloadPDF} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-gradient-royal px-5 py-2.5 text-sm font-extrabold text-gold shadow-luxury disabled:opacity-60">
          <Download className="h-4 w-4" /> {busy ? "..." : "تحميل PDF"}
        </button>
        <button onClick={downloadPNG} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-extrabold shadow-gold disabled:opacity-60" style={{ color: "var(--royal-deep)" }}>
          <FileImage className="h-4 w-4" /> {busy ? "..." : "تحميل صورة"}
        </button>
        <button onClick={printCert} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-gold/40 px-5 py-2.5 text-sm font-bold hover:bg-gold/10 disabled:opacity-60">
          <Printer className="h-4 w-4" /> طباعة
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-secondary p-2 shadow-card md:p-4">
        <div className="mx-auto" style={{ width: "1123px" }}>
          <Certificate
            ref={certRef}
            studentName={studentName || "الطالب"}
            courseTitle={course.title}
            subject={(course.category && COURSE_CATEGORY_LABELS[course.category]) || course.subject}
            titleText={certTitle}
            date={completedAt}
            theme={theme}
            certificateId={makeCertificateId(user?.id ?? "", courseId, completedAt)}
          />
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground md:hidden">مرّر أفقيًا لمعاينة الشهادة كاملة.</p>
    </div>
  );
}

