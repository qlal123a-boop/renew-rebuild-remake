/**
 * A4 export helpers for generated worksheets / summaries.
 *
 * The app theme is authored entirely in oklch(); html2canvas cannot parse modern
 * color functions and stalls on them. So instead of rasterizing the live styled
 * node, we build a *class-free* printable clone and style it with plain hex CSS.
 * That clone is used for BOTH actions — but the two actions stay fully separate:
 *  - downloadNodeAsPdf(): rasterizes the clone into a multi-page A4 PDF file. Never prints.
 *  - printNode(): opens the browser print dialog with real selectable RTL text. Never downloads.
 */

const PRINT_WIDTH = 794; // px ≈ A4 width at 96dpi

const PRINT_CSS = `
*{box-sizing:border-box}
.mnr-doc{width:${PRINT_WIDTH}px;padding:32px 36px;background:#ffffff;color:#1f2937;
  direction:rtl;text-align:right;font-family:inherit;font-size:14px;line-height:1.9}
.mnr-doc h1{font-size:24px}
.mnr-doc h2{font-size:21px;margin:0 0 6px;color:#1a237e;font-weight:800}
.mnr-doc h3{font-size:16px;margin:14px 0 6px;color:#1a237e;font-weight:800}
.mnr-doc header{text-align:center;border-bottom:2px solid #1a237e;padding-bottom:12px;margin-bottom:14px}
.mnr-doc p{margin:6px 0}
.mnr-doc article{border:1px solid #d8dbe6;border-radius:10px;padding:18px;margin-bottom:16px;background:#fff}
.mnr-doc section{margin:12px 0;padding:12px 14px;border-radius:10px;background:#f4f5fa;border:1px solid #e3e6f0}
.mnr-doc ul,.mnr-doc ol{margin:6px 0;padding-inline-start:22px}
.mnr-doc li{margin:4px 0;break-inside:avoid}
.mnr-doc ol>li{margin:8px 0}
.mnr-doc table{width:100%;border-collapse:collapse;font-size:12.5px;margin:8px 0}
.mnr-doc th,.mnr-doc td{border:1px solid #b9bed2;padding:6px 8px;text-align:right;vertical-align:top}
.mnr-doc th{background:#eceefb;font-weight:800}
.mnr-doc figure{margin:12px 0;padding:12px;border:1px solid #cfd3e6;border-radius:10px;background:#fafbff;break-inside:avoid}
.mnr-doc figcaption{font-weight:800;color:#1a237e;margin-bottom:8px}
.mnr-doc img{max-width:100%;height:auto}
.mnr-doc b,.mnr-doc strong{font-weight:800}
.mnr-doc span{display:inline}
.mnr-doc .mnr-bar{display:block;height:10px;border-radius:6px;background:#c9a227}
.mnr-doc .mnr-track{display:block;height:10px;flex:1;border-radius:6px;background:#e6e8f2;overflow:hidden}
`;

const KEEP_INLINE = new Set(["width"]);

/** Clone the node and strip every theme class / modern-color inline style. */
function buildPrintableClone(node: HTMLElement): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.className = "mnr-doc";
  const clone = node.cloneNode(true) as HTMLElement;

  clone.querySelectorAll<HTMLElement>("[data-no-print], .print\\:hidden").forEach((el) => el.remove());

  const all = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];
  all.forEach((el) => {
    const cls = el.getAttribute("class") ?? "";
    const width = el.style.width;
    el.removeAttribute("class");
    el.removeAttribute("style");
    // preserve chart bar geometry
    if (width && KEEP_INLINE.has("width")) {
      if (/bg-gradient-gold|rounded-full/.test(cls)) {
        el.className = "mnr-bar";
        el.style.width = width;
      }
    }
    if (/overflow-hidden rounded-full bg-border|flex-1/.test(cls) && el.tagName === "SPAN" && el.children.length === 1) {
      el.className = "mnr-track";
    }
  });

  wrap.appendChild(clone);
  return wrap;
}

/**
 * Mount the printable clone inside an ISOLATED iframe.
 * Critical: html2canvas clones the *owner document* including its stylesheets —
 * the app's stylesheet is full of oklch() which html2canvas cannot parse and it
 * stalls forever. The iframe carries only the plain-hex PRINT_CSS, so parsing is safe.
 */
async function mountFrame(node: HTMLElement, title: string) {
  const inner = buildPrintableClone(node).outerHTML;
  const fontFamily = getComputedStyle(document.body).fontFamily.replace(/[<>]/g, "");

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${PRINT_WIDTH}px;height:100px;border:0;opacity:0`;
  document.body.appendChild(frame);

  const idoc = frame.contentDocument!;
  idoc.open();
  idoc.write(
    `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">` +
      `<title>${title.replace(/[<>]/g, "")}</title><style>` +
      `@page{size:A4 portrait;margin:12mm}` +
      `html,body{margin:0;padding:0;background:#fff;font-family:${fontFamily}}` +
      PRINT_CSS +
      `</style></head><body>${inner}</body></html>`,
  );
  idoc.close();

  // wait for images + layout
  await Promise.all(
    Array.from(idoc.images).map((im) =>
      im.complete ? Promise.resolve() : new Promise((r) => { im.onload = r; im.onerror = r; }),
    ),
  );
  await new Promise((r) => setTimeout(r, 120));

  const target = idoc.querySelector<HTMLElement>(".mnr-doc")!;
  frame.style.height = `${Math.max(target.scrollHeight, 100)}px`;
  await new Promise((r) => setTimeout(r, 60));

  return { frame, idoc, target, cleanup: () => frame.remove() };
}

/**
 * Rasterize with the BROWSER's own text engine via an SVG <foreignObject>.
 * html2canvas re-lays-out text glyph-by-glyph, which destroys Arabic shaping
 * (letters get disconnected and words stick together). Rendering the markup
 * through an SVG image keeps real Arabic shaping, word spacing and RTL.
 * html2canvas stays only as a last-resort fallback.
 */
async function renderViaSvg(el: HTMLElement, idoc: Document): Promise<HTMLCanvasElement> {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  const fontFamily = getComputedStyle(document.body).fontFamily.replace(/[<>&]/g, "");
  const css =
    `html,body{margin:0;padding:0}` +
    `div{font-family:${fontFamily},"Noto Naskh Arabic","Amiri","Segoe UI",sans-serif}` +
    PRINT_CSS;

  const style = idoc.createElement("style");
  style.textContent = css;
  clone.insertBefore(style, clone.firstChild);

  const body = new XMLSerializer().serializeToString(clone);
  const width = PRINT_WIDTH;
  const height = Math.max(el.scrollHeight, 100);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject x="0" y="0" width="${width}" height="${height}">${body}</foreignObject></svg>`;

  const img = new Image();
  img.decoding = "sync";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("svg render failed"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  // Throws if the canvas got tainted → caller falls back to html2canvas.
  canvas.toDataURL("image/jpeg", 0.5);
  return canvas;
}

async function renderCanvas(el: HTMLElement, idoc: Document): Promise<HTMLCanvasElement> {
  try {
    return await renderViaSvg(el, idoc);
  } catch (e) {
    console.warn("[doc-export] SVG render failed, falling back to html2canvas", e);
    const { default: html2canvas } = await import("html2canvas");
    return html2canvas(el, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      imageTimeout: 8000,
      width: PRINT_WIDTH,
      windowWidth: PRINT_WIDTH,
      height: el.scrollHeight,
      windowHeight: el.scrollHeight,
    });
  }
}


/** Slice one tall canvas into A4-proportioned page images. */
function sliceToA4Pages(canvas: HTMLCanvasElement): string[] {
  const pageH = Math.floor((canvas.width * 297) / 210);
  const pages: string[] = [];
  for (let y = 0; y < canvas.height; y += pageH) {
    const h = Math.min(pageH, canvas.height - y);
    const c = document.createElement("canvas");
    c.width = canvas.width;
    c.height = pageH;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    pages.push(c.toDataURL("image/jpeg", 0.92));
  }
  return pages.length ? pages : [canvas.toDataURL("image/jpeg", 0.92)];
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function safeFileName(base: string) {
  return (base || "document").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 70);
}

/** DOWNLOAD ONLY — produces a real multi-page A4 PDF file. Never opens a print dialog. */
export async function downloadNodeAsPdf(node: HTMLElement, fileBase: string) {
  const { target, idoc, cleanup } = await mountFrame(node, fileBase);
  try {
    const [canvas, { default: jsPDF }] = await Promise.all([renderCanvas(target, idoc), import("jspdf")]);

    const pages = sliceToA4Pages(canvas);
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    pages.forEach((img, i) => {
      if (i > 0) pdf.addPage();
      pdf.addImage(img, "JPEG", 0, 0, 210, 297, undefined, "FAST");
    });
    saveBlob(pdf.output("blob"), `${safeFileName(fileBase)}.pdf`);
  } finally {
    cleanup();
  }
}

/** PRINT ONLY — opens the print dialog with real selectable RTL text. Downloads nothing. */
export async function printNode(node: HTMLElement, title: string) {
  const { frame, idoc, cleanup } = await mountFrame(node, title);
  const doc = idoc.querySelector<HTMLElement>(".mnr-doc");
  if (doc) { doc.style.width = "auto"; doc.style.padding = "0"; }
  try {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
  } finally {
    setTimeout(cleanup, 2000);
  }
}

