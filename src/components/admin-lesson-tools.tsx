import { useRef, useState } from "react";
import { Upload, FileText, X, Wand2, Loader2, ListVideo } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { parseYouTubePlaylist } from "@/lib/playlist.functions";
import type { Lesson } from "@/lib/curriculum";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*";
const MAX_BYTES = 20 * 1024 * 1024;

export async function uploadWorksheet(file: File): Promise<{ url: string; name: string } | null> {
  if (file.size > MAX_BYTES) {
    toast.error("الملف أكبر من 20 ميغابايت");
    return null;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("worksheets").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) {
    toast.error(`فشل الرفع: ${error.message}`);
    return null;
  }
  const { data } = supabase.storage.from("worksheets").getPublicUrl(path);
  return { url: data.publicUrl, name: file.name };
}

export function WorksheetUploadField({
  value,
  name,
  onChange,
}: {
  value?: string;
  name?: string;
  onChange: (v: { url: string; name: string } | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handle = async (file: File) => {
    setBusy(true);
    const res = await uploadWorksheet(file);
    setBusy(false);
    if (res) {
      onChange(res);
      toast.success("تم رفع ورقة العمل");
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-gold/40 bg-background/40 p-3">
      <input
        ref={ref}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
          e.target.value = "";
        }}
      />
      {value ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <a href={value} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 truncate text-primary hover:underline">
            <FileText className="h-4 w-4 text-gold" />
            <span className="truncate">{name || "ورقة العمل المرفوعة"}</span>
          </a>
          <button type="button" onClick={() => onChange(null)} className="rounded-md p-1 text-destructive hover:bg-destructive/10">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => ref.current?.click()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-royal px-4 py-2 text-sm font-bold text-gold disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? "جارٍ الرفع..." : "رفع ورقة عمل (PDF / صورة)"}
        </button>
      )}
    </div>
  );
}

type ParsedRow = { title: string; videoUrl: string; description: string };

function parseLines(text: string): ParsedRow[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        title: parts[0] || "",
        videoUrl: parts[1] || "",
        description: parts[2] || "",
      };
    })
    .filter((r) => r.title);
}

export function SmartImporter({
  gradeId,
  subject,
  semester,
  existing,
  save,
}: {
  gradeId: number;
  subject: string;
  semester: 1 | 2;
  existing: Lesson[];
  save: (next: Lesson[]) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const parsePlaylist = useServerFn(parseYouTubePlaylist);

  const fetchPlaylist = async () => {
    const url = text.trim().split(/\s+/)[0];
    if (!url.includes("list=")) return toast.error("الصق رابط قائمة تشغيل يحتوي على list=");
    setBusy(true);
    const res = await parsePlaylist({ data: { url } });
    setBusy(false);
    if (res.error || !res.videos.length) return toast.error(res.error || "لم يُعثر على فيديوهات");
    const lines = res.videos.map((v) => `${v.title} | ${v.url} | `).join("\n");
    setText(lines);
    toast.success(`تم استخراج ${res.videos.length} فيديو — حرّر العناوين ثم احفظ`);
  };

  const saveAll = () => {
    const rows = parseLines(text);
    if (!rows.length) return toast.error("لا توجد أسطر صالحة");
    const lessons: Lesson[] = rows.map((r) => ({
      id: crypto.randomUUID(),
      gradeId,
      subject,
      semester,
      title: r.title,
      description: r.description || `شرح درس ${r.title}`,
      videoUrl: r.videoUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(r.title)}`,
    }));
    save([...lessons, ...existing]);
    setText("");
    toast.success(`تمت إضافة ${lessons.length} درسًا دفعة واحدة`);
  };

  const preview = parseLines(text);

  return (
    <div className="rounded-2xl border-2 border-gold/40 bg-gradient-to-br from-card to-secondary/40 p-5 shadow-luxury">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-extrabold">
        <Wand2 className="h-5 w-5 text-gold" /> المستورد الذكي — رفع جماعي
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        كل سطر = درس، بالصيغة: <span className="font-mono text-foreground">عنوان الدرس | رابط الفيديو | الشرح</span>
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        dir="ltr"
        placeholder={"الدرس الأول | https://youtu.be/abc | شرح مختصر\nالدرس الثاني | https://youtu.be/xyz | شرح مختصر\n..."}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={fetchPlaylist}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-gold/50 px-4 py-2 text-sm font-bold text-gold hover:bg-gold/10 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListVideo className="h-4 w-4" />}
          استخراج قائمة تشغيل يوتيوب
        </button>
        <button
          type="button"
          onClick={saveAll}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-2 text-sm font-extrabold shadow-gold"
          style={{ color: "var(--royal-deep)" }}
        >
          حفظ الكل ({preview.length})
        </button>
      </div>
    </div>
  );
}
