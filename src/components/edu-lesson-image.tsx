import { Loader2 } from "lucide-react";

/**
 * Topic-accurate educational illustration generated for the current lesson.
 * Rendered as a data: URL so it is embedded in PDF/print output too.
 */
export function EduLessonImage({
  src,
  loading,
  title,
}: {
  src: string | null;
  loading: boolean;
  title: string;
}) {
  if (loading) {
    return (
      <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gold/40 p-6 text-xs text-muted-foreground print:hidden">
        <Loader2 className="h-4 w-4 animate-spin" /> جارٍ إنشاء الرسم التوضيحي للدرس…
      </div>
    );
  }
  if (!src) return null;
  return (
    <figure className="my-5 break-inside-avoid rounded-2xl border border-gold/30 bg-secondary/40 p-4 text-center">
      <img src={src} alt={`رسم توضيحي: ${title}`} className="mx-auto max-h-[420px] w-auto rounded-xl" />
      <figcaption className="mt-2 text-[11px] font-bold text-muted-foreground">
        رسم توضيحي للدرس: {title}
      </figcaption>
    </figure>
  );
}
