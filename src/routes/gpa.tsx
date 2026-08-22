import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calculator, Plus, Trash2, Award, Download } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";

export const Route = createFileRoute("/gpa")({
  component: () => <RequireAuth title="حاسبة المعدل للطلاب المسجّلين"><GpaPage /></RequireAuth>,
  head: () => ({ meta: [{ title: "حساب المعدل — المنارة" }, { name: "description", content: "حاسبة المعدل وفق النظام الفلسطيني مع شهادة قابلة للتنزيل." }] }),
});

type Row = { id: string; subject: string; mark: number };

// Palestinian system: 0–100 scale.
function gradeOf(avg: number) {
  if (avg >= 95) return { label: "ممتاز مع مرتبة الشرف", color: "#FFD700" };
  if (avg >= 90) return { label: "ممتاز", color: "#16a34a" };
  if (avg >= 80) return { label: "جيد جدًا", color: "#0ea5e9" };
  if (avg >= 70) return { label: "جيد", color: "#6366f1" };
  if (avg >= 60) return { label: "مقبول", color: "#a16207" };
  if (avg >= 50) return { label: "ضعيف", color: "#dc2626" };
  return { label: "راسب", color: "#7f1d1d" };
}

function GpaPage() {
  const [name, setName] = useState("");
  const [rows, setRows] = useState<Row[]>([
    { id: crypto.randomUUID(), subject: "اللغة العربية", mark: 0 },
    { id: crypto.randomUUID(), subject: "الرياضيات", mark: 0 },
    { id: crypto.randomUUID(), subject: "اللغة الإنجليزية", mark: 0 },
  ]);

  const avg = useMemo(() => {
    const valid = rows.filter((r) => r.subject.trim() && !Number.isNaN(r.mark));
    if (!valid.length) return 0;
    return valid.reduce((s, r) => s + Math.max(0, Math.min(100, Number(r.mark) || 0)), 0) / valid.length;
  }, [rows]);

  const g = gradeOf(avg);

  const addRow = () => setRows([...rows, { id: crypto.randomUUID(), subject: "", mark: 0 }]);
  const update = (id: string, patch: Partial<Row>) => setRows(rows.map((r) => r.id === id ? { ...r, ...patch } : r));
  const remove = (id: string) => setRows(rows.filter((r) => r.id !== id));

  const downloadCertificate = () => {
    if (!name.trim()) { toast.error("الرجاء إدخال اسم الطالب"); return; }
    const W = 1400, H = 1000;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0a1438"); bg.addColorStop(1, "#1a237e");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Gold border
    ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 10;
    ctx.strokeRect(40, 40, W - 80, H - 80);
    ctx.lineWidth = 2;
    ctx.strokeRect(70, 70, W - 140, H - 140);

    // Header
    ctx.fillStyle = "#FFD700";
    ctx.textAlign = "center";
    ctx.font = "bold 64px 'Cairo', Arial, sans-serif";
    ctx.fillText("شهادة تفوّق", W / 2, 200);

    ctx.fillStyle = "#ffffff";
    ctx.font = "28px 'Cairo', Arial, sans-serif";
    ctx.fillText("المنارة التعليمية — المنهاج الفلسطيني", W / 2, 250);

    // Body
    ctx.font = "32px 'Cairo', Arial, sans-serif";
    ctx.fillText("تشهد منصّة المنارة التعليمية بأن الطالب/ة", W / 2, 380);

    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 72px 'Cairo', Arial, sans-serif";
    ctx.fillText(name.trim(), W / 2, 480);

    ctx.fillStyle = "#ffffff";
    ctx.font = "30px 'Cairo', Arial, sans-serif";
    ctx.fillText(`قد حصل/ت على معدّل ${avg.toFixed(2)} %`, W / 2, 570);

    ctx.fillStyle = g.color;
    ctx.font = "bold 56px 'Cairo', Arial, sans-serif";
    ctx.fillText(`التقدير: ${g.label}`, W / 2, 660);

    // Footer
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "22px 'Cairo', Arial, sans-serif";
    const date = new Date().toLocaleDateString("ar-EG");
    ctx.fillText(`تاريخ الإصدار: ${date}`, W / 2, H - 160);

    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 26px 'Cairo', Arial, sans-serif";
    ctx.fillText("منصّة المنارة التعليمية", W / 2, H - 110);

    // Download
    const link = document.createElement("a");
    link.download = `شهادة-${name.trim()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("تم تحميل الشهادة");
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <header className="mb-6 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-royal shadow-luxury"><Calculator className="h-6 w-6 text-gold" /></div>
        <div>
          <h1 className="text-2xl font-extrabold md:text-3xl">حساب المعدل</h1>
          <p className="text-sm text-muted-foreground">احسب معدّلك وفق النظام الفلسطيني واحصل على شهادة جاهزة للتنزيل.</p>
        </div>
      </header>

      <div className="mb-5 rounded-2xl border border-gold/30 bg-card p-5 shadow-card">
        <label className="mb-2 block text-sm font-bold">اسم الطالب/ة</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: عبدالهادي قلالوه" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      </div>

      <div className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="mb-3 grid grid-cols-12 gap-2 px-1 text-xs font-bold text-muted-foreground">
          <span className="col-span-7">المادة</span>
          <span className="col-span-3 text-center">العلامة /100</span>
          <span className="col-span-2"></span>
        </div>
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="grid grid-cols-12 items-center gap-2">
              <input value={r.subject} onChange={(e) => update(r.id, { subject: e.target.value })} placeholder="اسم المادة" className="col-span-7 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <input type="number" min={0} max={100} value={r.mark} onChange={(e) => update(r.id, { mark: Number(e.target.value) })} className="col-span-3 rounded-lg border border-border bg-background px-3 py-2 text-center text-sm" />
              <button onClick={() => remove(r.id)} className="col-span-2 inline-flex items-center justify-center rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        <button onClick={addRow} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-dashed border-gold/50 px-3 py-2 text-xs font-bold text-gold"><Plus className="h-4 w-4" /> إضافة مادة</button>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gold/30 bg-gradient-royal p-6 text-center text-primary-foreground shadow-luxury">
          <div className="text-xs font-bold text-gold">المعدل</div>
          <div className="mt-2 text-5xl font-black text-gold">{avg.toFixed(2)}%</div>
        </div>
        <div className="rounded-2xl border border-gold/30 bg-card p-6 text-center shadow-card">
          <div className="text-xs font-bold text-muted-foreground">التقدير</div>
          <div className="mt-2 inline-flex items-center gap-2 text-3xl font-black" style={{ color: g.color }}><Award className="h-7 w-7" /> {g.label}</div>
        </div>
      </div>

      <button onClick={downloadCertificate} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-gold px-5 py-3 text-base font-extrabold shadow-gold transition-smooth hover:scale-[1.01]" style={{ color: "var(--royal-deep)" }}>
        <Download className="h-5 w-5" /> تحويل إلى شهادة وتنزيلها
      </button>
    </div>
  );
}
