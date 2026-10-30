import JSZip from "jszip";
import type { NotebookEntry } from "@/types";

// ─── Anki Export Options ─────────────────────────────────────────────

export interface AnkiExportOptions {
  cardType?: "split" | "comprehensive";
  includeTags?: boolean;
  deckName?: string;
}

// ─── Obsidian Export Options ─────────────────────────────────────────

export interface ObsidianExportOptions {
  includeIndex?: boolean;
}

// ─── Text & Filename Sanitizers ──────────────────────────────────────

/**
 * Sanitize a string into a safe, portable filename across Windows, macOS, and Linux.
 * Removes illegal characters (\ / : * ? " < > |), collapses whitespace, and avoids path traversal.
 */
export function sanitizeFilename(title: string, fallbackId = "problem-note"): string {
  if (!title || typeof title !== "string") {
    return fallbackId;
  }

  let clean = title
    .replace(/[\\/:*?"<>|]/g, " ") // Replace illegal characters with space
    .replace(/\.\.+/g, " ") // Strip parent directory path traversals
    .replace(/[\x00-\x1f\x7f]/g, "") // Remove control characters
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();

  // Remove leading/trailing dots or dashes that cause OS issues
  clean = clean.replace(/^[.-]+|[.-]+$/g, "").trim();

  // Prevent empty or path traversal result
  if (clean === "" || clean === "." || clean === "..") {
    clean = fallbackId.replace(/[\\/:*?"<>|]/g, "-").replace(/\.\.+/g, "-");
  }

  // Bounded filename length (max 80 chars)
  if (clean.length > 80) {
    clean = clean.slice(0, 80).trim();
  }

  return clean || fallbackId;
}

/**
 * Ensure unique filenames in a collection, appending numeric suffixes if collision occurs.
 */
export function deduplicateFilenames(entries: NotebookEntry[]): Map<string, string> {
  const filenameMap = new Map<string, string>(); // entry.id -> unique filename (without .md)
  const usedNames = new Map<string, number>();

  for (const entry of entries) {
    const baseName = sanitizeFilename(entry.title || entry.id, entry.id);
    const count = usedNames.get(baseName) || 0;

    if (count === 0) {
      usedNames.set(baseName, 1);
      filenameMap.set(entry.id, baseName);
    } else {
      usedNames.set(baseName, count + 1);
      filenameMap.set(entry.id, `${baseName} ${count}`);
    }
  }

  return filenameMap;
}

/**
 * Escape a string safely for YAML double-quoted scalar values.
 */
export function escapeYamlString(val: string): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

/**
 * Format multiline plain text / code into clean HTML for Anki flashcards.
 */
export function textToAnkiHtml(text: string): string {
  if (!text || !text.trim()) return "";

  // Split into lines
  const lines = text.split("\n");
  const htmlParts: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        // Close code block
        htmlParts.push(`<pre style="background:#1e1e2e;color:#cdd6f4;padding:8px;border-radius:6px;font-family:monospace;text-align:left;overflow-x:auto;"><code>${codeBuffer.join("<br>")}</code></pre>`);
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(escapeHtml(line));
    } else {
      // Check for bullet points
      if (/^\s*[•\-*]\s+/.test(line)) {
        const itemText = line.replace(/^\s*[•\-*]\s+/, "");
        htmlParts.push(`• ${escapeHtml(itemText)}`);
      } else if (line.trim().length > 0) {
        htmlParts.push(escapeHtml(line));
      } else {
        htmlParts.push("<br>");
      }
    }
  }

  if (inCodeBlock && codeBuffer.length > 0) {
    htmlParts.push(`<pre style="background:#1e1e2e;color:#cdd6f4;padding:8px;border-radius:6px;font-family:monospace;text-align:left;overflow-x:auto;"><code>${codeBuffer.join("<br>")}</code></pre>`);
  }

  return htmlParts.join("<br>").replace(/(<br>){3,}/g, "<br><br>");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Format tag list into Anki space-separated tag string (e.g. "leetcode binary-search hard").
 */
export function formatAnkiTags(entry: NotebookEntry): string {
  const tags: string[] = [];

  if (entry.platform) {
    tags.push(entry.platform.toLowerCase().replace(/\s+/g, "-"));
  }
  if (entry.difficulty) {
    tags.push(`diff-${entry.difficulty.toLowerCase().replace(/\s+/g, "-")}`);
  }
  if (entry.reviewStatus) {
    tags.push(`status-${entry.reviewStatus}`);
  }
  if (Array.isArray(entry.tags)) {
    for (const t of entry.tags) {
      if (t && t.trim()) {
        tags.push(t.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, ""));
      }
    }
  }

  return tags.join(" ");
}

// ─── Anki TSV Generator ──────────────────────────────────────────────

/**
 * Generates an Anki-importable TSV file with embedded HTML styling and field tags.
 * Anki can import this natively via "File -> Import".
 */
export function generateAnkiTsv(
  entries: NotebookEntry[],
  options: AnkiExportOptions = {}
): string {
  const cardType = options.cardType || "split";
  const deck = options.deckName || "CodeMate::CompetitiveProgramming";

  // Header declaring TSV configuration for Anki
  const rows: string[] = [
    "#separator:tab",
    "#html:true",
    "#tags column:4",
    `#deck:${deck}`,
    // Column format: Front \t Back \t Context \t Tags
  ];

  for (const entry of entries) {
    const title = entry.title || "Untitled Problem";
    const platform = entry.platform || "Competitive Programming";
    const url = entry.url || "";
    const tags = formatAnkiTags(entry);

    const titleHeader = `<div style="font-size:16px;font-weight:bold;color:#6678f5;margin-bottom:6px;">${escapeHtml(title)}</div>` +
      `<div style="font-size:11px;color:#888;margin-bottom:12px;">${escapeHtml(platform)}${url ? ` · <a href="${escapeHtml(url)}" style="color:#8b9dff;">View Problem</a>` : ""}</div>`;

    if (cardType === "split") {
      // 1. Invariant & Key Observation Card
      if (entry.observations && entry.observations.trim()) {
        const front = `${titleHeader}<div style="font-size:14px;font-weight:600;color:#e2e8f0;margin-top:8px;">💡 What is the core key observation, invariant, or mental model for this problem?</div>`;
        const back = `<div style="font-size:13px;color:#e2e8f0;line-height:1.6;">${textToAnkiHtml(entry.observations)}</div>`;
        rows.push([front, back, `${title} [Observation]`, tags].join("\t"));
      }

      // 2. Algorithm & Complexity Card
      if ((entry.approach && entry.approach.trim()) || (entry.complexityNotes && entry.complexityNotes.trim())) {
        const front = `${titleHeader}<div style="font-size:14px;font-weight:600;color:#e2e8f0;margin-top:8px;">🚀 What is the optimal algorithm and asymptotic complexity?</div>`;
        let backContent = "";
        if (entry.approach) {
          backContent += `<div style="margin-bottom:10px;"><strong style="color:#64d9ad;">Algorithm:</strong><br>${textToAnkiHtml(entry.approach)}</div>`;
        }
        if (entry.complexityNotes) {
          backContent += `<div><strong style="color:#ffb347;">Complexity:</strong><br>${textToAnkiHtml(entry.complexityNotes)}</div>`;
        }
        rows.push([front, backContent, `${title} [Algorithm]`, tags].join("\t"));
      }

      // 3. Mistakes & Pitfalls Card (only if notes exist)
      if (entry.mistakes && entry.mistakes.trim()) {
        const front = `${titleHeader}<div style="font-size:14px;font-weight:600;color:#ff6b6b;margin-top:8px;">⚠️ What mistakes, edge-cases, or bugs should you watch out for?</div>`;
        const back = `<div style="font-size:13px;color:#e2e8f0;line-height:1.6;">${textToAnkiHtml(entry.mistakes)}</div>`;
        rows.push([front, back, `${title} [Mistakes]`, tags].join("\t"));
      }
    } else {
      // Comprehensive single card
      const front = `${titleHeader}<div style="font-size:14px;font-weight:600;color:#e2e8f0;margin-top:8px;">Recall the complete solution breakdown (Observation, Algorithm, and Pitfalls).</div>`;
      let back = "";
      if (entry.observations) {
        back += `<div style="margin-bottom:10px;"><strong style="color:#8b9dff;">💡 Key Invariants:</strong><br>${textToAnkiHtml(entry.observations)}</div>`;
      }
      if (entry.approach) {
        back += `<div style="margin-bottom:10px;"><strong style="color:#64d9ad;">🚀 Algorithm:</strong><br>${textToAnkiHtml(entry.approach)}</div>`;
      }
      if (entry.complexityNotes) {
        back += `<div style="margin-bottom:10px;"><strong style="color:#ffb347;">⏱️ Complexity:</strong><br>${textToAnkiHtml(entry.complexityNotes)}</div>`;
      }
      if (entry.mistakes) {
        back += `<div><strong style="color:#ff6b6b;">⚠️ Pitfalls:</strong><br>${textToAnkiHtml(entry.mistakes)}</div>`;
      }
      rows.push([front, back || "No detailed notes saved.", title, tags].join("\t"));
    }
  }

  return rows.join("\n");
}

// ─── Obsidian Markdown Generator ─────────────────────────────────────

/**
 * Generate a single clean Markdown note with YAML frontmatter for Obsidian.
 */
export function generateObsidianMarkdown(entry: NotebookEntry): string {
  const title = entry.title || "Untitled Problem";
  const now = new Date().toISOString();

  // 1. Build YAML Frontmatter
  const frontmatter: string[] = [
    "---",
    `title: ${escapeYamlString(title)}`,
    `id: ${escapeYamlString(entry.id)}`,
    `platform: ${entry.platform || "LeetCode"}`,
    `url: ${escapeYamlString(entry.url || "")}`,
    `difficulty: ${escapeYamlString(entry.difficulty || "")}`,
    `review_status: ${entry.reviewStatus || "new"}`,
    `review_count: ${entry.reviewCount || 0}`,
    `next_review_date: ${escapeYamlString(entry.nextReviewDate || "")}`,
    `created_at: ${escapeYamlString(entry.createdAt || now)}`,
    `updated_at: ${escapeYamlString(entry.updatedAt || now)}`,
  ];

  // Tags array
  const tags: string[] = [];
  if (entry.platform) tags.push(entry.platform.toLowerCase());
  if (entry.difficulty) tags.push(entry.difficulty.toLowerCase());
  if (Array.isArray(entry.tags)) {
    for (const t of entry.tags) {
      if (t) tags.push(t.toLowerCase().replace(/\s+/g, "-"));
    }
  }

  if (tags.length > 0) {
    frontmatter.push("tags:");
    for (const tag of Array.from(new Set(tags))) {
      frontmatter.push(`  - ${tag}`);
    }
  }
  frontmatter.push("---\n");

  // 2. Build Markdown Body
  const body: string[] = [
    `# [${title}](${entry.url || "#"})`,
    "",
    `> **Platform**: ${entry.platform} | **Difficulty**: ${entry.difficulty || "Unspecified"} | **Status**: \`${entry.reviewStatus || "new"}\``,
    "",
  ];

  if (entry.observations && entry.observations.trim()) {
    body.push("## 💡 Key Observations & Invariants\n", entry.observations.trim(), "");
  }

  if (entry.approach && entry.approach.trim()) {
    body.push("## 🚀 Algorithmic Approach & Formulation\n", entry.approach.trim(), "");
  }

  if (entry.complexityNotes && entry.complexityNotes.trim()) {
    body.push("## ⏱️ Complexity Analysis\n", entry.complexityNotes.trim(), "");
  }

  if (entry.mistakes && entry.mistakes.trim()) {
    body.push("## ⚠️ Mistakes & Edge Cases to Avoid\n", entry.mistakes.trim(), "");
  }

  body.push("---", `*Generated by CodeMate AI CP Companion on ${new Date().toLocaleDateString()}*`);

  return frontmatter.join("\n") + body.join("\n");
}

/**
 * Packages multiple notebook entries into an Obsidian-ready ZIP archive with an optional Table of Contents Index.
 */
export async function generateObsidianZip(
  entries: NotebookEntry[],
  options: ObsidianExportOptions = { includeIndex: true }
): Promise<Blob> {
  const zip = new JSZip();
  const filenameMap = deduplicateFilenames(entries);

  // Add individual markdown files
  for (const entry of entries) {
    const filename = `${filenameMap.get(entry.id)}.md`;
    const markdownContent = generateObsidianMarkdown(entry);
    zip.file(filename, markdownContent);
  }

  // Add Index Table of Contents if requested
  if (options.includeIndex) {
    const indexRows: string[] = [
      "# 📚 CodeMate Problem Notes Vault",
      "",
      `*Exported ${entries.length} notes on ${new Date().toLocaleDateString()}*`,
      "",
      "| Problem | Platform | Difficulty | Status | Next Review |",
      "| :--- | :--- | :--- | :--- | :--- |",
    ];

    for (const entry of entries) {
      const filename = filenameMap.get(entry.id);
      const title = entry.title || "Untitled";
      const platform = entry.platform || "-";
      const diff = entry.difficulty || "-";
      const status = entry.reviewStatus || "new";
      const reviewDate = entry.nextReviewDate ? entry.nextReviewDate.slice(0, 10) : "-";

      indexRows.push(`| [[${filename}\\|${title}]] | ${platform} | ${diff} | \`${status}\` | ${reviewDate} |`);
    }

    indexRows.push("", "---", "*CodeMate — AI Competitive Programming Companion*");
    zip.file("00_Index.md", indexRows.join("\n"));
  }

  return zip.generateAsync({ type: "blob" });
}
