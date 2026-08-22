import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { VISUAL_PROMPT, normalizeVisuals } from "./edu-visual-schema";
import { AI_ERROR_AR, callAiGateway, parseJsonLoose, type GatewayMessage } from "./ai-gateway";

/**
 * Free unlimited AI summary generator, grounded strictly in the Palestinian curriculum.
 * Accepts a lesson name and/or a photo of the textbook page.
 * All gateway concerns (model fallback, retries, timeouts, error codes) live in ai-gateway.ts.
 */
const inputSchema = z.object({
  lesson: z.string().max(300).optional(),
  gradeId: z.number().int().min(1).max(12),
  subject: z.string().min(1).max(80),
  imageDataUrl: z.string().startsWith("data:image/").max(8_000_000).optional(),
});

const SYSTEM = `أنت معلم فلسطيني خبير معتمد لدى وزارة التربية والتعليم العالي الفلسطينية.
مهمتك: إنتاج ملخّص دراسي احترافي منظّم وغني بصريًا لدرس من المنهاج الفلسطيني.

قيود إلزامية:
- اعتمد حصريًا على المنهاج الفلسطيني الرسمي وعلى صورة صفحة الكتاب المرفقة إن وُجدت.
- لغة عربية فصحى تربوية دقيقة (أو الإنجليزية إن كانت المادة اللغة الإنجليزية).
- بدون مقدمات أو خواتيم إنشائية — محتوى مباشر ومركّز.
- التسلسل الإلزامي: المفاهيم الأساسية ← الشرح ← ملاحظات مهمة ← أمثلة ← وسائل بصرية ← أسئلة مراجعة.
- اكتب شرحًا وافيًا (explanation) من 3 إلى 6 فقرات قصيرة يشرح الدرس خطوة بخطوة.
${VISUAL_PROMPT}

أعد JSON فقط بالشكل:
{
  "title": "عنوان الملخّص",
  "overview": "فقرة تمهيدية من سطرين",
  "keyPoints": ["مفهوم أساسي 1", "مفهوم أساسي 2"],
  "explanation": ["فقرة شرح 1", "فقرة شرح 2"],
  "notes": ["ملاحظة مهمة 1"],
  "definitions": [{ "term": "المصطلح", "meaning": "التعريف" }],
  "examples": ["مثال محلول 1"],
  "exam_tips": ["إرشاد للامتحان"],
  "questions": ["سؤال مراجعة 1"],
  "visuals": [{ "kind": "concept_map", "title": "...", "caption": "...", "center": "...", "branches": [{ "label": "...", "children": ["..."] }] }]
}`;

export type GeneratedSummary = {
  title: string;
  overview: string;
  keyPoints: string[];
  explanation: string[];
  notes: string[];
  definitions: { term: string; meaning: string }[];
  examples: string[];
  exam_tips: string[];
  questions: string[];
  visuals: ReturnType<typeof normalizeVisuals>;
};

type RawSummary = {
  title?: unknown;
  overview?: unknown;
  keyPoints?: unknown;
  explanation?: unknown;
  notes?: unknown;
  definitions?: Array<{ term?: unknown; meaning?: unknown }>;
  examples?: unknown;
  exam_tips?: unknown;
  questions?: unknown;
  visuals?: unknown;
};

const list = (v: unknown, max: number) =>
  (Array.isArray(v) ? v : []).map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, max);

export const generateSummary = createServerFn({ method: "POST" })
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data }): Promise<{ summary: GeneratedSummary | null; error: string | null }> => {
    const gradeName = data.gradeId === 12 ? "الثاني عشر (التوجيهي)" : `الصف ${data.gradeId}`;
    const ask = `المادة: ${data.subject}
الصف: ${gradeName}
الدرس: ${data.lesson?.trim() || "(مستخرج من صورة صفحة الكتاب المرفقة)"}
${data.imageDataUrl ? "اعتمد على صورة صفحة الكتاب المرفقة كمصدر أساسي." : "اعتمد على محتوى هذا الدرس كما ورد في الكتاب المدرسي الفلسطيني الرسمي."}`;

    const messages: GatewayMessage[] = [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: data.imageDataUrl
          ? [
              { type: "text", text: ask },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ]
          : ask,
      },
    ];

    const res = await callAiGateway(process.env.LOVABLE_API_KEY, {
      messages,
      json: true,
      label: "summary",
      timeoutMs: 120_000,
    });
    if (!res.ok) return { summary: null, error: AI_ERROR_AR[res.code] };

    const parsed = parseJsonLoose<RawSummary>(res.content) ?? {};
    const keyPoints = list(parsed.keyPoints, 15);
    const explanation = list(parsed.explanation, 8);
    const overview = String(parsed.overview ?? "").trim();
    if (!keyPoints.length && !explanation.length && !overview) {
      return { summary: null, error: AI_ERROR_AR.empty };
    }

    return {
      summary: {
        title: String(parsed.title || data.lesson || `ملخّص — ${data.subject}`).trim(),
        overview,
        keyPoints,
        explanation,
        notes: list(parsed.notes, 8),
        definitions: (parsed.definitions ?? [])
          .filter((d) => d && d.term)
          .map((d) => ({ term: String(d.term).trim(), meaning: String(d.meaning ?? "").trim() }))
          .slice(0, 12),
        examples: list(parsed.examples, 8),
        exam_tips: list(parsed.exam_tips, 8),
        questions: list(parsed.questions, 10),
        visuals: normalizeVisuals(parsed.visuals, 4),
      },
      error: null,
    };
  });
