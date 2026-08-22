import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Loader2, AlertTriangle, Search, Download, X } from "lucide-react";
import { toDownloadSrc } from "@/lib/pdf-src";

type TextItem = { str?: string };
type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage>; destroy: () => Promise<void> };
type PdfPage = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  getTextContent: () => Promise<{ items: TextItem[] }>;
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number }; canvas?: HTMLCanvasElement }) => { promise: Promise<void>; cancel: () => void };
};

/**
 * In-app PDF reader built on pdf.js — renders to <canvas>, so it works on mobile
 * browsers (iOS/Android) where <iframe src="*.pdf"> shows a blank page.
 * Features: page navigation, zoom, full-text search, download.
 */
export function PdfReader({ src, title, downloadUrl }: { src: string; title?: string; downloadUrl?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PdfDoc | null>(null);
  const taskRef = useRef<{ cancel: () => void } | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // search
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<number[]>([]);
  const [hitIdx, setHitIdx] = useState(0);
  const [searching, setSearching] = useState(false);

  // Load the document (client-side only)
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null); setNumPages(0); setPage(1); setHits([]); setQuery("");
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        const workerUrl = (await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")).default;
        (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = workerUrl;
        const task = (pdfjs as unknown as { getDocument: (o: { url: string; withCredentials: boolean }) => { promise: Promise<PdfDoc> } })
          .getDocument({ url: src, withCredentials: false });
        const doc = await task.promise;
        if (cancelled) { await doc.destroy(); return; }
        docRef.current = doc;
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (e) {
        if (!cancelled) { setError((e as Error).message || "تعذّر فتح الملف"); setLoading(false); }
      }
    })();
    return () => {
      cancelled = true;
      taskRef.current?.cancel();
      docRef.current?.destroy().catch(() => {});
      docRef.current = null;
    };
  }, [src]);

  // Render current page
  const renderPage = useCallback(async () => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;
    try {
      taskRef.current?.cancel();
      const p = await doc.getPage(page);
      const containerWidth = wrapRef.current?.clientWidth ?? 800;
      const base = p.getViewport({ scale: 1 });
      const fit = Math.min(1.8, (containerWidth - 24) / base.width);
      const viewport = p.getViewport({ scale: Math.max(0.3, fit * scale) });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const task = p.render({ canvasContext: ctx, viewport, canvas });
      taskRef.current = task;
      await task.promise;
    } catch (e) {
      const msg = (e as Error)?.message || "";
      if (msg && !/cancel/i.test(msg)) console.error("[pdf-reader] render failed:", msg);
    }
  }, [page, scale]);

  useEffect(() => { if (!loading && numPages) renderPage(); }, [loading, numPages, renderPage]);

  useEffect(() => {
    const onResize = () => { if (!loading && numPages) renderPage(); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [loading, numPages, renderPage]);

  const normalize = (s: string) =>
    s.replace(/[\u064B-\u0652\u0670]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/\s+/g, " ").toLowerCase();

  const runSearch = async () => {
    const doc = docRef.current;
    const q = normalize(query.trim());
    if (!doc || !q) { setHits([]); return; }
    setSearching(true);
    const found: number[] = [];
    try {
      for (let i = 1; i <= doc.numPages; i++) {
        const p = await doc.getPage(i);
        const tc = await p.getTextContent();
        const text = normalize(tc.items.map((it) => it.str ?? "").join(" "));
        if (text.includes(q)) found.push(i);
        if (found.length >= 200) break;
      }
    } catch { /* ignore */ }
    setHits(found);
    setHitIdx(0);
    if (found.length) setPage(found[0]);
    setSearching(false);
  };

  const gotoHit = (dir: 1 | -1) => {
    if (!hits.length) return;
    const next = (hitIdx + dir + hits.length) % hits.length;
    setHitIdx(next);
    setPage(hits[next]);
  };

  const fullscreen = () => {
    const el = wrapRef.current?.parentElement ?? wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  };

  const dl = downloadUrl ? toDownloadSrc(downloadUrl) : src;

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-secondary p-8 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-sm font-bold">تعذّر عرض هذا الملف داخل الموقع</p>
        <p className="max-w-md text-xs text-muted-foreground">{error}</p>
        <a href={dl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-gradient-royal px-4 py-2 text-xs font-bold text-gold">
          تنزيل الملف
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-secondary">
      <div className="flex flex-wrap items-center justify-center gap-1.5 border-b border-border bg-card px-2 py-2 text-xs">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="grid h-8 w-8 place-items-center rounded-lg border border-border disabled:opacity-40" aria-label="السابق">
          <ChevronRight className="h-4 w-4" />
        </button>
        <input
          type="number"
          value={page}
          min={1}
          max={numPages || 1}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v >= 1 && v <= (numPages || 1)) setPage(v);
          }}
          className="h-8 w-14 rounded-lg border border-border bg-background text-center font-bold"
          aria-label="رقم الصفحة"
        />
        <span className="font-bold">/ {numPages || "…"}</span>
        <button onClick={() => setPage((p) => Math.min(numPages || 1, p + 1))} disabled={!numPages || page >= numPages} className="grid h-8 w-8 place-items-center rounded-lg border border-border disabled:opacity-40" aria-label="التالي">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button onClick={() => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(2)))} className="grid h-8 w-8 place-items-center rounded-lg border border-border" aria-label="تصغير">
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="w-12 text-center font-bold">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(2)))} className="grid h-8 w-8 place-items-center rounded-lg border border-border" aria-label="تكبير">
          <ZoomIn className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button onClick={() => setShowSearch((v) => !v)} className="grid h-8 w-8 place-items-center rounded-lg border border-border" aria-label="بحث">
          <Search className="h-4 w-4" />
        </button>
        <a href={dl} download className="grid h-8 w-8 place-items-center rounded-lg border border-border" aria-label="تنزيل" title="تنزيل">
          <Download className="h-4 w-4" />
        </a>
        <button onClick={fullscreen} className="grid h-8 w-8 place-items-center rounded-lg border border-border" title="ملء الشاشة" aria-label="ملء الشاشة">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {showSearch && (
        <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
            placeholder="ابحث داخل الملف…"
            className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <button onClick={runSearch} disabled={searching || !query.trim()} className="rounded-lg bg-gradient-royal px-3 py-2 text-xs font-bold text-gold disabled:opacity-50">
            {searching ? "…" : "بحث"}
          </button>
          {hits.length > 0 && (
            <div className="flex items-center gap-1 text-xs font-bold">
              <button onClick={() => gotoHit(-1)} className="grid h-8 w-8 place-items-center rounded-lg border border-border"><ChevronRight className="h-4 w-4" /></button>
              <span>{hitIdx + 1}/{hits.length}</span>
              <button onClick={() => gotoHit(1)} className="grid h-8 w-8 place-items-center rounded-lg border border-border"><ChevronLeft className="h-4 w-4" /></button>
            </div>
          )}
          {!searching && query && hits.length === 0 && <span className="text-xs text-muted-foreground">لا نتائج</span>}
          <button onClick={() => { setShowSearch(false); setHits([]); }} className="grid h-8 w-8 place-items-center rounded-lg border border-border"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div ref={wrapRef} className="min-h-0 flex-1 overflow-auto p-3 text-center">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> جارٍ تحميل {title || "الملف"}...
          </div>
        ) : (
          <canvas ref={canvasRef} className="mx-auto rounded-md bg-white shadow-card" />
        )}
      </div>
    </div>
  );
}
