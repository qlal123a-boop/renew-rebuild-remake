export type CertificateTheme = "traditional" | "modern-tech" | "academic" | "nature";

export const CERTIFICATE_THEMES: { id: CertificateTheme; label: string; desc: string }[] = [
  { id: "traditional", label: "تقليدي إسلامي", desc: "ذهبي زمردي بنقوش عربية، خط أميري — مناسب للقرآن والتربية الإسلامية" },
  { id: "modern-tech", label: "تقني حديث", desc: "تدرج بنفسجي/أزرق مع لمسات تقنية — مناسب للبرمجة والتكنولوجيا" },
  { id: "academic", label: "أكاديمي كلاسيكي", desc: "أزرق ملكي ذهبي رصين — مناسب للعلوم والرياضيات" },
  { id: "nature", label: "طبيعي أخضر", desc: "تدرج أخضر زيتوني — مناسب للأحياء والجغرافيا" },
];

const KEYWORDS: { theme: CertificateTheme; words: string[] }[] = [
  { theme: "traditional", words: ["تلاوة", "تجويد", "قرآن", "إسلامي", "إسلامية", "الفقه", "الحديث", "العقيدة", "السيرة", "الشريعة", "الأذكار"] },
  { theme: "modern-tech", words: ["برمجة", "حاسوب", "تكنولوجيا", "بايثون", "ويب", "تطبيقات", "ذكاء اصطناعي", "خوارزميات", "الشبكات", "قواعد البيانات"] },
  { theme: "nature", words: ["أحياء", "علوم", "جغرافيا", "البيئة", "النبات", "الحيوان", "كائنات", "بيئة", "زراعة"] },
  { theme: "academic", words: ["رياضيات", "فيزياء", "كيمياء", "جبر", "هندسة", "تفاضل", "تكامل", "نهايات", "إحصاء", "اللغة", "الإنجليزية", "العربية", "تاريخ", "أدب"] },
];

export function detectCertificateTheme(text: string): CertificateTheme {
  const t = (text || "").toLowerCase();
  for (const k of KEYWORDS) {
    if (k.words.some((w) => t.includes(w))) return k.theme;
  }
  return "academic";
}

const CATEGORY_THEME: Record<string, CertificateTheme> = {
  programming: "modern-tech",
  tajweed: "traditional",
  arabic: "academic",
  math: "academic",
  english: "academic",
  science: "nature",
  other: "academic",
};

export function themeForCategory(category: string | null | undefined, fallbackText = ""): CertificateTheme {
  // "other" is not a real category — never let it mask the real topic.
  if (category && category !== "other" && CATEGORY_THEME[category]) return CATEGORY_THEME[category];
  return detectCertificateTheme(fallbackText);
}

export const COURSE_CATEGORY_LABELS: Record<string, string> = {
  programming: "البرمجة والتكنولوجيا",
  arabic: "اللغة العربية والإعراب",
  math: "الرياضيات",
  tajweed: "أحكام التلاوة والتجويد",
  science: "العلوم والأحياء",
  english: "اللغة الإنجليزية",
  other: "أخرى",
};
