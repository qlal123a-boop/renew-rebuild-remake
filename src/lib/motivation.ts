/**
 * Reusable daily motivational messages (Arabic-first).
 * Selection is deterministic per calendar day — the message never flickers.
 */
import { pickOfTheDay } from "@/lib/date-utils";

export type MotivationItem = { text: string; author?: string };

export const MOTIVATIONS: readonly MotivationItem[] = [
  { text: "تقدُّم صغير كل يوم يصنع نتائج استثنائية." },
  { text: "جهدك اليوم هو نجاحك غدًا." },
  { text: "لا تنتظر الحماس، ابدأ وسيأتيك الحماس." },
  { text: "كل صفحة تدرسها خطوة أقرب إلى هدفك." },
  { text: "المذاكرة المنتظمة أقوى من المذاكرة الطويلة المتقطعة." },
  { text: "الفهم أثمن من الحفظ، والمراجعة تثبّت الاثنين." },
  { text: "اجعل لكل يوم هدفًا واحدًا واضحًا وأنجزه." },
  { text: "الخطأ في التمرين أفضل معلّم قبل الامتحان." },
  { text: "من صبر على تعب التعلّم، ذاق حلاوة التفوّق." },
  { text: "ابدأ بأصعب مادة وأنت في قمة تركيزك." },
  { text: "خمس وعشرون دقيقة تركيز حقيقي تساوي ساعتين من التشتّت." },
  { text: "اكتب ما فهمته بأسلوبك؛ فهذا أقوى اختبار للفهم." },
  { text: "النجاح تراكم عادات صغيرة، لا لحظة واحدة." },
  { text: "راجع اليوم ما تعلّمته أمس، فالذاكرة تحب التكرار." },
] as const;

/** Same message for the whole day, changes automatically at midnight. */
export function motivationOfTheDay(now: Date = new Date()): MotivationItem {
  return pickOfTheDay(MOTIVATIONS, now) ?? MOTIVATIONS[0];
}
