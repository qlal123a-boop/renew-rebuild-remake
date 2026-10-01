/**
 * Pre-flight validation for AI-generated files (runs before any GitHub commit).
 * Lightweight static checks that catch the errors which used to turn CI red:
 * missing local modules, named imports that the target module doesn't export,
 * unbalanced brackets, and links/createFileRoute to routes that don't exist.
 */

const EXT = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function resolveLocal(spec: string, fromPath: string, known: Set<string>): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = "src/" + spec.slice(2);
  else if (spec.startsWith("./") || spec.startsWith("../")) {
    const parts = fromPath.split("/").slice(0, -1);
    for (const seg of spec.split("/")) {
      if (seg === "..") parts.pop();
      else if (seg !== ".") parts.push(seg);
    }
    base = parts.join("/");
  } else return null; // package import — not checked
  for (const e of EXT) if (known.has(base + e)) return base + e;
  if (/\.(css|json|svg|png|jpe?g|webp)$/.test(base)) return known.has(base) ? base : "__missing__";
  return "__missing__";
}

function exportsOf(src: string): Set<string> {
  const out = new Set<string>();
  for (const m of src.matchAll(/export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function\*?|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g)) out.add(m[1]!);
  for (const m of src.matchAll(/export\s*(?:type\s*)?\{([^}]*)\}/g)) {
    for (const part of m[1]!.split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) out.add(name.replace(/^type\s+/, ""));
    }
  }
  if (/export\s+default/.test(src)) out.add("default");
  if (/export\s+\*\s+from/.test(src)) out.add("*");
  return out;
}

function balanced(src: string): string | null {
  // strip strings/comments/template literals roughly before counting
  const s = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, "``")
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""')
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''");
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const stack: string[] = [];
  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") stack.push(ch);
    else if (ch in pairs) {
      if (stack.pop() !== pairs[ch]) return `أقواس غير متوازنة قرب "${ch}"`;
    }
  }
  return stack.length ? `أقواس غير مغلقة (${stack.length})` : null;
}

/** Route path from a file under src/routes (TanStack flat-file convention). */
export function routePathOf(file: string): string | null {
  const m = file.match(/^src\/routes\/(.+)\.tsx?$/);
  if (!m || m[1]!.startsWith("__") || m[1]!.startsWith("api/")) return null;
  let p = m[1]!.replace(/\./g, "/").replace(/(^|\/)index$/, "").replace(/_(?=\/|$)/g, "");
  p = p.split("/").filter((s) => !s.startsWith("_")).join("/");
  return "/" + p;
}

export function validateFile(
  path: string,
  content: string,
  files: Map<string, string>, // path -> content (known contents; may be partial)
  allPaths: Set<string>,
): string[] {
  const errors: string[] = [];
  if (!/\.(ts|tsx)$/.test(path)) return errors;

  const b = balanced(content);
  if (b) errors.push(b);
  if (/^\s*\.\.\.\s*$/m.test(content)) errors.push("الملف يحتوي على اختصار '...' بدل الكود الكامل");

  const importRe = /import\s+(type\s+)?([\s\S]*?)\s+from\s+["']([^"']+)["']/g;
  for (const m of content.matchAll(importRe)) {
    const spec = m[3]!;
    const resolved = resolveLocal(spec, path, allPaths);
    if (resolved === null) continue;
    if (resolved === "__missing__") {
      errors.push(`استيراد من وحدة غير موجودة: "${spec}"`);
      continue;
    }
    const named = m[2]!.match(/\{([\s\S]*)\}/);
    const target = files.get(resolved);
    if (!named || target === undefined) continue;
    const exp = exportsOf(target);
    if (exp.has("*")) continue;
    for (const part of named[1]!.split(",")) {
      const name = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]?.trim();
      if (name && !exp.has(name)) errors.push(`"${name}" غير مُصدَّر من "${spec}"`);
    }
  }

  // routes referenced must exist
  const routes = new Set<string>();
  for (const p of allPaths) {
    const r = routePathOf(p);
    if (r) routes.add(r);
  }
  const own = routePathOf(path);
  if (own) {
    const decl = content.match(/createFileRoute\(\s*["']([^"']+)["']/);
    if (!decl) errors.push("ملف المسار لا يستخدم createFileRoute");
    else if (decl[1]!.replace(/\/$/, "") !== own.replace(/\/$/, "") && decl[1] !== own)
      errors.push(`createFileRoute("${decl[1]}") لا يطابق مسار الملف "${own}"`);
  }
  for (const m of content.matchAll(/\bto=\s*["'](\/[^"'?#]*)["']/g)) {
    const to = m[1]!.replace(/\/$/, "") || "/";
    if (to.includes("$")) continue;
    const ok = [...routes].some((r) => (r.replace(/\/$/, "") || "/") === to);
    if (!ok) errors.push(`رابط إلى مسار غير موجود: "${m[1]}"`);
  }
  return [...new Set(errors)];
}
