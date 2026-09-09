/** Minimal line-based diff viewer (LCS) for المبرمج الذكي. */

type Row = { type: "same" | "add" | "del"; text: string };

function diffLines(before: string, after: string): Row[] {
  const a = before ? before.split("\n") : [];
  const b = after ? after.split("\n") : [];
  const n = a.length;
  const m = b.length;
  // guard: very large files → summary only
  if (n * m > 900_000) {
    return [{ type: "same", text: `الملف كبير (${n} → ${m} سطرًا) — تم عرض ملخص فقط.` }];
  }
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const rows: Row[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ type: "del", text: a[i++] });
    } else {
      rows.push({ type: "add", text: b[j++] });
    }
  }
  while (i < n) rows.push({ type: "del", text: a[i++] });
  while (j < m) rows.push({ type: "add", text: b[j++] });
  return rows;
}

/** Collapse long runs of unchanged lines. */
function withContext(rows: Row[], ctx = 3): Row[] {
  const keep = new Set<number>();
  rows.forEach((r, idx) => {
    if (r.type !== "same") {
      for (let k = idx - ctx; k <= idx + ctx; k++) if (k >= 0 && k < rows.length) keep.add(k);
    }
  });
  const out: Row[] = [];
  let skipping = false;
  rows.forEach((r, idx) => {
    if (keep.has(idx)) {
      out.push(r);
      skipping = false;
    } else if (!skipping) {
      out.push({ type: "same", text: "⋯" });
      skipping = true;
    }
  });
  return out;
}

export function DiffView({ before, after }: { before: string; after: string }) {
  const rows = withContext(diffLines(before, after));
  const added = rows.filter((r) => r.type === "add").length;
  const removed = rows.filter((r) => r.type === "del").length;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background" dir="ltr">
      <div className="flex items-center gap-3 border-b border-border bg-card px-3 py-2 text-xs font-bold">
        <span className="text-primary">+{added}</span>
        <span className="text-destructive">-{removed}</span>
      </div>
      <pre className="max-h-80 overflow-auto p-0 text-[11px] leading-5">
        {rows.map((r, idx) => (
          <div
            key={idx}
            className={
              r.type === "add"
                ? "bg-primary/10 px-3 text-primary"
                : r.type === "del"
                  ? "bg-destructive/10 px-3 text-destructive"
                  : "px-3 text-muted-foreground"
            }
          >
            <span className="select-none opacity-50">{r.type === "add" ? "+" : r.type === "del" ? "-" : " "} </span>
            {r.text}
          </div>
        ))}
      </pre>
    </div>
  );
}
