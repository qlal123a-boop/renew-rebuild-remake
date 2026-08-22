import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SUBJECTS = [
  "اللغة العربية", "الرياضيات", "العلوم", "اللغة الإنجليزية", "التربية الإسلامية",
  "الاجتماعيات", "التكنولوجيا", "الفيزياء", "الكيمياء", "الأحياء", "التاريخ", "الجغرافيا",
];

type Classified = {
  title: string;
  description: string;
  grade_id: number;
  subject: string;
  semester: 1 | 2;
  kind?: "summary" | "worksheet";
};

async function callGeminiJSON(prompt: string, system: string, preferPro = false): Promise<unknown> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("خدمة الذكاء الاصطناعي غير مفعّلة.");
  const models = preferPro
    ? ["google/gemini-2.5-pro", "google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"]
    : ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];
  let lastErr = "";
  for (const model of models) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (res.ok) {
      const j = await res.json();
      const txt = j?.choices?.[0]?.message?.content ?? "{}";
      try { return JSON.parse(txt); } catch { return {}; }
    }
    lastErr = String(res.status);
    if (res.status === 402) {
      // Out of credits on this model — fall back to the next cheaper model
      continue;
    }
    if (res.status !== 429 && res.status < 500) {
      const t = await res.text();
      throw new Error(`تعذّر التصنيف (${res.status}): ${t.slice(0, 120)}`);
    }
  }
  throw new Error(`الخدمة مشغولة حاليًا (${lastErr})، حاول بعد قليل.`);
}

const SYSTEM_CLASSIFY = `أنت خبير مناهج فلسطينية (وزارة التربية والتعليم العالي).
المواد المسموحة: ${SUBJECTS.join("، ")}.
الصفوف: 1..12 (12 = التوجيهي). الفصول: 1 أو 2.
مهمتك: تصنيف العناوين بدقة وفق المنهاج الفلسطيني الرسمي.
أعد JSON فقط بدون أي شرح خارجي.`;

const SYSTEM_EXPLAIN = `أنت معلم خبير معتمد في المنهاج الفلسطيني الرسمي (وزارة التربية والتعليم). عند كتابة وصف لدرس:
- استخدم عربية فصحى تربوية واضحة دقيقة مثل كتب الوزارة.
- اذكر صراحةً: (1) الفكرة الرئيسية والمفاهيم الأساسية، (2) القواعد/القوانين/النظريات المهمة بصياغتها الرسمية، (3) مثالًا تطبيقيًا واحدًا على الأقل (مع الحل المختصر إن أمكن)، (4) المفردات والمصطلحات المفتاحية، (5) الأهداف التعليمية المتوقعة من الدرس.
- اكتب 5–8 جمل (لا أقل ولا أطول).
- التزم بمصطلحات المنهاج الفلسطيني ولا تخترع مصطلحات أو تنقل من مناهج أخرى.
- اكتب فقرة متماسكة بدون تعداد نقطي وبدون رموز.
- لا تذكر اسم الموقع أو القناة أو المعلم.`;

function extractListId(url: string): string | null {
  try { return new URL(url).searchParams.get("list"); } catch { return null; }
}

const YT_VIDEO_ID_RE = /(?:youtube\.com\/(?:watch\?(?:[^#]*&)*v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;
function extractVideoId(url: string): string | null {
  const m = url.match(YT_VIDEO_ID_RE);
  if (m?.[1]) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

async function fetchYouTubeTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (res.ok) {
      const j = await res.json() as { title?: string };
      if (j.title) return j.title;
    }
  } catch { /* ignore */ }
  return `فيديو ${videoId}`;
}

async function fetchPlaylistVideos(url: string) {
  const listId = extractListId(url);
  // Case 1: no list param → treat as single video
  if (!listId) {
    const vid = extractVideoId(url);
    if (!vid) return { listId: null, videos: [] as { videoId: string; title: string }[], playlistTitle: "" };
    const title = await fetchYouTubeTitle(vid);
    return { listId: null, videos: [{ videoId: vid, title }], playlistTitle: "" };
  }

  const seen = new Set<string>();
  const videos: { videoId: string; title: string }[] = [];
  const unesc = (s: string) =>
    s.replace(/\\u0026/g, "&").replace(/\\"/g, '"').replace(/\\n/g, " ")
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\s+/g, " ").trim();
  const collect = (html: string) => {
    let added = 0;
    // Current YouTube layout: lockupViewModel (contentId + lockupMetadataViewModel title).
    const ids = [...html.matchAll(/"contentId":"([A-Za-z0-9_-]{11})","contentType":"LOCKUP_CONTENT_TYPE_VIDEO"/g)].map((m) => m[1]);
    const lockTitles = [...html.matchAll(/"lockupMetadataViewModel":\{"title":\{"content":"((?:[^"\\]|\\.)*)"/g)].map((m) => unesc(m[1]));
    ids.forEach((id, i) => {
      if (seen.has(id)) return;
      seen.add(id);
      videos.push({ videoId: id, title: ids.length === lockTitles.length ? (lockTitles[i] || "") : "" });
      added++;
    });
    // Legacy layout fallback.
    const re = /"playlistVideoRenderer":\{"videoId":"([^"]+)"[\s\S]*?"title":\{(?:"runs":\[\{"text":"([^"]+)"|"simpleText":"([^"]+)")/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const id = m[1];
      const title = unesc(m[2] || m[3] || "");
      if (!seen.has(id)) { seen.add(id); videos.push({ videoId: id, title }); added++; }
    }
    return added;
  };


  // --- Single fast HTML fetch (desktop layout ships the first ~100 items +
  // the InnerTube key/continuation token we need for the rest).
  let usedHtml = "";
  let playlistTitle = "";
  const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
    Cookie: "CONSENT=YES+cb.20210328-17-p0.en+FX+000",
  };
  try {
    const res = await fetch(`https://www.youtube.com/playlist?list=${listId}&hl=en&persist_hl=1`, { headers: HEADERS });
    if (res.ok) { usedHtml = await res.text(); collect(usedHtml); }
  } catch { /* fall through */ }

  // Fallback layouts only when the fast path produced nothing.
  if (!videos.length) {
    for (const t of [`https://m.youtube.com/playlist?list=${listId}&hl=en`, `https://www.youtube.com/embed/videoseries?list=${listId}`]) {
      try {
        const res = await fetch(t, { headers: HEADERS });
        if (!res.ok) continue;
        const html = await res.text();
        collect(html);
        if (!videos.length) {
          const re3 = /"videoId":"([A-Za-z0-9_-]{11})"/g;
          let m: RegExpExecArray | null;
          while ((m = re3.exec(html)) !== null) {
            const id = m[1];
            if (!seen.has(id)) { seen.add(id); videos.push({ videoId: id, title: "" }); }
          }
        }
        if (videos.length) { usedHtml = usedHtml || html; break; }
      } catch { /* try next */ }
    }
  }

  // ---- Continuation paging: YouTube only ships the first ~100 items in the
  // initial HTML. Keep paging until the playlist is exhausted so no tail
  // (usually the whole "الفصل الثاني" block) is dropped.
  if (usedHtml) {
    const t = usedHtml.match(/"title":\{"runs":\[\{"text":"([^"]+)"\}\][^}]*\},"description"/);
    playlistTitle = (t?.[1] || usedHtml.match(/<title>([^<]+)<\/title>/)?.[1] || "").replace(/\\u0026/g, "&").replace(/ - YouTube$/, "").trim();
    const apiKey = usedHtml.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
    const clientVersion = usedHtml.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1] ?? "2.20240101.00.00";
    let token = usedHtml.match(/"continuationCommand":\{"token":"([^"]+)"/)?.[1] ?? null;
    let guard = 0;
    while (apiKey && token && guard < 100) {
      guard++;
      try {
        const res = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}&prettyPrint=false`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": HEADERS["User-Agent"], "Accept-Language": "en-US,en;q=0.9" },
          body: JSON.stringify({ context: { client: { clientName: "WEB", clientVersion, hl: "en" } }, continuation: token }),
        });
        if (!res.ok) break;
        const text = await res.text();
        const added = collect(text);
        token = text.match(/"continuationCommand":\{"token":"([^"]+)"/)?.[1] ?? null;
        if (!added) break;
      } catch { break; }
    }
  }

  // Hydrate only genuinely missing titles (rare) — capped so it never dominates latency.
  const missing = videos.filter((v) => !v.title).slice(0, 25);
  await Promise.all(missing.map(async (v) => { v.title = await fetchYouTubeTitle(v.videoId); }));
  for (const v of videos) if (!v.title) v.title = `فيديو ${v.videoId}`;
  return { listId, videos, playlistTitle };
}


/** Deterministic Arabic curriculum metadata from a title (never guesses semester wrongly). */
const AR_ORDINALS: Record<string, number> = {
  "الأولى": 1, "الاولى": 1, "الأول": 1, "الاول": 1, "1": 1,
  "الثانية": 2, "الثاني": 2, "2": 2,
  "الثالثة": 3, "الثالث": 3, "3": 3,
  "الرابعة": 4, "الرابع": 4, "4": 4,
  "الخامسة": 5, "الخامس": 5, "5": 5,
  "السادسة": 6, "السادس": 6, "6": 6,
};
export function detectCurriculumMeta(title: string, playlistTitle = "") {
  const src = `${title} ${playlistTitle}`;
  // Broad keyword matching: "الفصل الثاني", "الفصل الدراسي الثاني", "ف2", "الترم الثاني", "S2"…
  const semanticSem = (s: string): 1 | 2 | null => {
    if (/(الفصل|الترم|الفصل\s*الدراسي)\s*(الدراسي\s*)?(الثاني|الثانى|الثانية)/.test(s)) return 2;
    if (/(الفصل|الترم|الفصل\s*الدراسي)\s*(الدراسي\s*)?(الأول|الاول|الأولى|الاولى)/.test(s)) return 1;
    if (/(?:ال)?(?:فصل|ترم|ف|term|sem|s)\s*[.:]?\s*2(?:$|\D)/i.test(s)) return 2;
    if (/(?:ال)?(?:فصل|ترم|ف|term|sem|s)\s*[.:]?\s*1(?:$|\D)/i.test(s)) return 1;
    if (/second\s+(semester|term)/i.test(s)) return 2;
    if (/first\s+(semester|term)/i.test(s)) return 1;
    return null;
  };
  // The video's own title wins; the playlist title is only a fallback signal.
  const semester = semanticSem(title) ?? semanticSem(playlistTitle);
  const unitM = src.match(/الوحدة\s*([^\s،.\-–]+)/);
  const lessonM = src.match(/الدرس\s*([^\s،.\-–]+)/);
  const gradeM = src.match(/الصف\s*([^\s،.\-–]+)/);
  return {
    semester,
    unit: unitM ? `الوحدة ${unitM[1]}` : null,
    unitNo: unitM ? (AR_ORDINALS[unitM[1]] ?? null) : null,
    lesson: lessonM ? `الدرس ${lessonM[1]}` : null,
    gradeWord: gradeM ? gradeM[1] : null,
  };
}


const playlistInput = z.object({
  url: z.string().url(),
  defaultGradeId: z.number().int().min(1).max(12).optional(),
  defaultSubject: z.string().optional(),
  /** بداية الدفعة (للقوائم الطويلة) */
  offset: z.number().int().min(0).optional(),
  /** حجم الدفعة (افتراضي 20) */
  limit: z.number().int().min(1).max(40).optional(),
});

/* ============================================================================
 * Bulk pipeline (fast path)
 * 1) aiFetchPlaylist  — one scrape of the whole playlist, no AI.
 * 2) aiClassifyVideos — one AI call per chunk; the client fires chunks in
 *    parallel, so a 100-video playlist finishes in seconds instead of minutes.
 * ==========================================================================*/

export const aiFetchPlaylist = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ url: z.string().url() }).parse(d))
  .handler(async ({ data }) => {
    const { listId, videos, playlistTitle } = await fetchPlaylistVideos(data.url);
    return {
      playlistTitle,
      total: videos.length,
      videos: videos.map((v, i) => ({
        videoId: v.videoId,
        title: v.title,
        position: i,
        thumbnailUrl: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
        video_url: `https://www.youtube.com/watch?v=${v.videoId}${listId ? `&list=${listId}` : ""}`,
      })),
      error: videos.length ? null : "لم يتم العثور على فيديوهات.",
    };
  });

const classifyInput = z.object({
  videos: z.array(z.object({
    videoId: z.string(),
    title: z.string(),
    position: z.number().int().min(0),
    video_url: z.string(),
  })).min(1).max(30),
  playlistTitle: z.string().optional(),
  defaultGradeId: z.number().int().min(1).max(12).optional(),
  defaultSubject: z.string().optional(),
});

export const aiClassifyVideos = createServerFn({ method: "POST" })
  .inputValidator((d) => classifyInput.parse(d))
  .handler(async ({ data }) => {
    const { videos } = data;
    const playlistTitle = data.playlistTitle ?? "";
    const titles = videos.map((v, i) => `${i + 1}. ${v.title}`).join("\n");
    const hint = data.defaultGradeId || data.defaultSubject
      ? `\n\nالافتراضات (استخدمها إن لم تتمكن من الاستنتاج): grade_id=${data.defaultGradeId ?? "?"}, subject="${data.defaultSubject ?? "?"}".`
      : "";
    const prompt = `لديك قائمة عناوين فيديوهات تعليمية من قائمة تشغيل يوتيوب${playlistTitle ? ` بعنوان: "${playlistTitle}"` : ""}. صنّف كلًا منها وفق المنهاج الفلسطيني، واكتب ملخصًا تعليميًا مفصّلًا.
${titles}${hint}

أعد JSON بهذا الشكل بالضبط:
{ "items": [ { "index": 1, "title": "عنوان منظّف بالعربية", "description": "ملخّص تعليمي منسّق", "grade_id": 9, "subject": "الرياضيات", "semester": 1, "unit": "الوحدة الأولى" }, ... ] }
- نظّف العنوان (احذف رموز الحلقة، الترميز الزائد، اسم القناة) مع الإبقاء على ذكر الوحدة/الدرس إن وُجد.
- semester: 1 للفصل الأول و2 للفصل الثاني — استنتجها من عنوان الفيديو نفسه إن ذُكر.
- unit: اسم الوحدة أو الفصل إن ظهر في العنوان (مثل "الوحدة الأولى")، أو "" إن لم يظهر.
- description: ملخّص تعليمي مفصّل بصيغة نص عادي بهذا الترتيب الحرفي وبأسطر منفصلة (استخدم \\n):
  "🎯 الأهداف التعليمية:" ثم 3 أهداف كل واحد في سطر يبدأ بـ "- ".
  "📌 النقاط الرئيسية:" ثم 4-6 نقاط مختصرة دقيقة كل واحدة في سطر يبدأ بـ "- ".
  "❓ أسئلة للنقاش:" ثم 3 أسئلة كل واحد في سطر يبدأ بـ "- ".
- التزم بمصطلحات المنهاج الفلسطيني الرسمي فقط، والتزم بترتيب الإدخال نفسه ونفس عدد العناصر.`;

    let arr: Array<Partial<Classified> & { index?: number; unit?: string }> = [];
    let warn: string | null = null;
    try {
      const parsed = await callGeminiJSON(prompt, `${SYSTEM_CLASSIFY}\n\n${SYSTEM_EXPLAIN}`, false);
      arr = (parsed as { items?: Array<Partial<Classified> & { index?: number; unit?: string }> })?.items ?? [];
    } catch (e) {
      warn = (e as Error).message;
    }

    const items = videos.map((v, i) => {
      const c = arr.find((x) => x.index === i + 1) ?? arr[i] ?? {};
      const meta = detectCurriculumMeta(v.title, playlistTitle);
      const fallbackSubject = data.defaultSubject && SUBJECTS.includes(data.defaultSubject)
        ? data.defaultSubject
        : "العلوم";
      const subject = SUBJECTS.includes(c.subject ?? "") ? c.subject! : fallbackSubject;
      const grade_id = (c.grade_id && c.grade_id >= 1 && c.grade_id <= 12) ? c.grade_id : (data.defaultGradeId ?? 9);
      const semester = (meta.semester ?? (c.semester === 2 ? 2 : 1)) as 1 | 2;
      return {
        videoId: v.videoId,
        position: v.position,
        video_url: v.video_url,
        title: (v.title || c.title || `درس ${v.position + 1}`).trim(),
        description: (c.description || "").trim(),
        grade_id,
        subject,
        semester,
        unit: meta.unit ?? (c.unit ? String(c.unit) : null),
        lesson: meta.lesson,
      };
    });
    return { items, error: warn };
  });

export const aiImportPlaylist = createServerFn({ method: "POST" })
  .inputValidator((d) => playlistInput.parse(d))
  .handler(async ({ data }) => {
    const { listId, videos: all, playlistTitle } = await fetchPlaylistVideos(data.url);
    if (!all.length) return { items: [], total: 0, nextOffset: null as number | null, error: "لم يتم العثور على فيديوهات." };

    const offset = data.offset ?? 0;
    const limit = data.limit ?? 20;
    const videos = all.slice(offset, offset + limit);
    const nextOffset = offset + limit < all.length ? offset + limit : null;
    if (!videos.length) return { items: [], total: all.length, nextOffset: null as number | null, error: null };

    const titles = videos.map((v, i) => `${i + 1}. ${v.title}`).join("\n");
    const hint = data.defaultGradeId || data.defaultSubject
      ? `\n\nالافتراضات (استخدمها إن لم تتمكن من الاستنتاج): grade_id=${data.defaultGradeId ?? "?"}, subject="${data.defaultSubject ?? "?"}".`
      : "";
    const prompt = `لديك قائمة عناوين فيديوهات تعليمية من قائمة تشغيل يوتيوب${playlistTitle ? ` بعنوان: "${playlistTitle}"` : ""}. صنّف كلًا منها وفق المنهاج الفلسطيني، واكتب ملخصًا تعليميًا مفصّلًا.
${titles}${hint}

أعد JSON بهذا الشكل بالضبط:
{ "items": [ { "index": 1, "title": "عنوان منظّف بالعربية", "description": "ملخّص تعليمي منسّق", "grade_id": 9, "subject": "الرياضيات", "semester": 1 }, ... ] }
- نظّف العنوان (احذف رموز الحلقة، الترميز الزائد، اسم القناة) مع الإبقاء على ذكر الوحدة/الدرس إن وُجد.
- semester: 1 للفصل الأول و2 للفصل الثاني — استنتجها من عنوان الفيديو نفسه إن ذُكر.
- description: ملخّص تعليمي مفصّل بصيغة نص عادي بهذا الترتيب الحرفي وبأسطر منفصلة (استخدم \\n):
  "🎯 الأهداف التعليمية:" ثم 3 أهداف كل واحد في سطر يبدأ بـ "- ".
  "📌 النقاط الرئيسية:" ثم 4-6 نقاط مختصرة دقيقة كل واحدة في سطر يبدأ بـ "- " (مفاهيم، قواعد/قوانين بصياغتها الرسمية، مثال تطبيقي واحد).
  "❓ أسئلة للنقاش:" ثم 3 أسئلة كل واحد في سطر يبدأ بـ "- ".
- التزم بمصطلحات المنهاج الفلسطيني الرسمي فقط، ولا تخترع محتوى خارج المنهاج.
- التزم بترتيب الإدخال نفسه ونفس عدد العناصر.`;


    // Classification failure must NOT drop the batch: fall back to raw titles + defaults.
    let arr: Array<Partial<Classified> & { index?: number }> = [];
    let warn: string | null = null;
    try {
      const parsed = await callGeminiJSON(prompt, `${SYSTEM_CLASSIFY}\n\n${SYSTEM_EXPLAIN}`, true);
      arr = (parsed as { items?: Array<Partial<Classified> & { index?: number }> })?.items ?? [];
    } catch (e) {
      warn = `تعذّر تصنيف دفعة (${offset + 1}-${offset + videos.length}): ${(e as Error).message}`;
    }

    const items = videos.map((v, i) => {
      const c = arr.find((x) => x.index === i + 1) ?? arr[i] ?? {};
      const meta = detectCurriculumMeta(v.title, playlistTitle);
      const subject = SUBJECTS.includes(c.subject ?? "") ? c.subject! : (data.defaultSubject ?? "العلوم");
      const grade_id = (c.grade_id && c.grade_id >= 1 && c.grade_id <= 12) ? c.grade_id : (data.defaultGradeId ?? 9);
      // The video's own title wins over the model: it is the only reliable
      // signal that a playlist mixes الفصل الأول + الفصل الثاني.
      const semester = (meta.semester ?? (c.semester === 2 ? 2 : 1)) as 1 | 2;
      return {
        videoId: v.videoId,
        video_url: `https://www.youtube.com/watch?v=${v.videoId}${listId ? `&list=${listId}` : ""}`,
        title: (v.title || c.title || `درس ${offset + i + 1}`).trim(),
        description: (c.description || "").trim(),
        grade_id,
        subject,
        semester,
        unit: meta.unit,
        lesson: meta.lesson,
      };
    });
    return { items, total: all.length, nextOffset, error: warn, playlistTitle };
  });


const scrapeInput = z.object({
  url: z.string().url(),
  defaultGradeId: z.number().int().min(1).max(12).optional(),
  defaultSubject: z.string().optional(),
  /** true = صنّف كل ملف بمادّته المستقلّة (لا تفرض مادة افتراضية) */
  allSubjects: z.boolean().optional(),
  /** "worksheet" | "summary" | "exam" | "enrichment" | "review" | "auto" */
  kind: z.enum(["worksheet", "summary", "exam", "enrichment", "review", "auto"]).optional(),
  /** أقصى عمق للتنقّل الداخلي (0..2). الافتراضي 2 لصفحات المدوّنات (بحث → منشور → صفحة تنزيل). */
  maxDepth: z.number().int().min(0).max(2).optional(),
});

/** Convert a Google Drive /file/d/{id}/view or ?id={id} URL into a direct-download URL. */
function normalizeDriveUrl(raw: string): string {
  const url = raw.replace(/&amp;/gi, "&").trim();
  try {
    const u = new URL(url);
    if (!/drive\.google\.com|docs\.google\.com/i.test(u.hostname)) return url;
    // /file/d/{id}/view or /file/d/{id}
    const m1 = u.pathname.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/);
    if (m1) return `https://drive.google.com/uc?export=download&id=${m1[1]}`;
    // open?id={id} or uc?id={id}
    const id = u.searchParams.get("id");
    if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    // /document/d/{id}
    const m2 = u.pathname.match(/\/document\/d\/([A-Za-z0-9_-]{10,})/);
    if (m2) return `https://docs.google.com/document/d/${m2[1]}/export?format=pdf`;
    return url;
  } catch { return url; }
}

/** Extract a clean human title for a page (prefers og:title / <title> / h1). */
function extractPageTitle(html: string): string {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return decodeHtmlEntities(og[1]).trim();
  const tw = html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i);
  if (tw?.[1]) return decodeHtmlEntities(tw[1]).trim();
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1?.[1]) {
    const t = h1[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (t) return decodeHtmlEntities(t);
  }
  const ti = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (ti?.[1]) {
    const t = ti[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    return decodeHtmlEntities(t.split(/\s+[|\-–—]\s+/)[0] || t);
  }
  return "";
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

/**
 * True when the anchor text is a generic call-to-action ("اضغط هنا للمشاهدة والتحميل",
 * "Download", "عرض وتحميل"…) rather than the real resource name.
 */
function isGenericLabel(raw: string): boolean {
  const t = raw.replace(/[«»"'()[\]:.،,\-–—_]+/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return true;
  if (t.length < 8 && /^(download|here|pdf|click|view|open|link)$/i.test(t)) return true;
  // Arabic / English CTA phrases — match anywhere, not just exact single words.
  const cta = /(اضغط|انقر|اضغطي|للتحميل|للتنزيل|للمشاهدة|للعرض|تحميل\s*الملف|تنزيل\s*الملف|حمل\s*من\s*هنا|من\s*هنا|هنا\b|عرض\s*و\s*تحميل|عرض\s*و\s*تنزيل|مشاهدة\s*و\s*تحميل|رابط\s*التحميل|download|click\s*here|view\s*(and|&)\s*download|open\s*file)/i;
  if (cta.test(t)) {
    // Long descriptive text that merely contains "تحميل" is still useful only if it also
    // carries subject-ish words; treat pure CTA phrases (short) as generic.
    const words = t.split(" ").filter(Boolean);
    if (words.length <= 8) return true;
  }
  if (/^(download|تحميل|تنزيل|هنا|here|pdf|click|اضغط|عرض|view|مشاهدة|رابط)$/i.test(t)) return true;
  return false;
}

/** Clean a candidate title: strip site suffixes and CTA leftovers. */
function cleanTitle(t: string): string {
  return t
    .replace(/\s*[|–—-]\s*(موقع|منصة)?[^|–—-]{0,40}$/u, (m) => (/(موقع|منصة|blogspot|blogger|\.com)/i.test(m) ? "" : m))
    .replace(/\s+/g, " ")
    .trim();
}

async function extractFileLinks(html: string, baseUrl: string, pageTitle?: string) {
  const base = new URL(baseUrl);
  const linkRe = /<a\s+[^>]*href=["']([^"']+\.(?:pdf|docx?|pptx?))(?:\?[^"']*)?["'][^>]*>([\s\S]*?)<\/a>/gi;
  const found = new Map<string, string>();
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    try {
      const abs = new URL(m[1], base).toString();
      const rawEl = m[0];
      const raw = decodeHtmlEntities(m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
      // Secondary sources for a real name: title=""/aria-label="" on the anchor, or the img alt inside it.
      const attr = rawEl.match(/\stitle=["']([^"']+)["']/i)?.[1]
        || rawEl.match(/\saria-label=["']([^"']+)["']/i)?.[1]
        || rawEl.match(/<img[^>]+alt=["']([^"']+)["']/i)?.[1]
        || "";
      const filename = decodeURIComponent(abs.split("/").pop() || "").replace(/\.[a-z]+$/i, "").replace(/[_+]+/g, " ").trim();
      const candidates = [raw, decodeHtmlEntities(attr), pageTitle || "", filename];
      const label = cleanTitle(candidates.find((c) => c && !isGenericLabel(c)) || pageTitle || filename || "ملف");
      if (!found.has(abs)) found.set(abs, label.slice(0, 200));
    } catch { /* ignore */ }
  }
  const driveRe = /<a\s+[^>]*href=["'](https?:\/\/(?:drive\.google\.com|docs\.google\.com|www\.dropbox\.com|mega\.nz|mediafire\.com|4shared\.com)[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  while ((m = driveRe.exec(html)) !== null) {
    try {
      const abs = normalizeDriveUrl(m[1]);
      const rawEl = m[0];
      const raw = decodeHtmlEntities(m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
      const attr = rawEl.match(/\stitle=["']([^"']+)["']/i)?.[1]
        || rawEl.match(/\saria-label=["']([^"']+)["']/i)?.[1]
        || "";
      const candidates = [raw, decodeHtmlEntities(attr), pageTitle || ""];
      const label = cleanTitle(candidates.find((c) => c && !isGenericLabel(c)) || pageTitle || "ملف");
      if (!found.has(abs)) found.set(abs, label.slice(0, 200));
    } catch { /* ignore */ }
  }
  return Array.from(found.entries()).map(([url, label]) => ({ url, label }));
}


/** Extract internal links with anchor text — used to prioritize post URLs and "View & Download" pages. */
async function extractInternalLinksScored(html: string, baseUrl: string, max: number, opts?: { preferPostPattern?: boolean; preferDownloadText?: boolean }) {
  const base = new URL(baseUrl);
  const re = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Set<string>();
  type L = { url: string; score: number };
  const out: L[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const abs = new URL(m[1], base);
      if (abs.hostname !== base.hostname) continue;
      const u = abs.toString().split("#")[0];
      if (u === baseUrl) continue;
      if (/\.(jpg|jpeg|png|gif|webp|svg|css|js|ico)(\?|$)/i.test(u)) continue;
      if (/\/(feeds|comments)(\/|$)/i.test(u)) continue;
      if (seen.has(u)) continue;
      const text = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      let score = 0;
      // Blogger-style post URLs: /YYYY/MM/slug.html
      if (opts?.preferPostPattern && /\/\d{4}\/\d{2}\/[^/]+\.html?$/i.test(u)) score += 10;
      // "View & Download" / "عرض وتنزيل" / "تحميل" style anchors
      if (opts?.preferDownloadText && /(view\s*(&|and)\s*download|download|عرض\s*(و|و?تنزيل|و?تحميل)|تحميل|تنزيل|اضغط\s*هنا)/i.test(text)) score += 15;
      // Deprioritize pagination/label noise
      if (/\/search\/label\//i.test(u)) score -= 5;
      if (/[?&](updated-max|max-results|start)=/i.test(u)) score -= 5;
      seen.add(u); out.push({ url: u, score });
    } catch { /* ignore */ }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, max).map((x) => x.url);
}

export const aiScrapeWorksheets = createServerFn({ method: "POST" })
  .inputValidator((d) => scrapeInput.parse(d))
  .handler(async ({ data }) => {
    const fetchHtml = async (u: string): Promise<string> => {
      const res = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "ar,en;q=0.9" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    };

    let html = "";
    try { html = await fetchHtml(data.url); }
    catch (e) { return { items: [], error: `تعذّر الاتصال بالرابط (${(e as Error).message})` }; }

    const aggregated = new Map<string, string>();
    for (const it of await extractFileLinks(html, data.url)) aggregated.set(it.url, it.label);

    const maxDepth = data.maxDepth ?? 2;
    // Level 1: from index/category — prefer real post URLs (Blogger `/YYYY/MM/slug.html`).
    if (maxDepth >= 1) {
      const inner = await extractInternalLinksScored(html, data.url, 20, { preferPostPattern: true });
      const level2Pages: { url: string; html: string }[] = [];
      await Promise.all(inner.map(async (u) => {
        try {
          const sub = await fetchHtml(u);
          const postTitle = extractPageTitle(sub);
          for (const it of await extractFileLinks(sub, u, postTitle)) if (!aggregated.has(it.url)) aggregated.set(it.url, it.label);
          if (maxDepth >= 2) level2Pages.push({ url: u, html: sub });
        } catch { /* ignore */ }
      }));
      // Level 2: from each post follow "View & Download" / "عرض وتنزيل" type links.
      if (maxDepth >= 2) {
        await Promise.all(level2Pages.map(async (p) => {
          const parentTitle = extractPageTitle(p.html);
          const deeper = await extractInternalLinksScored(p.html, p.url, 5, { preferDownloadText: true });
          await Promise.all(deeper.map(async (u2) => {
            try {
              const sub2 = await fetchHtml(u2);
              // Prefer the deeper page's own title; fall back to the parent post's title
              const t2 = extractPageTitle(sub2) || parentTitle;
              for (const it of await extractFileLinks(sub2, u2, t2)) if (!aggregated.has(it.url)) aggregated.set(it.url, it.label);
            } catch { /* ignore */ }
          }));
        }));
      }
    }

    let links = Array.from(aggregated.entries()).map(([url, label]) => ({ url, label }));
    links = links.slice(0, 80);
    if (!links.length) return { items: [], error: "لم يتم العثور على ملفات PDF/Word/Drive في الصفحة أو روابطها الداخلية." };

    const kindHint = data.kind && data.kind !== "auto"
      ? `جميع العناصر من نوع "${data.kind}".`
      : `صنّف "kind" لكل عنصر: "summary" | "worksheet" | "exam" | "enrichment" | "review".`;
    const subjectHint = data.allSubjects
      ? `صنّف "subject" لكل ملف مستقلًا وفق محتواه الفعلي، ولا تفرض مادة موحّدة.`
      : (data.defaultSubject ? `الافتراضي إن لم تستطع الاستنتاج: subject="${data.defaultSubject}".` : "");
    const list = links.map((l, i) => `${i + 1}. ${l.label}  —  ${l.url}`).join("\n");
    const prompt = `لديك قائمة ملفات تعليمية (PDF/Word/PowerPoint) من موقع فلسطيني. صنّف كل ملف للمنهاج الفلسطيني بدقة.
${kindHint}
${subjectHint}
${data.defaultGradeId ? `الصف الافتراضي: ${data.defaultGradeId}.` : ""}
${list}

أعد JSON:
{ "items": [ { "index": 1, "title": "عنوان نظيف بالعربية", "description": "3-5 جمل تشرح المحتوى", "grade_id": 9, "subject": "الرياضيات", "unit": "الوحدة الأولى", "lesson": "الدرس الثاني", "kind": "worksheet" }, ... ] }
استخدم نفس ترتيب الإدخال.`;

    let parsed: unknown;
    try { parsed = await callGeminiJSON(prompt, `${SYSTEM_CLASSIFY}\n\n${SYSTEM_EXPLAIN}`, true); }
    catch (e) { return { items: [], error: (e as Error).message }; }
    const arr = (parsed as { items?: Array<{ index?: number; title?: string; description?: string; grade_id?: number; subject?: string; unit?: string; lesson?: string; kind?: string }> })?.items ?? [];
    const validKinds = ["summary", "worksheet", "exam", "enrichment", "review"] as const;
    type Kind = typeof validKinds[number];
    const items = links.map((l, i) => {
      const c = arr.find((x) => x.index === i + 1) ?? arr[i] ?? {};
      const subject = SUBJECTS.includes(c.subject ?? "")
        ? c.subject!
        : (data.allSubjects ? "غير مصنّف" : (data.defaultSubject ?? "العلوم"));
      const grade_id = (c.grade_id && c.grade_id >= 1 && c.grade_id <= 12) ? c.grade_id : (data.defaultGradeId ?? 9);
      const rawKind = (data.kind && data.kind !== "auto") ? data.kind : (c.kind || "worksheet");
      const kind: Kind = (validKinds as readonly string[]).includes(rawKind) ? rawKind as Kind : "worksheet";
      // Never surface a generic CTA ("اضغط هنا للمشاهدة والتحميل") as a title:
      // prefer a real scraped label, then the AI-cleaned title, then the filename.
      const filename = decodeURIComponent((l.url.split("?")[0].split("/").pop() || ""))
        .replace(/\.[a-z0-9]+$/i, "").replace(/[_+%\-]+/g, " ").replace(/\s+/g, " ").trim();
      const titleCandidates = [l.label, c.title, filename].filter((t): t is string => !!t && !isGenericLabel(t));
      const title = cleanTitle(titleCandidates[0] || `${subject} — الصف ${grade_id}`).slice(0, 200);
      return {
        url: l.url,
        title,
        description: (c.description || "").trim(),
        grade_id,
        subject,
        unit: (c.unit || "").trim(),
        lesson: (c.lesson || "").trim(),
        kind,
        source: new URL(data.url).hostname,
      };

    });
    return { items, error: null };
  });

/** Pick a certificate theme via AI; falls back to keyword detection on failure */
const themeInput = z.object({ title: z.string().min(1), subject: z.string().optional() });
export const aiPickCertificateTheme = createServerFn({ method: "POST" })
  .inputValidator((d) => themeInput.parse(d))
  .handler(async ({ data }) => {
    try {
      const r = await callGeminiJSON(
        `عنوان الكورس: "${data.title}". المادة: "${data.subject ?? ""}". اختر تصميم شهادة الإتمام الأنسب.`,
        `اختر واحدًا فقط من: traditional, modern-tech, academic, nature.
- traditional: للقرآن/التجويد/التربية الإسلامية (ذهبي/زمردي بنقوش).
- modern-tech: للبرمجة/التكنولوجيا (تدرج تقني).
- academic: للرياضيات/الفيزياء/اللغات (كلاسيكي ملكي).
- nature: للأحياء/الجغرافيا/العلوم البيئية (أخضر).
أعد JSON: {"theme":"<one_of>"}`,
        false,
      );
      const theme = (r as { theme?: string })?.theme;
      if (["traditional", "modern-tech", "academic", "nature"].includes(theme || "")) return { theme: theme as string };
    } catch { /* ignore, fall through */ }
    return { theme: null };
  });

/* ============================================================
 * Smart Course Importer — playlist URL → classified course + lessons
 * ============================================================ */

export const COURSE_CATEGORIES = [
  "programming", "arabic", "math", "tajweed", "science", "english", "other",
] as const;
export type CourseCategory = typeof COURSE_CATEGORIES[number];

const courseInput = z.object({
  url: z.string().url(),
  defaultGradeId: z.number().int().min(1).max(12).optional(),
  defaultSubject: z.string().optional(),
});

export const aiImportCourse = createServerFn({ method: "POST" })
  .inputValidator((d) => courseInput.parse(d))
  .handler(async ({ data }) => {
    const { listId, videos } = await fetchPlaylistVideos(data.url);
    if (!videos.length) return { course: null, lessons: [], error: "لم يتم العثور على فيديوهات في القائمة." };

    const titles = videos.slice(0, 12).map((v, i) => `${i + 1}. ${v.title}`).join("\n");
    const prompt = `لديك قائمة تشغيل تعليمية على يوتيوب. صنّفها ككورس متكامل.
أول ${Math.min(12, videos.length)} فيديو:
${titles}

أعد JSON:
{
  "course_title": "عنوان الكورس بالعربية (واضح وموجز)",
  "course_description": "وصف للكورس 4-6 جمل: ماذا سيتعلم الطالب، المتطلبات السابقة، الفائدة العملية، نوع المحتوى",
  "category": "one of: programming | arabic | math | tajweed | science | english | other",
  "subject": "اسم المادة من المنهاج الفلسطيني",
  "grade_id": رقم الصف الأقرب من 1-12,
  "lessons": [
    { "index": 1, "title": "عنوان الدرس نظيف بالعربية", "description": "وصف 3-5 جمل عن محتوى الدرس وأهدافه" }
  ]
}
- صنّف category بدقة: programming للبرمجة/الحاسوب، tajweed للقرآن/التلاوة/التجويد، arabic للعربية، math للرياضيات، science للعلوم/الفيزياء/الكيمياء/الأحياء، english للإنجليزية، other لغير ذلك.
- لكل فيديو في القائمة الكاملة (لا تقتصر على الأوائل) ضع عنصرًا في lessons بنفس الترتيب.
- اعرض ${videos.length} درس بالضبط.`;

    let parsed: { course_title?: string; course_description?: string; category?: string; subject?: string; grade_id?: number; lessons?: Array<{ index?: number; title?: string; description?: string }> } = {};
    try {
      parsed = (await callGeminiJSON(prompt, `${SYSTEM_CLASSIFY}\n\n${SYSTEM_EXPLAIN}`, true)) as typeof parsed;
    } catch (e) {
      return { course: null, lessons: [], error: (e as Error).message };
    }

    const category = (COURSE_CATEGORIES as readonly string[]).includes(parsed.category || "")
      ? (parsed.category as CourseCategory)
      : "other";
    const subject = SUBJECTS.includes(parsed.subject ?? "") ? parsed.subject! : (data.defaultSubject ?? "اللغة العربية");
    // grade is optional — allow null when caller did not supply and AI could not determine
    const grade_id: number | null = (parsed.grade_id && parsed.grade_id >= 1 && parsed.grade_id <= 12)
      ? parsed.grade_id
      : (data.defaultGradeId ?? null);

    const lessons = videos.map((v, i) => {
      const c = (parsed.lessons || []).find((x) => x.index === i + 1) ?? (parsed.lessons || [])[i] ?? {};
      return {
        videoId: v.videoId,
        video_url: `https://www.youtube.com/watch?v=${v.videoId}${listId ? `&list=${listId}` : ""}`,
        // Preserve YouTube's original title verbatim; only fall back to AI/generated titles
        title: (v.title || c.title || `الدرس ${i + 1}`).trim(),
        description: (c.description || "").trim(),
        position: i,
      };
    });

    return {
      course: {
        title: (parsed.course_title || videos[0].title.split("|")[0].trim() || "كورس جديد").slice(0, 200),
        description: (parsed.course_description || "").trim(),
        category,
        subject,
        grade_id,
        thumbnail_url: `https://i.ytimg.com/vi/${videos[0].videoId}/hqdefault.jpg`,
      },
      lessons,
      error: null,
    };
  });

/* ============================================================
 * Smart Library Book Importer — crawl a books site (Hindawi, etc.)
 * and detect PDF books with title/author/cover.
 * ============================================================ */

const booksInput = z.object({
  url: z.string().url(),
  category: z.enum(["textbook", "reading"]).optional(),
  maxDepth: z.number().int().min(0).max(2).optional(),
});

export const aiImportBooks = createServerFn({ method: "POST" })
  .inputValidator((d) => booksInput.parse(d))
  .handler(async ({ data }) => {
    const fetchHtml = async (u: string): Promise<string> => {
      const res = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "ar,en;q=0.9" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    };

    let html = "";
    try { html = await fetchHtml(data.url); }
    catch (e) { return { books: [], error: `تعذّر الاتصال بالرابط (${(e as Error).message})` }; }

    // Collect PDF links from the seed page + inner pages (books listings usually link to each book's own page).
    const aggregated = new Map<string, { url: string; label: string; sourcePage?: string; cover?: string | null }>();

    const extractCover = (h: string): string | null => {
      const og = h.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      if (og?.[1]) return og[1];
      const img = h.match(/<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp))[^"']*["']/i);
      return img?.[1] || null;
    };

    // Seed page
    const seedTitle = extractPageTitle(html);
    for (const it of await extractFileLinks(html, data.url, seedTitle)) {
      if (/\.pdf(\?|$)/i.test(it.url) || /drive\.google\.com|docs\.google\.com/i.test(it.url)) {
        aggregated.set(it.url, { url: it.url, label: it.label, sourcePage: data.url, cover: extractCover(html) });
      }
    }

    const maxDepth = data.maxDepth ?? 2;
    if (maxDepth >= 1) {
      const inner = await extractInternalLinksScored(html, data.url, 40, { preferDownloadText: true });
      await Promise.all(inner.map(async (u) => {
        try {
          const sub = await fetchHtml(u);
          const t = extractPageTitle(sub);
          const cover = extractCover(sub);
          for (const it of await extractFileLinks(sub, u, t)) {
            if (/\.pdf(\?|$)/i.test(it.url) || /drive\.google\.com|docs\.google\.com/i.test(it.url)) {
              if (!aggregated.has(it.url)) aggregated.set(it.url, { url: it.url, label: it.label, sourcePage: u, cover });
            }
          }
        } catch { /* ignore */ }
      }));
    }

    const items = Array.from(aggregated.values()).slice(0, 60);
    if (!items.length) return { books: [], error: "لم يتم العثور على كتب PDF في الصفحة أو روابطها الداخلية." };

    // Ask AI to normalize title/author/description per book
    const list = items.map((it, i) => `${i + 1}. ${it.label}  —  ${it.url}`).join("\n");
    const prompt = `لديك قائمة كتب PDF مستخرجة من موقع (قد يكون هنداوي أو مشابه). لكل كتاب استخرج:
- title: عنوان الكتاب النظيف بالعربية
- author: اسم المؤلف إن أمكن استنتاجه من العنوان أو الرابط، وإلا فارغ
- description: جملتان تصفان موضوع الكتاب

${list}

أعد JSON: { "items": [ { "index": 1, "title": "...", "author": "...", "description": "..." } ] }
استخدم نفس ترتيب الإدخال ونفس العدد.`;

    let parsed: { items?: Array<{ index?: number; title?: string; author?: string; description?: string }> } = {};
    try {
      parsed = (await callGeminiJSON(prompt, SYSTEM_CLASSIFY, false)) as typeof parsed;
    } catch {
      // fall through — return with raw labels
    }
    const arr = parsed.items || [];

    const books = items.map((it, i) => {
      const c = arr.find((x) => x.index === i + 1) ?? arr[i] ?? {};
      const filename = decodeURIComponent(it.url.split("/").pop() || "").replace(/\.[a-z]+$/i, "");
      return {
        title: (c.title || it.label || filename || "كتاب").slice(0, 200).trim(),
        author: (c.author || "").trim() || null,
        description: (c.description || "").trim() || null,
        pdf_url: it.url,
        cover_url: it.cover || null,
        category: (data.category || "reading") as "textbook" | "reading",
      };
    });

    return { books, error: null };
  });

