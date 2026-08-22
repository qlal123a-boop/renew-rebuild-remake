import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateGatewayImage } from "./ai-gateway";

/**
 * Generates ONE topic-accurate educational illustration (labeled diagram style)
 * for the given lesson. Never decorative: the prompt is built strictly from the
 * lesson title / subject so e.g. "الجهاز التنفسي" yields a respiratory-system diagram.
 * Returns a data: URL so the printable document stays fully self-contained.
 */
const inputSchema = z.object({
  topic: z.string().min(2).max(300),
  subject: z.string().min(1).max(80),
  gradeId: z.number().int().min(1).max(12),
});

export const generateEduImage = createServerFn({ method: "POST" })
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data }): Promise<{ imageDataUrl: string | null }> => {
    const prompt = `Educational textbook illustration for a school lesson.
Topic: "${data.topic}" (school subject: ${data.subject}, grade ${data.gradeId}).
Requirements:
- A clear, scientifically/factually accurate labeled diagram or explanatory illustration of the topic itself.
- Flat vector textbook style, clean white background, high contrast, print friendly.
- Labels must be short ARABIC words placed next to the parts they describe (right-to-left Arabic script, correctly connected letters).
- No decorative clipart, no people posing, no watermark, no frame, no random objects unrelated to the topic.`;

    const res = await generateGatewayImage(process.env.LOVABLE_API_KEY, prompt, { label: "edu-image" });
    return { imageDataUrl: res.ok ? res.dataUrl : null };
  });
