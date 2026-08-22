import { forwardRef } from "react";
import type { CertificateTheme } from "@/lib/certificate-theme";

type Props = {
  studentName: string;
  courseTitle: string;
  date: string; // ISO or formatted
  theme: CertificateTheme;
  issuer?: string;
  /** Unique verifiable certificate serial, e.g. AM-2026-4F91C2 */
  certificateId?: string;
  /** Dynamic heading, e.g. "شهادة إتمام دورة أساسيات البرمجة" */
  titleText?: string;
  /** Course subject / category line, e.g. "التربية الإسلامية" */
  subject?: string;
};

const PALETTES: Record<CertificateTheme, {
  bg: string; border: string; accent: string; text: string;
  font: string; ornament: string;
}> = {
  traditional: {
    bg: "linear-gradient(135deg, #f8f1e0 0%, #fdf6e3 50%, #f3e7c4 100%)",
    border: "#8b6f1a",
    accent: "#0f6b4f",
    text: "#3a2a08",
    font: "'Amiri', 'Cairo', serif",
    ornament: "✦ ❀ ✦",
  },
  "modern-tech": {
    bg: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #312e81 100%)",
    border: "#22d3ee",
    accent: "#a78bfa",
    text: "#f1f5f9",
    font: "'Cairo', sans-serif",
    ornament: "</> </>  </>",
  },
  academic: {
    bg: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 50%, #e0e7ff 100%)",
    border: "#1e3a8a",
    accent: "#b8860b",
    text: "#1e293b",
    font: "'Cairo', serif",
    ornament: "★ ★ ★",
  },
  nature: {
    bg: "linear-gradient(135deg, #f0fdf4 0%, #ecfccb 50%, #d9f99d 100%)",
    border: "#166534",
    accent: "#15803d",
    text: "#14532d",
    font: "'Cairo', sans-serif",
    ornament: "🌿 ❋ 🌿",
  },
};

export const Certificate = forwardRef<HTMLDivElement, Props>(function Certificate(
  { studentName, courseTitle, date, theme, issuer = "منصة المنارة التعليمية", certificateId, titleText, subject },
  ref,
) {
  const p = PALETTES[theme];
  const d = new Date(date);
  const formatted = d.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
  const formattedTime = d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      ref={ref}
      dir="rtl"
      style={{
        width: "1123px",
        height: "794px",
        background: p.bg,
        color: p.text,
        fontFamily: p.font,
        padding: "40px",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          border: `8px double ${p.border}`,
          borderRadius: "20px",
          padding: "40px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        {/* Inner accent border */}
        <div
          style={{
            position: "absolute", inset: "16px",
            border: `2px solid ${p.accent}`, borderRadius: "12px", pointerEvents: "none",
          }}
        />

        <div style={{ textAlign: "center", marginTop: 12 }}>
          {/* Platform emblem (pure CSS/SVG so html2canvas never blocks on a remote image) */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <svg width="54" height="54" viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="30" fill="none" stroke={p.border} strokeWidth="3" />
              <path d="M32 12 L38 26 L53 27 L41 36 L45 51 L32 42 L19 51 L23 36 L11 27 L26 26 Z" fill={p.accent} />
            </svg>
            <div style={{ fontSize: 20, fontWeight: 800, color: p.border }}>{issuer}</div>
          </div>
          <div style={{ fontSize: 18, color: p.accent, letterSpacing: 8, marginTop: 8 }}>{p.ornament}</div>
          <div style={{ fontSize: titleText && titleText.length > 34 ? 32 : 42, fontWeight: 900, marginTop: 10, color: p.border, lineHeight: 1.3, padding: "0 40px" }}>
            {titleText || `شهادة إتمام دورة ${courseTitle}`}
          </div>
          <div style={{ fontSize: 18, marginTop: 6, opacity: 0.75 }}>
            Certificate of Completion
          </div>
        </div>

        <div style={{ textAlign: "center", padding: "0 40px" }}>
          <div style={{ fontSize: 20, marginBottom: 16 }}>تشهد {issuer} بأن الطالب/ة</div>
          <div
            style={{
              fontSize: 56, fontWeight: 900, color: p.accent,
              borderBottom: `3px solid ${p.border}`, paddingBottom: 12,
              display: "inline-block", minWidth: 400,
            }}
          >
            {studentName}
          </div>
          <div style={{ fontSize: 20, marginTop: 24, lineHeight: 1.8 }}>
            قد أتمّ بنجاح جميع متطلبات كورس
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: p.border }}>
            «{courseTitle}»
          </div>
          {subject && (
            <div style={{ fontSize: 18, marginTop: 8, opacity: 0.85 }}>
              المجال: {subject}
            </div>
          )}
        </div>


        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", padding: "0 40px", marginBottom: 54 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderTop: `2px solid ${p.border}`, paddingTop: 8, minWidth: 200 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>تاريخ الإصدار</div>
              <div style={{ fontSize: 18, color: p.accent }}>{formatted}</div>
              <div style={{ fontSize: 13, opacity: 0.75 }}>{formattedTime}</div>
            </div>
          </div>
          <div style={{ fontSize: 22, color: p.accent, alignSelf: "center", letterSpacing: 6 }}>
            {p.ornament}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderTop: `2px solid ${p.border}`, paddingTop: 8, minWidth: 200 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>الجهة المانحة</div>
              <div style={{ fontSize: 18, color: p.accent }}>{issuer}</div>
            </div>
          </div>
        </div>

        {certificateId && (
          <div
            style={{
              position: "absolute", bottom: 34, left: 0, right: 0,
              display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
              fontSize: 13, opacity: 0.85,
            }}
          >
            <span>رقم الشهادة</span>
            {/* LTR span keeps the serial from being reordered/overlapped in RTL rasterization */}
            <span dir="ltr" style={{ letterSpacing: 1, fontWeight: 700 }}>{certificateId}</span>
          </div>
        )}

      </div>
    </div>
  );
});
