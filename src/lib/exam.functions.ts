import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  topic: z.string().trim().min(2).max(200),
  count: z.number().int().min(3).max(15).default(8),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
});

export type QuizQuestion = {
  question: string;
  options: string[]; // 4 options
  correctIndex: number;
  explanation: string;
};

const SYSTEM = `أنت مولّد اختبارات تعليمي فلسطيني خبير في كل المواد للمنهاج الفلسطيني (وزارة التربية والتعليم) من الصف الأول حتى التوجيهي. تُولّد أسئلة اختيار من متعدد دقيقة وواضحة باللغة العربية الفصحى. لا تُضِف نصوصًا خارج تنسيق JSON.`;

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("invalid json");
  return JSON.parse(raw.slice(start, end + 1));
}

export const generateQuiz = createServerFn({ method: "POST" })
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "خدمة الذكاء الاصطناعي غير مفعّلة." };
    }

    const userPrompt = `أنشئ اختبارًا تفاعليًا من ${data.count} أسئلة اختيار من متعدد عن: "${data.topic}".
مستوى الصعوبة: ${data.difficulty === "easy" ? "سهل" : data.difficulty === "hard" ? "صعب" : "متوسط"}.
- لكل سؤال 4 خيارات بالضبط.
- اختيار صحيح واحد فقط.
- اكتب شرحًا قصيرًا للإجابة الصحيحة.
- أعد JSON خالص بالشكل التالي بدون أي شرح خارجه:
{ "questions": [ { "question": "...", "options": ["..","..","..",".."], "correctIndex": 0, "explanation": "..." } ] }`;

    const models = ["google/gemini-2.5-flash-lite", "google/gemini-2.5-flash"];
    let res: Response | null = null;
    let lastStatus = 0;
    for (const model of models) {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (res.ok) break;
      lastStatus = res.status;
      if (res.status === 402) return { ok: false as const, error: "نفذ رصيد الذكاء الاصطناعي المجاني لهذا الشهر. حاول لاحقًا." };
      if (res.status !== 429 && res.status < 500) break;
    }

    if (!res || !res.ok) {
      const text = res ? await res.text() : "";
      console.error("AI quiz gateway error", lastStatus, text);
      if (lastStatus === 429) return { ok: false as const, error: "الخدمة مزدحمة، حاول بعد قليل." };
      return { ok: false as const, error: "تعذّر توليد الاختبار حاليًا." };
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "";

    let parsed: unknown;
    try { parsed = extractJson(content); }
    catch { return { ok: false as const, error: "تعذّر قراءة الاختبار. حاول مرة أخرى." }; }

    const schema = z.object({
      questions: z.array(z.object({
        question: z.string().min(2),
        options: z.array(z.string().min(1)).length(4),
        correctIndex: z.number().int().min(0).max(3),
        explanation: z.string().default(""),
      })).min(1),
    });
    const result = schema.safeParse(parsed);
    if (!result.success) {
      return { ok: false as const, error: "بنية الاختبار غير صالحة. حاول مجددًا." };
    }
    return { ok: true as const, questions: result.data.questions as QuizQuestion[] };
  });