/**
 * Convert any PDF URL (esp. Google Drive) into a URL our built-in viewer can render inline.
 * External URLs go through our /api/public/pdf-proxy so the browser gets a native application/pdf
 * response with CORS headers (pdf.js requires them).
 */
export function toInlinePdfSrc(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/") || trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return trimmed;
  const normalized = toDirectDownloadUrl(trimmed);
  return `/api/public/pdf-proxy?url=${encodeURIComponent(normalized)}`;
}

/** Same proxy but forces a file download (fixes broken/blocked direct download links). */
export function toDownloadSrc(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/") || trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return trimmed;
  return `/api/public/pdf-proxy?url=${encodeURIComponent(toDirectDownloadUrl(trimmed))}&dl=1`;
}

/** Best-effort direct download URL (bypasses Drive UI). */
export function toDirectDownloadUrl(url: string | null | undefined): string {
  if (!url) return "";
  // Some imported URLs were stored with HTML-escaped separators (&amp;) — repair them.
  const clean = url.trim().replace(/&amp;/gi, "&").replace(/\s/g, "");
  const m = clean.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=download&)?id=)([A-Za-z0-9_-]+)/);
  if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
  return clean;
}
