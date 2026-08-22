/**
 * Renders AI-generated educational visuals (tables, charts, timelines, flowcharts,
 * concept maps, labeled diagrams, process cycles) as crisp print-safe SVG/HTML.
 * All text is real Arabic text — no images — so RTL and PDF output stay perfect.
 */
export type EduVisual = {
  kind: "table" | "chart" | "timeline" | "flowchart" | "concept_map" | "labeled" | "compare";
  title?: string;
  caption?: string;
  headers?: string[];
  rows?: string[][];
  items?: { label: string; value?: number; note?: string }[];
  center?: string;
  branches?: { label: string; children?: string[] }[];
};

function Frame({ title, caption, children }: { title?: string; caption?: string; children: React.ReactNode }) {
  return (
    <figure className="my-4 break-inside-avoid rounded-2xl border border-gold/30 bg-secondary/40 p-4">
      {title && <figcaption className="mb-3 text-sm font-extrabold text-gold">{title}</figcaption>}
      {children}
      {caption && <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{caption}</p>}
    </figure>
  );
}

export function EduVisualView({ v }: { v: EduVisual }) {
  const items = v.items ?? [];

  if (v.kind === "table" && v.headers?.length) {
    return (
      <Frame title={v.title} caption={v.caption}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right text-xs">
            <thead>
              <tr>
                {v.headers.map((h, i) => (
                  <th key={i} className="border border-gold/30 bg-gold/10 px-2 py-2 font-extrabold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(v.rows ?? []).map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => <td key={j} className="border border-border px-2 py-1.5 align-top">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Frame>
    );
  }

  if (v.kind === "chart" && items.length) {
    const max = Math.max(...items.map((i) => Number(i.value) || 0), 1);
    return (
      <Frame title={v.title} caption={v.caption}>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-28 shrink-0 truncate font-bold">{it.label}</span>
              <span className="h-3 flex-1 overflow-hidden rounded-full bg-border">
                <span
                  className="block h-full rounded-full bg-gradient-gold"
                  style={{ width: `${Math.round(((Number(it.value) || 0) / max) * 100)}%` }}
                />
              </span>
              <span className="w-10 shrink-0 text-left font-bold tabular-nums">{it.value ?? ""}</span>
            </div>
          ))}
        </div>
      </Frame>
    );
  }

  if (v.kind === "timeline" && items.length) {
    return (
      <Frame title={v.title} caption={v.caption}>
        <ol className="relative space-y-3 border-e-2 border-gold/40 pe-4">
          {items.map((it, i) => (
            <li key={i} className="relative text-xs">
              <span className="absolute -end-[21px] top-1 h-3 w-3 rounded-full bg-gold" />
              <p className="font-extrabold">{it.label}</p>
              {it.note && <p className="mt-0.5 text-muted-foreground">{it.note}</p>}
            </li>
          ))}
        </ol>
      </Frame>
    );
  }

  if (v.kind === "flowchart" && items.length) {
    return (
      <Frame title={v.title} caption={v.caption}>
        <div className="flex flex-col items-stretch gap-1">
          {items.map((it, i) => (
            <div key={i}>
              <div className="rounded-xl border border-gold/40 bg-card px-3 py-2 text-center text-xs font-bold">
                {it.label}
                {it.note && <div className="mt-0.5 text-[10px] font-normal text-muted-foreground">{it.note}</div>}
              </div>
              {i < items.length - 1 && <div className="mx-auto my-1 text-center text-gold">↓</div>}
            </div>
          ))}
        </div>
      </Frame>
    );
  }

  if (v.kind === "concept_map" && (v.branches?.length || items.length)) {
    const branches = v.branches ?? items.map((i) => ({ label: i.label, children: i.note ? [i.note] : [] }));
    return (
      <Frame title={v.title} caption={v.caption}>
        <div className="text-center">
          <span className="inline-block rounded-full bg-gradient-royal px-4 py-2 text-xs font-extrabold text-gold">
            {v.center || v.title}
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {branches.map((b, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-2.5 text-xs">
              <p className="font-extrabold">{b.label}</p>
              {!!b.children?.length && (
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                  {b.children.map((c, j) => <li key={j}>{c}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </Frame>
    );
  }

  if (v.kind === "labeled" && items.length) {
    return (
      <Frame title={v.title} caption={v.caption}>
        <ol className="grid gap-2 sm:grid-cols-2">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2 rounded-xl border border-border bg-card p-2.5 text-xs">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[10px] font-extrabold">{i + 1}</span>
              <span>
                <b>{it.label}</b>
                {it.note && <span className="block text-muted-foreground">{it.note}</span>}
              </span>
            </li>
          ))}
        </ol>
      </Frame>
    );
  }

  if (v.kind === "compare" && v.rows?.length) {
    return (
      <Frame title={v.title} caption={v.caption}>
        <div className="grid gap-2 sm:grid-cols-2">
          {v.rows.map((r, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-2.5 text-xs">
              <p className="font-extrabold">{r[0]}</p>
              <p className="mt-0.5 text-muted-foreground">{r.slice(1).join(" — ")}</p>
            </div>
          ))}
        </div>
      </Frame>
    );
  }

  return null;
}

export function EduVisuals({ visuals }: { visuals?: EduVisual[] | null }) {
  if (!visuals?.length) return null;
  return <>{visuals.map((v, i) => <EduVisualView key={i} v={v} />)}</>;
}
