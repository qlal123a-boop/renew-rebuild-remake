import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({ url: z.string().url() });

function extractListId(url: string): string | null {
  try {
    const u = new URL(url);
    return u.searchParams.get("list");
  } catch {
    return null;
  }
}

export const parseYouTubePlaylist = createServerFn({ method: "POST" })
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const listId = extractListId(data.url);
    if (!listId) return { videos: [], error: "رابط قائمة تشغيل غير صالح" };

    try {
      const res = await fetch(`https://www.youtube.com/playlist?list=${listId}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ManaraBot/1.0)",
          "Accept-Language": "ar,en;q=0.9",
        },
      });
      if (!res.ok) return { videos: [], error: `فشل جلب القائمة (${res.status})` };
      const html = await res.text();

      const seen = new Set<string>();
      const videos: { videoId: string; title: string; url: string }[] = [];

      // Pattern: "playlistVideoRenderer":{"videoId":"XXXX",...,"title":{"runs":[{"text":"YYY"}]
      const re = /"playlistVideoRenderer":\{"videoId":"([^"]+)"[\s\S]*?"title":\{(?:"runs":\[\{"text":"([^"]+)"|"simpleText":"([^"]+)")/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null) {
        const id = m[1];
        const title = (m[2] || m[3] || "").replace(/\\u0026/g, "&").replace(/\\"/g, '"');
        if (!seen.has(id)) {
          seen.add(id);
          videos.push({
            videoId: id,
            title: title || `فيديو ${videos.length + 1}`,
            url: `https://www.youtube.com/watch?v=${id}&list=${listId}`,
          });
        }
      }

      return { videos, error: videos.length ? null : "لم يتم العثور على فيديوهات في القائمة" };
    } catch (e) {
      console.error("playlist parse error", e);
      return { videos: [], error: "تعذّر الاتصال بيوتيوب" };
    }
  });
