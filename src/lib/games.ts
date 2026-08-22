/**
 * Extensible mental-games engine.
 * A game = a generator producing a question (prompt, choices, correct answer).
 * Add a new game by appending to GAMES — no changes needed in the UI.
 */

export type Difficulty = "easy" | "medium" | "hard";

export type GameQuestion = {
  prompt: string;
  hint?: string;
  choices: string[];
  correct: string;
};

export type GameDef = {
  id: string;
  title: string;
  description: string;
  group: "math" | "logic" | "memory" | "focus" | "knowledge";
  emoji: string;
  make: (d: Difficulty) => GameQuestion;
};

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const shuffle = <T,>(arr: T[]): T[] => arr.map((v) => [Math.random(), v] as const).sort((a, b) => a[0] - b[0]).map(([, v]) => v);

/** Build 4 unique choices around the correct numeric answer (negatives preserved). */
function numericChoices(answer: number): string[] {
  const set = new Set<number>([answer]);
  let guard = 0;
  while (set.size < 4 && guard++ < 60) {
    const delta = pick([-10, -5, -3, -2, -1, 1, 2, 3, 5, 10]);
    set.add(answer + delta);
  }
  while (set.size < 4) set.add(answer + set.size * 7);
  return shuffle(Array.from(set)).map(String);
}

function textChoices(correct: string, distractors: string[]): string[] {
  const set = new Set<string>([correct]);
  for (const d of shuffle(distractors)) {
    if (set.size >= 4) break;
    set.add(d);
  }
  return shuffle(Array.from(set));
}

const range = (d: Difficulty) => (d === "easy" ? 10 : d === "medium" ? 25 : 60);

export const GAMES: GameDef[] = [
  {
    id: "mental_math",
    title: "الحساب الذهني",
    description: "جمع وطرح وضرب — مع الأعداد السالبة.",
    group: "math",
    emoji: "🧮",
    make: (d) => {
      const max = range(d);
      const op = pick<"+" | "-" | "×">(d === "easy" ? ["+", "-"] : ["+", "-", "×"]);
      const a = op === "×" ? rnd(2, d === "hard" ? 12 : 9) : rnd(-max, max);
      const b = op === "×" ? rnd(2, d === "hard" ? 12 : 9) : rnd(-max, max);
      const answer = op === "+" ? a + b : op === "-" ? a - b : a * b;
      const fmt = (n: number) => (n < 0 ? `(${n})` : `${n}`);
      return { prompt: `${fmt(a)} ${op} ${fmt(b)} = ؟`, choices: numericChoices(answer), correct: String(answer) };
    },
  },
  {
    id: "signed_numbers",
    title: "الأعداد الموجبة والسالبة",
    description: "تحدٍّ مركّز على إشارات الأعداد.",
    group: "math",
    emoji: "➖",
    make: (d) => {
      const max = range(d);
      const a = rnd(-max, -1);
      const b = rnd(1, max);
      const op = pick<"+" | "-">(["+", "-"]);
      const answer = op === "+" ? a + b : a - b;
      return { prompt: `(${a}) ${op} ${b} = ؟`, choices: numericChoices(answer), correct: String(answer) };
    },
  },
  {
    id: "division",
    title: "القسمة السريعة",
    description: "قسمة بدون باقٍ.",
    group: "math",
    emoji: "➗",
    make: (d) => {
      const b = rnd(2, d === "hard" ? 12 : 9);
      const answer = rnd(2, d === "hard" ? 15 : 10) * (Math.random() < 0.3 ? -1 : 1);
      const a = answer * b;
      return { prompt: `${a} ÷ ${b} = ؟`, choices: numericChoices(answer), correct: String(answer) };
    },
  },
  {
    id: "equation",
    title: "حلّ المعادلة",
    description: "أوجد قيمة س.",
    group: "math",
    emoji: "🟰",
    make: (d) => {
      const max = range(d);
      const x = rnd(-max, max);
      const m = rnd(2, d === "hard" ? 9 : 5);
      const c = rnd(-max, max);
      const result = m * x + c;
      return {
        prompt: `${m}س ${c < 0 ? "−" : "+"} ${Math.abs(c)} = ${result}  →  س = ؟`,
        choices: numericChoices(x),
        correct: String(x),
      };
    },
  },
  {
    id: "sequence",
    title: "أكمل المتتالية",
    description: "اكتشف النمط العددي.",
    group: "logic",
    emoji: "🔢",
    make: (d) => {
      const start = rnd(-10, 20);
      const step = pick([2, 3, 4, 5, -2, -3, -5, d === "hard" ? 7 : 6]);
      const seq = [0, 1, 2, 3].map((i) => start + step * i);
      const answer = start + step * 4;
      return { prompt: `${seq.join("، ")}، ... = ؟`, choices: numericChoices(answer), correct: String(answer) };
    },
  },
  {
    id: "odd_one_out",
    title: "الشاذ من المجموعة",
    description: "أيّ عنصر لا ينتمي؟",
    group: "logic",
    emoji: "🧩",
    make: () => {
      const sets: Array<{ group: string[]; odd: string }> = [
        { group: ["تفاحة", "موز", "برتقال"], odd: "جزر" },
        { group: ["مثلث", "مربع", "مستطيل"], odd: "كرة" },
        { group: ["2", "4", "8"], odd: "9" },
        { group: ["قطة", "كلب", "حصان"], odd: "صخرة" },
        { group: ["القدس", "غزة", "نابلس"], odd: "باريس" },
        { group: ["ذهب", "فضة", "حديد"], odd: "خشب" },
      ];
      const s = pick(sets);
      return { prompt: `أيّ كلمة لا تنتمي: ${shuffle([...s.group, s.odd]).join(" — ")}`, choices: shuffle([...s.group, s.odd]), correct: s.odd };
    },
  },
  {
    id: "arabic_grammar",
    title: "قواعد اللغة العربية",
    description: "إعراب ونحو سريع.",
    group: "knowledge",
    emoji: "📚",
    make: () => {
      const qs = [
        { q: "«ذهب الطالبُ» — ما إعراب «الطالبُ»؟", a: "فاعل مرفوع", d: ["مفعول به منصوب", "مبتدأ", "خبر"] },
        { q: "«إنّ العلمَ نورٌ» — ما إعراب «العلمَ»؟", a: "اسم إنّ منصوب", d: ["فاعل", "خبر إنّ", "مبتدأ"] },
        { q: "جمع كلمة «كتاب»:", a: "كتب", d: ["كتابات", "كتابون", "مكاتب"] },
        { q: "«لم يدرسْ» — علامة جزم الفعل:", a: "السكون", d: ["الفتحة", "الضمة", "حذف النون"] },
        { q: "المثنى من «معلم»:", a: "معلمان", d: ["معلمون", "معالم", "معلمات"] },
      ];
      const s = pick(qs);
      return { prompt: s.q, choices: textChoices(s.a, s.d), correct: s.a };
    },
  },
  {
    id: "science",
    title: "أسئلة علمية",
    description: "معلومات علمية عامة.",
    group: "knowledge",
    emoji: "🔬",
    make: () => {
      const qs = [
        { q: "الرمز الكيميائي للماء:", a: "H₂O", d: ["CO₂", "O₂", "NaCl"] },
        { q: "أكبر كوكب في المجموعة الشمسية:", a: "المشتري", d: ["زحل", "الأرض", "المريخ"] },
        { q: "وحدة قياس القوة:", a: "نيوتن", d: ["جول", "واط", "أمبير"] },
        { q: "عدد عظام جسم الإنسان البالغ:", a: "206", d: ["180", "230", "300"] },
        { q: "الغاز الذي تمتصه النباتات في البناء الضوئي:", a: "ثاني أكسيد الكربون", d: ["الأكسجين", "النيتروجين", "الهيدروجين"] },
      ];
      const s = pick(qs);
      return { prompt: s.q, choices: textChoices(s.a, s.d), correct: s.a };
    },
  },
  {
    id: "spelling",
    title: "الإملاء الصحيح",
    description: "اختر الكتابة الصحيحة.",
    group: "knowledge",
    emoji: "✍️",
    make: () => {
      const qs = [
        { a: "إن شاء الله", d: ["إنشاء الله", "انشاء الله", "إن شالله"] },
        { a: "مسؤول", d: ["مسئول", "مسٶول", "مسوول"] },
        { a: "هذه", d: ["هاذه", "هذي", "هذة"] },
        { a: "لكن", d: ["لاكن", "لكنّه", "لكين"] },
        { a: "شيء", d: ["شئ", "شىء", "شي"] },
      ];
      const s = pick(qs);
      return { prompt: "أيّ الكلمات مكتوبة بشكل صحيح؟", choices: textChoices(s.a, s.d), correct: s.a };
    },
  },
  {
    id: "reaction",
    title: "سرعة الملاحظة",
    description: "اعثر على العنصر المختلف بسرعة.",
    group: "focus",
    emoji: "⚡",
    make: (d) => {
      const base = pick(["🌟", "🍀", "🔵", "🟡", "🍎"]);
      const odd = pick(["✨", "🍃", "🟣", "🟠", "🍏"]);
      const n = d === "hard" ? 3 : 3;
      return {
        prompt: `أيّ رمز مختلف؟`,
        choices: shuffle([...Array(n).fill(base), odd]) as string[],
        correct: odd,
        hint: "ركّز جيدًا",
      };
    },
  },
  {
    id: "irregular_verbs",
    title: "الأفعال الشاذة (English)",
    description: "Past simple & past participle.",
    group: "knowledge",
    emoji: "🔤",
    make: () => {
      const verbs: Array<[string, string, string]> = [
        ["go", "went", "gone"], ["eat", "ate", "eaten"], ["write", "wrote", "written"],
        ["take", "took", "taken"], ["break", "broke", "broken"], ["drink", "drank", "drunk"],
        ["see", "saw", "seen"], ["buy", "bought", "bought"], ["teach", "taught", "taught"],
        ["begin", "began", "begun"], ["speak", "spoke", "spoken"], ["choose", "chose", "chosen"],
      ];
      const v = pick(verbs);
      const wantPast = Math.random() < 0.5;
      const correct = wantPast ? v[1] : v[2];
      const distractors = verbs.filter((x) => x[0] !== v[0]).flatMap((x) => [x[1], x[2]]);
      return {
        prompt: `${wantPast ? "Past simple" : "Past participle"} of «${v[0]}» ?`,
        choices: textChoices(correct, distractors),
        correct,
      };
    },
  },
  {
    id: "math_puzzle",
    title: "ألغاز رياضية",
    description: "مسائل كلامية ذكية.",
    group: "logic",
    emoji: "🧠",
    make: (d) => {
      const kind = pick(["age", "price", "speed", "half"] as const);
      if (kind === "age") {
        const child = rnd(5, d === "hard" ? 18 : 12);
        const father = child * pick([3, 4]) + rnd(0, 5);
        return { prompt: `عمر الأب ${father} سنة وعمر ابنه ${child} سنة. كم الفرق بينهما؟`, choices: numericChoices(father - child), correct: String(father - child) };
      }
      if (kind === "price") {
        const price = rnd(10, d === "hard" ? 200 : 60);
        const qty = rnd(2, d === "hard" ? 9 : 5);
        return { prompt: `اشترى ${qty} دفاتر بسعر ${price} شيكل للدفتر. كم دفع؟`, choices: numericChoices(price * qty), correct: String(price * qty) };
      }
      if (kind === "speed") {
        const v = rnd(20, 100);
        const h = rnd(2, 6);
        return { prompt: `سيارة تسير بسرعة ${v} كم/س لمدة ${h} ساعات. كم قطعت من المسافة؟`, choices: numericChoices(v * h), correct: String(v * h) };
      }
      const total = rnd(2, 60) * 2;
      return { prompt: `نصف العدد ${total} مضافًا إليه 7 يساوي؟`, choices: numericChoices(total / 2 + 7), correct: String(total / 2 + 7) };
    },
  },
  {
    id: "memory_words",
    title: "ذاكرة الكلمات",
    description: "أيّ كلمة لم تكن في القائمة؟",
    group: "memory",
    emoji: "🧠",
    make: (d) => {
      const pool = ["قلم", "دفتر", "شجرة", "بحر", "زيتون", "قمر", "مفتاح", "كتاب", "نجمة", "جبل", "مطر", "طائر", "حجر", "سنبلة", "ياسمين"];
      const n = d === "easy" ? 4 : d === "medium" ? 6 : 8;
      const shown = shuffle(pool).slice(0, n);
      const missing = pool.find((w) => !shown.includes(w))!;
      return {
        prompt: `احفظ: ${shown.join(" — ")}\nأيّ كلمة لم ترد أعلاه؟`,
        choices: textChoices(missing, shown),
        correct: missing,
        hint: "اقرأ القائمة بتركيز",
      };
    },
  },
  {
    id: "palestine_geo",
    title: "جغرافيا فلسطين",
    description: "مدن ومعالم الوطن.",
    group: "knowledge",
    emoji: "🇵🇸",
    make: () => {
      const qs = [
        { q: "عاصمة فلسطين التاريخية:", a: "القدس", d: ["رام الله", "غزة", "الخليل"] },
        { q: "أكبر مدن قطاع غزة:", a: "غزة", d: ["خان يونس", "رفح", "دير البلح"] },
        { q: "المدينة المعروفة بمدينة الزهور:", a: "قلقيلية", d: ["طولكرم", "أريحا", "جنين"] },
        { q: "أخفض منطقة على سطح الأرض في فلسطين:", a: "البحر الميت", d: ["بحيرة طبريا", "وادي عربة", "سهل مرج ابن عامر"] },
        { q: "مدينة المهد:", a: "بيت لحم", d: ["الناصرة", "نابلس", "عكا"] },
        { q: "أقدم مدينة في العالم وتقع في فلسطين:", a: "أريحا", d: ["يافا", "حيفا", "بيسان"] },
      ];
      const s = pick(qs);
      return { prompt: s.q, choices: textChoices(s.a, s.d), correct: s.a };
    },
  },
  {
    id: "units_convert",
    title: "تحويل الوحدات",
    description: "أطوال وأوزان وزمن.",
    group: "math",
    emoji: "📏",
    make: (d) => {
      const kind = pick(["km", "kg", "hour", "cm"] as const);
      const n = rnd(2, d === "hard" ? 40 : 12);
      if (kind === "km") return { prompt: `${n} كم = ؟ متر`, choices: numericChoices(n * 1000), correct: String(n * 1000) };
      if (kind === "kg") return { prompt: `${n} كغم = ؟ غرام`, choices: numericChoices(n * 1000), correct: String(n * 1000) };
      if (kind === "hour") return { prompt: `${n} ساعة = ؟ دقيقة`, choices: numericChoices(n * 60), correct: String(n * 60) };
      return { prompt: `${n} متر = ؟ سم`, choices: numericChoices(n * 100), correct: String(n * 100) };
    },
  },
];


export const GAME_GROUP_LABELS: Record<GameDef["group"], string> = {
  math: "رياضيات",
  logic: "منطق",
  memory: "ذاكرة",
  focus: "تركيز وسرعة",
  knowledge: "معرفة عامة",
};
