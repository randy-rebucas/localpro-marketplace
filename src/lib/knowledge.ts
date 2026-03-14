import fs from "fs";
import path from "path";
import { marked } from "marked";

export type KnowledgeFolder = "client" | "provider" | "business" | "agency" | "peso";

export interface KnowledgeArticle {
  slug: string;
  title: string;
  excerpt: string;
  group: string;
  order: number;
  audience: KnowledgeFolder | "both";
  content: string;       // raw markdown
  contentHtml: string;   // rendered HTML
  updatedAt: string;     // file mtime ISO string
}

export type KnowledgeArticleSummary = Omit<KnowledgeArticle, "content" | "contentHtml">;

const CONTENT_DIR = path.join(process.cwd(), "content", "knowledge");

// ── Simple frontmatter parser ────────────────────────────────────────────────
function parseFrontmatter(raw: string): {
  data: Record<string, string | number>;
  body: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const data: Record<string, string | number> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    data[key] = /^\d+$/.test(value) ? parseInt(value, 10) : value;
  }

  return { data, body: match[2] };
}

// ── Parse a single file ──────────────────────────────────────────────────────
function parseFile(folder: KnowledgeFolder, filename: string): KnowledgeArticle {
  const filePath = path.join(CONTENT_DIR, folder, filename);
  const raw = fs.readFileSync(filePath, "utf8");
  const stat = fs.statSync(filePath);
  const { data, body } = parseFrontmatter(raw);

  const slug = filename.replace(/\.md$/, "");
  const contentHtml = marked(body) as string;

  return {
    slug,
    title:      String(data.title   ?? slug),
    excerpt:    String(data.excerpt ?? ""),
    group:      String(data.group   ?? "General"),
    order:      Number(data.order   ?? 0),
    audience:   (data.audience as KnowledgeFolder | "both") ?? folder,
    content:    body,
    contentHtml,
    updatedAt:  stat.mtime.toISOString(),
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/** All published articles for a given audience folder, sorted by group + order. */
export function getArticlesForFolder(folder: KnowledgeFolder): KnowledgeArticle[] {
  const dir = path.join(CONTENT_DIR, folder);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parseFile(folder, f))
    .sort((a, b) => a.group.localeCompare(b.group) || a.order - b.order);
}

/** Single article by slug. Returns null if not found. */
export function getArticle(
  folder: KnowledgeFolder,
  slug: string
): KnowledgeArticle | null {
  const filePath = path.join(CONTENT_DIR, folder, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  return parseFile(folder, `${slug}.md`);
}

/** All articles from all folders (for admin view). */
export function getAllArticles(): Array<KnowledgeArticle & { folder: KnowledgeFolder }> {
  const folders: KnowledgeFolder[] = ["client", "provider", "business", "agency", "peso"];
  return folders.flatMap((folder) =>
    getArticlesForFolder(folder).map((a) => ({ ...a, folder }))
  );
}

// ── Write helpers ────────────────────────────────────────────────────────────

/** Convert a string to a safe slug (lowercase, hyphens, no special chars). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

/** Safely validate a slug — only a-z, 0-9, hyphens allowed. */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || /^[a-z0-9]$/.test(slug);
}

const VALID_FOLDERS: readonly string[] = ["client", "provider", "business", "agency", "peso"];

/** Validate folder name to prevent path traversal. */
function assertFolder(folder: string): asserts folder is KnowledgeFolder {
  if (!VALID_FOLDERS.includes(folder)) {
    throw new Error("Invalid folder");
  }
}

/** Serialize frontmatter values, quoting strings that need it. */
function fmValue(val: string): string {
  if (/[:#\[\]{}&*!,>|'"\\]/.test(val) || val.startsWith(" ") || val.endsWith(" ")) {
    return `"${val.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return val;
}

export interface WriteArticleInput {
  title: string;
  excerpt: string;
  content: string;
  group: string;
  order: number;
  audience: KnowledgeFolder;
}

/**
 * Write (create or overwrite) an article file.
 * Returns the parsed article after writing.
 */
export function writeArticle(
  folder: KnowledgeFolder,
  slug: string,
  data: WriteArticleInput
): KnowledgeArticle {
  assertFolder(folder);
  if (!isValidSlug(slug)) throw new Error("Invalid slug");

  const dir = path.join(CONTENT_DIR, folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const fm = [
    `title: ${fmValue(data.title)}`,
    `excerpt: ${fmValue(data.excerpt)}`,
    `group: ${fmValue(data.group)}`,
    `order: ${data.order}`,
    `audience: ${data.audience}`,
  ].join("\n");

  const fileContent = `---\n${fm}\n---\n${data.content}`;
  fs.writeFileSync(path.join(dir, `${slug}.md`), fileContent, "utf8");

  return parseFile(folder, `${slug}.md`);
}

/**
 * Delete an article file. Returns true if deleted, false if not found.
 */
export function deleteArticleFile(folder: KnowledgeFolder, slug: string): boolean {
  assertFolder(folder);
  const filePath = path.join(CONTENT_DIR, folder, `${slug}.md`);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

/** Check whether a slug already exists in a folder. */
export function slugExists(folder: KnowledgeFolder, slug: string): boolean {
  return fs.existsSync(path.join(CONTENT_DIR, folder, `${slug}.md`));
}
