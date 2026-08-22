import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { VISUAL_PROMPT, normalizeVisuals } from "./edu-visual-schema";
import { AI_ERROR_AR, callAiGateway, parseJsonLoose, type GatewayMessage } from "./ai-gateway";

/**
 * Free unlimited AI worksheet generator.
 * Strictly grounded in the Palestinian curriculum + the uploaded page image (if any).
 * All gateway concerns (model fallback, retries, timeouts, error codes) live in ai-gateway.ts.
 */
const inputSchema = z.object({
  lesson: z.string().max(300).optional(),
  gradeId: z.number().int().min(1).max(12),
  subject: z.string().min(1).max(80),
  count: z.number().int().min(3).max(30).default(10),
  imageDataUrl: z.string().startsWith("data:image/").max(8_000_000).optional(),
});

const SYSTEM = `أنت معلم فلسطيني خبير معتمد لدى وزارة التربية والتعليم العالي الفلسطينية.
مهمتك: إنتاج ورقة عمل احترافية قابلة للطباعة + مفتاح إجابات نموذجي.

قيود إلزامية:
- اعتمد حصريًا على المنهاج الفلسطيني الرسمي وعلى صورة صفحة الكتاب المرفقة إن وُجدت. ممنوع منعًا باتًا استخدام مناهج أو مصادر خارجية.
- إن كانت هناك صورة: استخرج محتوى الدرس منها حرفيًا واعتمد عليه أولًا.
- استخدم عربية فصحى تربوية دقيقة بمصطلحات المنهاج (أو الإنجليزية إذا كانت المادة اللغة الإنجليزية).
- نوّع الأسئلة: اختيار من متعدد، صواب/خطأ، أكمل الفراغ، أسئلة مقالية قصيرة، ومسائل تطبيقية للمواد العلمية.
- أضف صندوق "نقاط مهمة" (key_notes) من 2 إلى 5 نقاط يجب أن يتذكرها الطالب.
- أضف نشاطًا عمليًا أو أكثر (activities) قابلًا للتنفيذ داخل الصف أو المنزل.
- أضف من سؤالين إلى ثلاثة أسئلة تفكير ناقد (critical_thinking).
- لا تكتب مقدمات ولا خواتيم إنشائية.
${VISUAL_PROMPT}
- يجوز ربط سؤال بمرئية عبر الحقل "visualIndex" (رقم ترتيب المرئية في مصفوفة visuals ابتداءً من 0).

أعد JSON فقط بالشكل:
{
  "title": "عنوان ورقة العمل",
  "objectives": ["هدف 1", "هدف 2", "هدف 3"],
  "instructions": "تعليمات قصيرة للطالب",
  "key_notes": ["نقطة مهمة 1"],
  "activities": ["نشاط تطبيقي 1"],
  "critical_thinking": ["سؤال تفكير ناقد 1"],
  "visuals": [{ "kind": "table", "title": "...", "caption": "...", "headers": ["..."], "rows": [["..."]] }],
  "questions": [
    { "n": 1, "type": "mcq|truefalse|fill|short|problem", "text": "نص السؤال", "options": ["أ...","ب...","ج...","د..."], "answer": "الإجابة النموذجية", "explanation": "شرح مختصر للحل" }
  ]
}
- options تُملأ فقط لأسئلة الاختيار من متعدد، وإلا اجعلها [].
- كل سؤال يجب أن يحتوي answer صحيحة ودقيقة.`;

export type WorksheetQuestion = {
  n: number;
  type: string;
  text: string;
  options: string[];
  answer: string;
  explanation: string;
};
export type GeneratedWorksheet = {
  title: string;
  objectives: string[];
  instructions: string;
  keyNotes: string[];
  activities: string[];
  criticalThinking: string[];
  questions: WorksheetQuestion[];
  visuals: ReturnType<typeof normalizeVisuals>;
};

type RawSheet = {
  title?: unknown;
  objectives?: unknown;
  instructions?: unknown;
  key_notes?: unknown;
  activities?: unknown;
  critical_thinking?: unknown;
  visuals?: unknown;
  questions?: Array<Partial<WorksheetQuestion>>;
};

const list = (v: unknown, max: number) =>
  (Array.isArray(v) ? v : []).map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, max);

export const generateWorksheet = createServerFn({ method: "POST" })
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data }): Promise<{ worksheet: GeneratedWorksheet | null; error: string | null }> => {
    const gradeName = data.gradeId === 12 ? "الثاني عشر (التوجيهي)" : `الصف ${data.gradeId}`;
    const ask = `المادة: ${data.subject}
الصف: ${gradeName}
الدرس: ${data.lesson?.trim() || "(مستخرج من صورة صفحة الكتاب المرفقة)"}
عدد الأسئلة المطلوبة: ${data.count}
${data.imageDataUrl ? "اعتمد على صورة صفحة الكتاب المرفقة كمصدر أساسي للمحتوى." : "اعتمد على محتوى هذا الدرس كما ورد في الكتاب المدرسي الفلسطيني الرسمي."}`;

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
      label: "worksheet",
      timeoutMs: 120_000,
    });
    if (!res.ok) return { worksheet: null, error: AI_ERROR_AR[res.code] };

    const parsed = parseJsonLoose<RawSheet>(res.content) ?? {};
    const questions = (parsed.questions ?? [])
      .filter((q) => q && typeof q.text === "string" && q.text.trim())
      .slice(0, data.count)
      .map((q, i) => ({
        n: i + 1,
        type: String(q.type || "short"),
        text: String(q.text).trim(),
        options: Array.isArray(q.options) ? q.options.map(String).slice(0, 6) : [],
        answer: String(q.answer ?? "").trim(),
        explanation: String(q.explanation ?? "").trim(),
      }));
    if (!questions.length) return { worksheet: null, error: AI_ERROR_AR.empty };

    return {
      worksheet: {
        title: String(parsed.title || data.lesson || `ورقة عمل — ${data.subject}`).trim(),
        objectives: list(parsed.objectives, 6),
        instructions: String(parsed.instructions ?? "أجب عن جميع الأسئلة الآتية بخط واضح.").trim(),
        keyNotes: list(parsed.key_notes, 6),
        activities: list(parsed.activities, 5),
        criticalThinking: list(parsed.critical_thinking, 4),
        questions,
        visuals: normalizeVisuals(parsed.visuals, 4),
      },
      error: null,
    };
  });
