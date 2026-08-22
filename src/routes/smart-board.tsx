import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Brush, Eraser, Trash2, Download, ImagePlus, Palette, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/smart-board")({
  component: SmartBoardPage,
  head: () => ({
    meta: [
      { title: "اللوح الذكي — المنارة" },
      { name: "description", content: "اللوح الذكي للرسم والحل المباشر، مع إمكانية رفع الملفات للعمل عليها." },
    ],
  }),
});

const COLORS = ["#111827", "#dc2626", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#db2777", "#ffffff"];

function SmartBoardPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);
  const [color, setColor] = useState("#111827");
  const [size, setSize] = useState(4);
  const [mode, setMode] = useState<"brush" | "eraser">("brush");
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      // Preserve drawings on resize
      const data = canvas.toDataURL();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctxRef.current = ctx;
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = data;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = size;
    ctx.strokeStyle = color;
    ctx.globalCompositeOperation = mode === "eraser" ? "destination-out" : "source-over";
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const end = () => { drawing.current = false; };

  const clearAll = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `smart-board-${Date.now()}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type === "application/pdf") {
      const url = URL.createObjectURL(f);
      setPdfUrl(url);
      setBgImage(null);
      toast.success("تم رفع ملف PDF");
    } else if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setBgImage(url);
      setPdfUrl(null);
      toast.success("تم رفع الصورة كخلفية");
    } else {
      toast.error("الملف يجب أن يكون صورة أو PDF");
    }
    e.target.value = "";
  };

  return (
    <div className="page-shell py-8 md:py-10">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-extrabold md:text-4xl">اللوح الذكي</h1>
        <p className="mt-2 text-sm text-muted-foreground">ارسم، احلّ التمارين، أو ارفع صورة/PDF واعمل عليه مباشرة.</p>
        <div className="gold-divider mx-auto mt-4 w-24" />
      </header>

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-card">
        <button
          onClick={() => setMode("brush")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-smooth ${mode === "brush" ? "bg-gradient-royal text-gold shadow-luxury" : "border border-border hover:bg-secondary"}`}
        >
          <Brush className="h-4 w-4" /> فرشاة
        </button>
        <button
          onClick={() => setMode("eraser")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-smooth ${mode === "eraser" ? "bg-gradient-royal text-gold shadow-luxury" : "border border-border hover:bg-secondary"}`}
        >
          <Eraser className="h-4 w-4" /> ممحاة
        </button>

        <div className="mx-1 h-6 w-px bg-border" />

        <div className="flex items-center gap-1.5">
          <Palette className="h-4 w-4 text-muted-foreground" />
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setMode("brush"); }}
              aria-label={c}
              className={`h-7 w-7 rounded-full border-2 transition-smooth ${color === c ? "border-gold ring-2 ring-gold/40" : "border-border"}`}
              style={{ background: c }}
            />
          ))}
        </div>

        <div className="mx-1 h-6 w-px bg-border" />

        <label className="inline-flex items-center gap-2 text-xs font-bold">
          الحجم
          <input type="range" min={1} max={30} value={size} onChange={(e) => setSize(Number(e.target.value))} className="accent-gold" />
          <span className="w-6 text-center">{size}</span>
        </label>

        <div className="mx-1 h-6 w-px bg-border" />

        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-secondary">
          <ImagePlus className="h-4 w-4" /> رفع صورة/PDF
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={onUpload} />
        </label>

        <button onClick={clearAll} className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" /> مسح الكل
        </button>

        <button onClick={download} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-gold px-3 py-2 text-xs font-extrabold shadow-gold" style={{ color: "var(--royal-deep)" }}>
          <Download className="h-4 w-4" /> حفظ كصورة
        </button>
      </div>

      {/* Canvas area */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-gold/30 bg-white shadow-luxury" style={{ height: "70vh" }}>
        {bgImage && (
          <img src={bgImage} alt="خلفية" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
        )}
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="relative h-full w-full touch-none"
          style={{ cursor: mode === "eraser" ? "cell" : "crosshair" }}
        />
      </div>

      {pdfUrl && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="mb-2 flex items-center gap-2 text-sm font-extrabold">
            <FileText className="h-4 w-4 text-gold" /> الملف المرفوع
          </div>
          <iframe src={pdfUrl} title="PDF" className="h-[70vh] w-full rounded-lg border border-border" />
          <p className="mt-2 text-xs text-muted-foreground">يمكنك الكتابة على اللوح أعلاه أثناء قراءة الملف هنا.</p>
        </div>
      )}
    </div>
  );
}
