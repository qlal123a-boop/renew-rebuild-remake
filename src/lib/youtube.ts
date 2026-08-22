// Global YouTube URL utilities — extracts an ID from any standard YouTube URL
// (watch?v=, youtu.be/, /embed/, /shorts/, /live/, mobile m.youtube.com) and
// produces an embeddable iframe URL.

const YT_ID_RE = /(?:youtube\.com\/(?:watch\?(?:[^#]*&)*v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;

/** Extract the 11-character video ID from any YouTube URL form. */
export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(YT_ID_RE);
  if (m?.[1]) return m[1];
  // Bare ID
  if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

/** Convert any YouTube URL to its `/embed/<id>` form. Returns "" if not embeddable. */
export function toYouTubeEmbed(url: string | null | undefined): string {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : "";
}

/** Standard, permissive `allow` attribute string for embedded YouTube iframes. */
export const YT_IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
