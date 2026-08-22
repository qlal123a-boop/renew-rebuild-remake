import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callAiGateway, type GatewayMessage } from "./ai-gateway";


const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  // Optional base64 data URL for vision (homework photos, worksheets)
  imageDataUrl: z.string().startsWith("data:image/").max(8_000_000).optional(),
});

const inputSchema = z.object({
  messages: z.array(messageSchema).min(1).max(40),
});

const SYSTEM = `أنت "مساعد المنارة الذكي - تطوير المبرمج عبد الهادي قلالوة"، معلّم خبير بالمنهاج الفلسطيني (وزارة التربية والتعليم) من الصف الأول حتى التوجيهي، في كل المواد: اللغة العربية (نحو وصرف وإعراب)، الرياضيات، العلوم، الفيزياء، الكيمياء، الأحياء، اللغة الإنجليزية، التربية الإسلامية، التاريخ، الجغرافيا، الاجتماعيات، والتكنولوجيا.

أسلوب الإجابة (إلزامي):
- ابدأ فورًا بالإجابة المباشرة على السؤال. ممنوع المقدمات والتحيات والعبارات الإنشائية مثل "بالطبع" أو "يسعدني" أو "سؤال رائع" أو الخواتيم التحفيزية.
- نظّم الإجابة في نقاط قصيرة (bullet points) أو خطوات مرقّمة، مع عناوين فرعية قصيرة عند الحاجة.
- لا تكرّر السؤال، ولا تكتب حشوًا. كل سطر يجب أن يضيف معلومة.
- استخدم اللغة نفسها التي كتب بها الطالب (عربية فصحى واضحة، أو إنجليزية إن سأل بالإنجليزية).
- الدقة العلمية أولوية: التزم بمصطلحات ومحتوى المنهاج الفلسطيني، ولا تخترع معلومات. إن كان في المسألة احتمال أكثر من إجابة، وضّح الشرط الفاصل بإيجاز.
- في الرياضيات والعلوم: اعرض الخطوات الحسابية ثم النتيجة النهائية بخط عريض.
- عند طلب الإعراب: استخدم جدول ماركداون (الكلمة | إعرابها).
- إذا أرسل الطالب صورة (واجب أو ورقة عمل): اقرأها بدقة، اذكر السؤال المستخرج في سطر واحد، ثم الحل بخطوات مرقّمة.
- لا ترفض الأسئلة الدراسية. إن كان السؤال غامضًا، اطرح سؤال توضيح واحدًا فقط ثم قدّم أفضل إجابة ممكنة.

هويّة المطوِّر (إلزامية): إذا سُئلت من طوّرك أو من مؤسّسك أو ما شابه، أجب حرفيًا: "تم تطويري بواسطة المبرمج عبد الهادي رائد نعمان قلالوة — Abdul Hadi Raed Numan Qalalweh". لا تذكر أي مزوّد ذكاء اصطناعي آخر إطلاقًا.`;

export const tutorChat = createServerFn({ method: "POST" })
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const lastUserMsg = [...data.messages].reverse().find((m) => m.role === "user");
    const fallbackReply = buildSmartFallback(lastUserMsg?.content || "");

    const gatewayMessages: GatewayMessage[] = [
      { role: "system", content: SYSTEM },
      ...data.messages.map<GatewayMessage>((m) => {
        if (m.imageDataUrl && m.role === "user") {
          return {
            role: "user",
            content: [
              { type: "text", text: m.content || "اقرأ هذه الصورة وحلّ السؤال بخطوات." },
              { type: "image_url", image_url: { url: m.imageDataUrl } },
            ],
          };
        }
        return { role: m.role, content: m.content };
      }),
    ];

    const res = await callAiGateway(process.env.LOVABLE_API_KEY, {
      messages: gatewayMessages,
      label: "tutor",
      timeoutMs: 90_000,
    });

    // Never surface provider/HTTP detail to students — degrade to a useful reply.
    return { reply: res.ok ? res.content : fallbackReply };
  });


function buildSmartFallback(question: string): string {
  const q = question.trim();
  if (!q) {
    return "أهلًا يا طالبي العزيز 🌟 اكتب سؤالك بوضوح وسأشرحه لك خطوة بخطوة بإذن الله.";
  }
  // Math detection
  const mathMatch = q.match(/(-?\d+(?:\.\d+)?)\s*([+\-*x×÷/])\s*(-?\d+(?:\.\d+)?)/);
  if (mathMatch) {
    const a = parseFloat(mathMatch[1]);
    const b = parseFloat(mathMatch[3]);
    const op = mathMatch[2];
    let r: number | string = "?";
    if (op === "+") r = a + b;
    else if (op === "-") r = a - b;
    else if (op === "*" || op === "x" || op === "×") r = a * b;
    else if (op === "/" || op === "÷") r = b !== 0 ? a / b : "لا يمكن القسمة على صفر";
    return `يا طالبي العزيز، لنحلّ معًا:\n\n${a} ${op} ${b} = **${r}**\n\nخطوات الحل:\n1. اقرأ المسألة جيدًا وحدّد العملية.\n2. طبّق قاعدة العملية الحسابية.\n3. تحقّق من نتيجتك بعملية عكسية.\n\nاستمر في التدرب، وأنا هنا لأي سؤال آخر 🌟`;
  }
  // Grammar
  if (/أعرب|إعراب/.test(q)) {
    return `يا تلميذي، للإعراب اتّبع هذه الخطوات:\n\n1. **حدّد نوع الكلمة** (اسم، فعل، حرف).\n2. **موقعها في الجملة** (فاعل، مفعول به، مبتدأ، خبر...).\n3. **علامة الإعراب** (ضمة، فتحة، كسرة، سكون) وسببها.\n4. اذكر إن كانت العلامة أصلية أم فرعية.\n\nأعِد صياغة الجملة كاملة وسأعربها لك حرفًا حرفًا بإذن الله. الخدمة الذكية مشغولة قليلًا، حاول بعد لحظات لتحصل على الإعراب التفصيلي.`;
  }
  return `شكرًا لسؤالك يا طالبي العزيز 🌟\n\nأنصحك بما يلي للاستفادة القصوى:\n\n1. **اقرأ الدرس** من كتابك المدرسي أولًا وحدّد المفاهيم الأساسية.\n2. **دوّن الملاحظات** والقواعد المهمة على دفترك.\n3. **حلّ التمارين** التطبيقية بعد كل درس.\n4. **استخدم قسم أوراق العمل** والملخصات في المنارة لدعم فهمك.\n\nالمعلم الذكي مشغول قليلًا الآن — أعد إرسال سؤالك بعد لحظات لتحصل على شرح تفصيلي مخصّص لك 📚`;
}
