import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  grade: z.string().min(1).max(50),
  subject: z.string().min(1).max(50),
  lesson: z.string().min(1).max(200),
  count: z.number().int().min(1).max(50),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
});

export type QuizQuestion = {
  q: string;
  options: string[];
  answer: number; // index of correct option
  explanation: string;
};

const SYSTEM = `أنت معلّم فلسطيني خبير بالمنهاج الفلسطيني. مهمتك توليد أسئلة اختيار من متعدد عالية الجودة باللغة العربية الفصحى.
- كل سؤال له 4 خيارات بالضبط.
- الإجابة الصحيحة واحدة فقط (فهرسها 0..3).
- قدّم شرحًا مختصرًا للإجابة.
- التزم بمستوى الصف ودقّة المنهاج.
- أعد الإخراج كـ JSON صرف فقط بدون أي نص خارجي.

الصيغة المطلوبة:
{ "questions": [ { "q": "السؤال", "options": ["أ","ب","ج","د"], "answer": 0, "explanation": "السبب" } ] }`;

export const generateQuiz = createServerFn({ method: "POST" })
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { error: "خدمة الذكاء الاصطناعي غير مفعّلة بعد." } as const;
    }

    const userPrompt = `الصف: ${data.grade}
المادة: ${data.subject}
الدرس / الوحدة: ${data.lesson}
عدد الأسئلة المطلوب: ${data.count}
المستوى: ${data.difficulty === "easy" ? "سهل" : data.difficulty === "hard" ? "صعب" : "متوسط"}

أنشئ ${data.count} سؤال اختيار من متعدد دقيقة ومتنوعة، وأرجع JSON فقط.`;

    const models = ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];
    let lastStatus = 0;

    for (const model of models) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
      if (res.ok) {
        const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const raw = json.choices?.[0]?.message?.content?.trim() || "{}";
        try {
          const parsed = JSON.parse(raw) as { questions?: QuizQuestion[] };
          const questions = (parsed.questions || []).filter(
            (q) => q && typeof q.q === "string" && Array.isArray(q.options) && q.options.length === 4 && typeof q.answer === "number",
          );
          if (questions.length === 0) return { error: "تعذّر توليد أسئلة صحيحة. حاول مجددًا." } as const;
          return { questions } as const;
        } catch {
          return { error: "تعذّر قراءة الأسئلة. حاول مجددًا." } as const;
        }
      }
      lastStatus = res.status;
      if (res.status === 402) return { error: "نفذ رصيد الذكاء الاصطناعي المجاني هذا الشهر." } as const;
      if (res.status !== 429 && res.status < 500) break;
    }
    if (lastStatus === 429) return { error: "الخدمة مزدحمة الآن، حاول بعد لحظات." } as const;
    return { error: "حدث خطأ في توليد الاختبار. حاول مجددًا." } as const;
  });
