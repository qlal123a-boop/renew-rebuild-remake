/**
 * GitHub access for "المبرمج الذكي" (AI coding agent).
 * All calls go through the Lovable connector gateway; never the GitHub API directly.
 * Server-only module (filename-protected from the client bundle).
 */

const GATEWAY = "https://connector-gateway.lovable.dev/github";

/** Paths the agent may never read or write. */
const BLOCKED = [
  ".env",
  ".git/",
  "src/integrations/supabase/client.ts",
  "src/integrations/supabase/client.server.ts",
  "src/integrations/supabase/previewAuthStorage.ts",
  "src/integrations/supabase/auth-middleware.ts",
  "src/integrations/supabase/auth-attacher.ts",
  "src/integrations/supabase/types.ts",
  "src/routeTree.gen.ts",
  "bun.lockb",
  "package-lock.json",
];

export function isBlockedPath(path: string): boolean {
  const p = path.replace(/^\.\//, "");
  if (p.includes("..")) return true;
  if (/(^|\/)\.env/.test(p)) return true;
  return BLOCKED.some((b) => (b.endsWith("/") ? p.startsWith(b) : p === b));
}

/** Files the agent is allowed to touch (source + docs only). */
export function isAllowedPath(path: string): boolean {
  if (isBlockedPath(path)) return false;
  return /^(src|public|supabase\/migrations|docs)\//.test(path) || /^[\w.-]+\.(md|json|ts|js|css)$/.test(path);
}

function headers() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const ghKey = process.env["GITHUB_API_KEY"];
  if (!lovableKey) throw new Error("LOVABLE_API_KEY غير مُهيّأ");
  if (!ghKey) throw new Error("GITHUB_API_KEY غير مُهيّأ — يجب ربط GitHub من الموصلات");
  return {
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": ghKey,
  };
}

async function gh<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${GATEWAY}/${path}`, {
    method: init?.method ?? "GET",
    headers: headers(),
    ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
  });
  if (!res.ok) {
    const text = (await res.text().catch(() => "")).slice(0, 600);
    console.error(`[github] ${init?.method ?? "GET"} ${path} → ${res.status} ${text}`);
    throw new Error(`GitHub request failed [${res.status}]: ${text}`);
  }
  return (await res.json()) as T;
}

export type Repo = { owner: string; repo: string; base: string };

export function repoConfig(): Repo {
  return {
    owner: process.env["AGENT_GITHUB_OWNER"] || "qlal123a-boop",
    repo: process.env["AGENT_GITHUB_REPO"] || "renew-rebuild-remake",
    base: process.env["AGENT_GITHUB_BASE"] || "main",
  };
}

const b64encode = (s: string) => Buffer.from(s, "utf8").toString("base64");
const b64decode = (s: string) => Buffer.from(s.replace(/\n/g, ""), "base64").toString("utf8");

/** Full file list of the base branch (paths only, filtered to editable areas). */
export async function listFiles(r: Repo): Promise<string[]> {
  const data = await gh<{ tree: Array<{ path: string; type: string; size?: number }> }>(
    `repos/${r.owner}/${r.repo}/git/trees/${encodeURIComponent(r.base)}?recursive=1`,
  );
  return data.tree
    .filter((n) => n.type === "blob" && !isBlockedPath(n.path) && (n.size ?? 0) < 400_000)
    .map((n) => n.path)
    .sort();
}

export async function readFile(
  r: Repo,
  path: string,
  ref?: string,
): Promise<{ content: string; sha: string } | null> {
  if (isBlockedPath(path)) throw new Error(`ملف محمي: ${path}`);
  try {
    const data = await gh<{ content?: string; sha: string; encoding?: string }>(
      `repos/${r.owner}/${r.repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref ?? r.base)}`,
    );
    return { content: data.content ? b64decode(data.content) : "", sha: data.sha };
  } catch {
    return null;
  }
}

export async function baseSha(r: Repo): Promise<string> {
  const ref = await gh<{ object: { sha: string } }>(
    `repos/${r.owner}/${r.repo}/git/ref/heads/${encodeURIComponent(r.base)}`,
  );
  return ref.object.sha;
}

export async function createBranch(r: Repo, branch: string): Promise<void> {
  const sha = await baseSha(r);
  await gh(`repos/${r.owner}/${r.repo}/git/refs`, {
    method: "POST",
    body: { ref: `refs/heads/${branch}`, sha },
  });
}

export async function writeFile(
  r: Repo,
  branch: string,
  path: string,
  content: string,
  message: string,
): Promise<void> {
  if (!isAllowedPath(path)) throw new Error(`مسار غير مسموح: ${path}`);
  const existing = await readFile(r, path, branch);
  await gh(`repos/${r.owner}/${r.repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "PUT",
    body: {
      message,
      content: b64encode(content),
      branch,
      ...(existing ? { sha: existing.sha } : {}),
    },
  });
}

export async function deleteFile(r: Repo, branch: string, path: string, message: string): Promise<void> {
  if (!isAllowedPath(path)) throw new Error(`مسار غير مسموح: ${path}`);
  const existing = await readFile(r, path, branch);
  if (!existing) return;
  await gh(`repos/${r.owner}/${r.repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "DELETE",
    body: { message, branch, sha: existing.sha },
  });
}

export async function openPullRequest(
  r: Repo,
  branch: string,
  title: string,
  body: string,
): Promise<{ number: number; html_url: string }> {
  return gh<{ number: number; html_url: string }>(`repos/${r.owner}/${r.repo}/pulls`, {
    method: "POST",
    body: { title, head: branch, base: r.base, body },
  });
}

export async function closePullRequest(r: Repo, number: number): Promise<void> {
  await gh(`repos/${r.owner}/${r.repo}/pulls/${number}`, { method: "PATCH", body: { state: "closed" } });
}

export async function deleteBranch(r: Repo, branch: string): Promise<void> {
  await fetch(`${GATEWAY}/repos/${r.owner}/${r.repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: "DELETE",
    headers: headers(),
  });
}

/** Latest CI check conclusions for a branch head. */
export async function branchChecks(r: Repo, branch: string): Promise<{ state: string; runs: Array<{ name: string; conclusion: string | null; status: string }> }> {
  try {
    const ref = await gh<{ object: { sha: string } }>(
      `repos/${r.owner}/${r.repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    );
    const data = await gh<{ check_runs: Array<{ name: string; conclusion: string | null; status: string }> }>(
      `repos/${r.owner}/${r.repo}/commits/${ref.object.sha}/check-runs`,
    );
    const runs = data.check_runs ?? [];
    const state = runs.length === 0
      ? "none"
      : runs.some((x) => x.conclusion === "failure")
        ? "failure"
        : runs.every((x) => x.status === "completed")
          ? "success"
          : "pending";
    return { state, runs };
  } catch {
    return { state: "unknown", runs: [] };
  }
}
