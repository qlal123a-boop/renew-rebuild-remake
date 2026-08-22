import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "ar" | "en";
const STORAGE_KEY = "manara.lang";

type Dict = Record<string, { ar: string; en: string }>;

export const DICT: Dict = {
  // Brand
  "brand.name": { ar: "المنارة التعليمية", en: "Al-Manara Academy" },
  "brand.tagline": { ar: "بوابة التعليم الفلسطيني الفاخرة", en: "Premium Palestinian learning portal" },

  // Nav
  "nav.home": { ar: "الرئيسية", en: "Home" },
  "nav.grades": { ar: "الصفوف", en: "Grades" },
  "nav.courses": { ar: "الكورسات", en: "Courses" },
  "nav.summaries": { ar: "الملخصات", en: "Summaries" },
  "nav.worksheets": { ar: "أوراق العمل", en: "Worksheets" },
  "nav.library": { ar: "المكتبة", en: "Library" },
  "nav.smartBoard": { ar: "اللوح الذكي", en: "Smart Board" },
  "nav.tutor": { ar: "المساعد الذكي", en: "Smart Assistant" },
  "nav.quiz": { ar: "مولّد الاختبارات", en: "Quiz Generator" },
  "nav.worksheetAi": { ar: "ورقة عمل ذكية", en: "AI Worksheet" },
  "nav.pomodoro": { ar: "جلسة التركيز", en: "Focus Session" },
  "nav.games": { ar: "الألعاب", en: "Games" },
  "nav.store": { ar: "المتجر", en: "Store" },
  "nav.tasks": { ar: "المهام", en: "Tasks" },
  "nav.schedule": { ar: "الجدول", en: "Schedule" },
  "nav.gpa": { ar: "حساب المعدل", en: "GPA" },
  "nav.more": { ar: "المزيد", en: "More" },
  "nav.menu": { ar: "القائمة", en: "Menu" },
  "nav.admin": { ar: "لوحة التحكم", en: "Admin" },
  "nav.join": { ar: "انضم إلى الفريق", en: "Join the team" },

  // Auth
  "auth.login": { ar: "دخول", en: "Sign in" },
  "auth.logout": { ar: "خروج", en: "Sign out" },
  "auth.loggedOut": { ar: "تم تسجيل الخروج", en: "Signed out" },

  // Language switch
  "lang.switch": { ar: "English", en: "العربية" },
  "lang.aria": { ar: "تغيير اللغة", en: "Change language" },

  // Home
  "home.badge": { ar: "منصة تعليمية فلسطينية فاخرة", en: "Premium Palestinian learning platform" },
  "home.heroLead": {
    ar: "بوّابتك الذهبية إلى المنهاج الفلسطيني — تعلّم بأسلوب جديد يجمع الجمال والعِلم.",
    en: "Your gateway to the Palestinian curriculum — learning that is calm, clear and beautiful.",
  },
  "home.ctaGrades": { ar: "ابدأ من صفك", en: "Start with your grade" },
  "home.ctaTutor": { ar: "جرّب المساعد الذكي", en: "Try the Smart Assistant" },
  "home.portals": { ar: "البوابات الأربع", en: "The Four Portals" },
  "home.portalsSub": { ar: "كل ما يحتاجه الطالب الفلسطيني، في مكان واحد.", en: "Everything a student needs, in one place." },
  "home.tools": { ar: "أدوات إضافية", en: "Additional Tools" },
  "home.enter": { ar: "ادخل", en: "Enter" },

  "block.ai.title": { ar: "أدوات التعليم الذكي", en: "AI Learning Tools" },
  "block.ai.desc": {
    ar: "روبوت المنارة، المعلم الذكي، والاختبارات التفاعلية بالذكاء الاصطناعي لكل درس.",
    en: "The Manara bot, the smart tutor and AI-generated quizzes for every lesson.",
  },
  "block.summaries.title": { ar: "ملخّصات الدراسة", en: "Study Summaries" },
  "block.summaries.desc": {
    ar: "ملخّصات مكثّفة لكل وحدة، جاهزة للقراءة والتحميل قبل الامتحان.",
    en: "Condensed unit summaries, ready to read or download before exams.",
  },
  "block.worksheets.title": { ar: "أوراق عمل تفاعلية", en: "Interactive Worksheets" },
  "block.worksheets.desc": {
    ar: "أوراق عمل رسمية حسب الصف والمادة من المصادر الفلسطينية المعتمدة.",
    en: "Official worksheets by grade and subject from approved Palestinian sources.",
  },
  "block.courses.title": { ar: "الكورسات المصنّفة", en: "Structured Courses" },
  "block.courses.desc": {
    ar: "كورسات برمجة، عربية، رياضيات، تلاوة وعلوم — مع شهادة إتمام بعد الامتحان النهائي.",
    en: "Programming, Arabic, math, recitation and science courses — with a completion certificate.",
  },
  "badge.ai": { ar: "AI", en: "AI" },
  "badge.pdf": { ar: "PDF", en: "PDF" },
  "badge.official": { ar: "رسمي", en: "Official" },
  "badge.certificate": { ar: "شهادة", en: "Certificate" },
  "sub.bot": { ar: "روبوت المنارة", en: "Manara Bot" },
  "sub.tutor": { ar: "المعلم الذكي", en: "Smart Tutor" },
  "sub.quizgen": { ar: "مولّد الأسئلة", en: "Quiz Generator" },

  "tool.grades": { ar: "الصفوف المدرسية", en: "School Grades" },
  "tool.library": { ar: "المكتبة الإلكترونية", en: "Digital Library" },
  "tool.smartBoard": { ar: "اللوح الذكي", en: "Smart Board" },
  "tool.quiz": { ar: "مولّد الاختبارات", en: "Quiz Generator" },
  "tool.pomodoro": { ar: "جلسة التركيز", en: "Focus Session" },
  "tool.games": { ar: "الألعاب الذهنية", en: "Brain Games" },
  "tool.store": { ar: "متجر كنز المنارة", en: "Treasure Store" },
  "tool.tasks": { ar: "قسم المهام", en: "Tasks" },
  "tool.schedule": { ar: "الجدول المدرسي", en: "Timetable" },
  "tool.gpa": { ar: "حساب المعدل", en: "GPA Calculator" },
  "tool.tutor": { ar: "المساعد الذكي", en: "Smart Assistant" },
  "tool.summaries": { ar: "الملخصات", en: "Summaries" },

  // Tutor page
  "tutor.title": { ar: "روبوت المنارة", en: "Manara Assistant" },
  "tutor.subtitle": {
    ar: "المساعد الذكي بشخصية المعلم — محادثة نصية مع دعم صور الواجبات",
    en: "A teacher-style AI assistant — text chat with homework photo support",
  },
  "tutor.online": { ar: "الأستاذ متّصل · يدعم الصور والنصوص", en: "Assistant online · supports text and images" },
  "tutor.greeting": {
    ar: "أهلًا بك. اكتب سؤالك أو ارفع صورة واجبك وسأحلّه خطوة بخطوة.",
    en: "Welcome. Type your question or upload a photo of your homework and I'll solve it step by step.",
  },
  "tutor.thinking": { ar: "الأستاذ يفكّر...", en: "Thinking..." },
  "tutor.suggestions": { ar: "اقتراحات سريعة:", en: "Quick prompts:" },
  "tutor.placeholder": { ar: "اكتب سؤالك للأستاذ...", en: "Type your question..." },
  "tutor.placeholderImage": { ar: "اكتب سؤالًا حول الصورة (اختياري)...", en: "Ask about the image (optional)..." },
  "tutor.uploadImage": { ar: "ارفع صورة الواجب", en: "Upload homework image" },
  "tutor.imageReady": { ar: "الصورة جاهزة. اكتب سؤالك أو اضغط إرسال.", en: "Image ready. Add a question or press send." },
  "tutor.error": { ar: "حدث عطل بسيط. حاول مرة أخرى بعد قليل.", en: "Something went wrong. Please try again shortly." },
  "tutor.imgTooLarge": { ar: "الصورة كبيرة جدًا (الحد 5 ميغا)", en: "Image is too large (5 MB max)" },
  "tutor.pickImage": { ar: "يرجى اختيار صورة", en: "Please choose an image file" },
  "tutor.starter1": { ar: "أعرب: ذهب الطالبُ إلى المدرسةِ مبكرًا.", en: "Explain photosynthesis in simple steps." },
  "tutor.starter2": { ar: "اشرح لي قاعدة الفاعل.", en: "Summarise Newton's three laws." },
  "tutor.starter3": { ar: "حل: 3س + 5 = 20", en: "Solve: 3x + 5 = 20" },
  "tutor.starter4": { ar: "ما الفرق بين المفعول به والمفعول المطلق؟", en: "What is the difference between area and perimeter?" },

  // Footer
  "footer.rights": {
    ar: "المنارة التعليمية — صُنعت بشغف لطلاب فلسطين",
    en: "Al-Manara Academy — built with care for Palestinian students",
  },
};

type Ctx = { lang: Lang; dir: "rtl" | "ltr"; setLang: (l: Lang) => void; toggle: () => void; t: (k: string) => string };

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "ar") setLangState(saved);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = dir;
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  }, []);

  const value = useMemo<Ctx>(() => ({
    lang,
    dir: lang === "ar" ? "rtl" : "ltr",
    setLang,
    toggle: () => setLang(lang === "ar" ? "en" : "ar"),
    t: (k: string) => DICT[k]?.[lang] ?? k,
  }), [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  // Safe fallback (e.g. component rendered outside provider)
  return {
    lang: "ar",
    dir: "rtl",
    setLang: () => {},
    toggle: () => {},
    t: (k: string) => DICT[k]?.ar ?? k,
  };
}
