/** Shared visual schema: prompt fragment + strict normalizer used by both AI generators. */
export type RawVisual = {
  kind?: string;
  title?: string;
  caption?: string;
  headers?: unknown;
  rows?: unknown;
  items?: unknown;
  center?: string;
  branches?: unknown;
};

export const VISUAL_PROMPT = `
المرئيات التعليمية (visuals) — إلزامية عند فائدتها:
أضف من 1 إلى 4 عناصر مرئية تشرح الدرس فعليًا (ممنوع أي عنصر زخرفي أو غير مرتبط).
اختر النوع المناسب للمادة:
- "table": جدول مقارنة/تصنيف → headers: [..], rows: [[..],[..]]
- "chart": رسم بياني بالأعمدة → items: [{ "label": "...", "value": 30 }]
- "timeline": خط زمني (تاريخ/أحداث) → items: [{ "label": "1948", "note": "..." }]
- "flowchart": مخطط تدفّق/خطوات حل (رياضيات، علوم، حاسوب) → items: [{ "label": "الخطوة", "note": "تفصيل" }]
- "concept_map": خريطة مفاهيم → center: "المفهوم", branches: [{ "label": "فرع", "children": ["..."] }]
- "labeled": رسم موضّح بالأجزاء وتسمياتها (تشريح، جغرافيا، أجهزة) → items: [{ "label": "الجزء", "note": "وظيفته" }]
- "compare": مقارنة ثنائية → rows: [["العنصر","الوصف"], ...]
كل عنصر: { "kind": "...", "title": "عنوان المرئية", "caption": "شرح مختصر", ...حقول النوع }
اكتب كل النصوص داخل المرئيات بالعربية الفصحى (أو الإنجليزية إن كانت المادة اللغة الإنجليزية).`;

const KINDS = ["table", "chart", "timeline", "flowchart", "concept_map", "labeled", "compare"];
const s = (v: unknown) => String(v ?? "").trim();
const arr = (v: unknown) => (Array.isArray(v) ? v : []);

export function normalizeVisuals(input: unknown, max = 4) {
  return arr(input)
    .map((raw) => {
      const v = (raw ?? {}) as RawVisual;
      const kind = KINDS.includes(s(v.kind)) ? s(v.kind) : "";
      if (!kind) return null;
      const items = arr(v.items)
        .map((i) => {
          const it = (i ?? {}) as { label?: unknown; value?: unknown; note?: unknown };
          const label = s(it.label);
          if (!label) return null;
          const value = Number(it.value);
          return { label, ...(Number.isFinite(value) ? { value } : {}), ...(s(it.note) ? { note: s(it.note) } : {}) };
        })
        .filter(Boolean)
        .slice(0, 12) as { label: string; value?: number; note?: string }[];
      const headers = arr(v.headers).map(s).filter(Boolean).slice(0, 6);
      const rows = arr(v.rows)
        .map((r) => arr(r).map(s).slice(0, 6))
        .filter((r) => r.some(Boolean))
        .slice(0, 12);
      const branches = arr(v.branches)
        .map((b) => {
          const br = (b ?? {}) as { label?: unknown; children?: unknown };
          const label = s(br.label);
          if (!label) return null;
          return { label, children: arr(br.children).map(s).filter(Boolean).slice(0, 6) };
        })
        .filter(Boolean)
        .slice(0, 8) as { label: string; children: string[] }[];

      const out = {
        kind: kind as "table" | "chart" | "timeline" | "flowchart" | "concept_map" | "labeled" | "compare",
        title: s(v.title),
        caption: s(v.caption),
        headers,
        rows,
        items,
        center: s(v.center),
        branches,
      };
      const hasData =
        (kind === "table" && headers.length && rows.length) ||
        (kind === "compare" && rows.length) ||
        (kind === "concept_map" && (branches.length || items.length)) ||
        (["chart", "timeline", "flowchart", "labeled"].includes(kind) && items.length);
      return hasData ? out : null;
    })
    .filter(Boolean)
    .slice(0, max) as {
    kind: "table" | "chart" | "timeline" | "flowchart" | "concept_map" | "labeled" | "compare";
    title: string;
    caption: string;
    headers: string[];
    rows: string[][];
    items: { label: string; value?: number; note?: string }[];
    center: string;
    branches: { label: string; children: string[] }[];
  }[];
}
