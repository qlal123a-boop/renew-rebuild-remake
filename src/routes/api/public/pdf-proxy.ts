import { createFileRoute } from "@tanstack/react-router";

/**
 * Public PDF proxy — streams an external PDF (including Google Drive uc?export=download URLs)
 * through the platform so the built-in reader can display it without CORS errors.
 *
 * Usage:  /api/public/pdf-proxy?url=<encoded absolute https URL>&dl=1
 */
/** Block private / loopback / link-local targets (SSRF guard); any other public https host is allowed. */
const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /\.local$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^\[/, // raw IPv6 literal
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Type",
};

function hostAllowed(host: string): boolean {
  if (!host || host.includes("..")) return false;
  return !BLOCKED_HOST_PATTERNS.some((re) => re.test(host));
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

function upstreamHeaders(request: Request): HeadersInit {
  const h: Record<string, string> = {
    "User-Agent": UA,
    Accept: "application/pdf,application/octet-stream,*/*",
  };
  const range = request.headers.get("range");
  if (range) h["Range"] = range;
  return h;
}

/** Google Drive interstitial: large files answer with an HTML "confirm download" page. */
function driveConfirmUrl(html: string, original: URL): string | null {
  const id = original.searchParams.get("id");
  const confirm = html.match(/confirm=([0-9A-Za-z_-]+)/)?.[1];
  const form = html.match(/action="(https:\/\/[^"]*drive\.usercontent\.google\.com[^"]*)"/)?.[1];
  if (form) {
    const u = new URL(form.replace(/&amp;/g, "&"));
    for (const m of html.matchAll(/name="([^"]+)"\s+value="([^"]*)"/g)) u.searchParams.set(m[1], m[2]);
    return u.toString();
  }
  if (id) return `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=${confirm ?? "t"}`;
  return null;
}

async function handle(request: Request): Promise<Response> {
  const reqUrl = new URL(request.url);
  const target = reqUrl.searchParams.get("url");
  const forceDownload = reqUrl.searchParams.get("dl") === "1";
  if (!target) return new Response("Missing url", { status: 400, headers: CORS });

  let u: URL;
  try { u = new URL(target); } catch { return new Response("Invalid url", { status: 400, headers: CORS }); }
  if (u.protocol !== "https:") return new Response("Only https allowed", { status: 400, headers: CORS });
  if (!hostAllowed(u.hostname)) return new Response("Host not allowed", { status: 403, headers: CORS });

  let upstream: Response;
  try {
    upstream = await fetch(u.toString(), { redirect: "follow", headers: upstreamHeaders(request) });
  } catch (e) {
    return new Response(`Upstream fetch failed: ${(e as Error).message}`, { status: 502, headers: CORS });
  }

  let ct = upstream.headers.get("content-type") || "application/pdf";

  // Drive/HTML interstitial → follow the real download endpoint once.
  if (/text\/html/i.test(ct) && request.method === "GET") {
    const html = await upstream.text();
    const next = driveConfirmUrl(html, u);
    if (next) {
      try {
        upstream = await fetch(next, { redirect: "follow", headers: upstreamHeaders(request) });
        ct = upstream.headers.get("content-type") || "application/pdf";
      } catch { /* fall through to error below */ }
    }
    if (/text\/html/i.test(ct)) {
      return new Response("تعذّر جلب ملف PDF من هذا الرابط (الرابط يعيد صفحة ويب لا ملفًا).", {
        status: 502,
        headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  }

  const headers = new Headers(CORS);
  headers.set("Content-Type", /pdf|octet-stream/i.test(ct) ? "application/pdf" : ct);
  headers.set(
    "Content-Disposition",
    forceDownload
      ? `attachment; filename="document.pdf"`
      : "inline",
  );
  headers.set("Cache-Control", "public, max-age=3600");
  headers.set("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
  for (const k of ["content-length", "content-range", "etag", "last-modified"]) {
    const v = upstream.headers.get(k);
    if (v) headers.set(k, v);
  }

  return new Response(upstream.body, { status: upstream.status, headers });
}

export const Route = createFileRoute("/api/public/pdf-proxy")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      HEAD: ({ request }) => handle(request),
      OPTIONS: () => new Response(null, { status: 204, headers: CORS }),
    },
  },
});
