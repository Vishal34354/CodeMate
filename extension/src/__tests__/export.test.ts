import { describe, it, expect } from "vitest";
import {
  sanitizeFilename,
  deduplicateFilenames,
  escapeYamlString,
  textToAnkiHtml,
  formatAnkiTags,
  generateAnkiTsv,
  generateObsidianMarkdown,
  generateObsidianZip,
} from "../sidepanel/services/export-service";
import type { NotebookEntry } from "@/types";
import JSZip from "jszip";

const sampleEntry1: NotebookEntry = {
  id: "leetcode:two-sum",
  title: "Two Sum",
  platform: "LeetCode",
  url: "https://leetcode.com/problems/two-sum/",
  tags: ["array", "hash-table"],
  difficulty: "Easy",
  approach: "One-pass hash map storing complement indices.",
  mistakes: "Checked same index twice when target was 2 * num.",
  observations: "• Complement invariant: complement = target - nums[i].\n• Single pass lookup.",
  complexityNotes: "• Time: O(N)\n• Space: O(N)",
  reviewStatus: "learning",
  nextReviewDate: "2026-10-31",
  reviewCount: 1,
  createdAt: "2026-10-29T10:00:00.000Z",
  updatedAt: "2026-10-29T10:30:00.000Z",
};

const sampleEntry2: NotebookEntry = {
  id: "codeforces:4/A",
  title: 'Watermelon: Divide by 2 / "Even"',
  platform: "Codeforces",
  url: "https://codeforces.com/problemset/problem/4/A",
  tags: ["math", "brute-force"],
  difficulty: "800",
  approach: "return w > 2 && w % 2 == 0",
  mistakes: "Forgot w = 2 edge case which yields (1, 1).",
  observations: "Sum of two even integers > 0 must be even and >= 4.",
  complexityNotes: "O(1) time and space",
  reviewStatus: "mastered",
  nextReviewDate: "2026-11-15",
  reviewCount: 3,
  createdAt: "2026-10-25T10:00:00.000Z",
  updatedAt: "2026-10-25T10:30:00.000Z",
};

describe("Export Service - Filename Sanitization & Deduplication", () => {
  it("sanitizes illegal filesystem characters properly", () => {
    expect(sanitizeFilename('Problem: 4/A "Watermelon"? <Test>|*')).toBe("Problem 4 A Watermelon Test");
    expect(sanitizeFilename("..")).toBe("problem-note");
    expect(sanitizeFilename("../../../etc/passwd")).toBe("etc passwd");
    expect(sanitizeFilename("   Trapping Rain Water   ")).toBe("Trapping Rain Water");
  });

  it("preserves Unicode titles and emojis safely", () => {
    expect(sanitizeFilename("两数之和 - Two Sum 🚀")).toBe("两数之和 - Two Sum 🚀");
  });

  it("handles duplicate titles by adding numeric suffixes", () => {
    const entries: NotebookEntry[] = [
      { ...sampleEntry1, id: "1", title: "Two Sum" },
      { ...sampleEntry1, id: "2", title: "Two Sum" },
      { ...sampleEntry1, id: "3", title: "Two Sum" },
    ];
    const map = deduplicateFilenames(entries);
    expect(map.get("1")).toBe("Two Sum");
    expect(map.get("2")).toBe("Two Sum 1");
    expect(map.get("3")).toBe("Two Sum 2");
  });
});

describe("Export Service - Anki TSV Generation", () => {
  it("formats Anki tags with hyphenation and platform prefixes", () => {
    const tags = formatAnkiTags(sampleEntry1);
    expect(tags).toContain("leetcode");
    expect(tags).toContain("diff-easy");
    expect(tags).toContain("status-learning");
    expect(tags).toContain("hash-table");
  });

  it("converts bullet points and code blocks to clean Anki HTML", () => {
    const html = textToAnkiHtml("• Point 1\n• Point 2\n```cpp\nint ans = 0;\n```");
    expect(html).toContain("• Point 1");
    expect(html).toContain("<pre style=");
    expect(html).toContain("int ans = 0;");
  });

  it("generates split Anki cards for Observation, Algorithm, and Mistakes", () => {
    const tsv = generateAnkiTsv([sampleEntry1], { cardType: "split" });
    const lines = tsv.split("\n");

    expect(lines[0]).toBe("#separator:tab");
    expect(lines[1]).toBe("#html:true");
    expect(lines[2]).toBe("#tags column:4");

    // Sample 1 has observation, approach/complexity, and mistakes -> 3 cards
    const cardRows = lines.slice(4);
    expect(cardRows.length).toBe(3);

    // Card 1: Observation
    expect(cardRows[0]).toContain("What is the core key observation");
    expect(cardRows[0]).toContain("Complement invariant");

    // Card 2: Algorithm
    expect(cardRows[1]).toContain("What is the optimal algorithm");
    expect(cardRows[1]).toContain("One-pass hash map");

    // Card 3: Mistakes
    expect(cardRows[2]).toContain("What mistakes, edge-cases, or bugs");
    expect(cardRows[2]).toContain("Checked same index twice");
  });

  it("generates a comprehensive single Anki card if requested", () => {
    const tsv = generateAnkiTsv([sampleEntry1], { cardType: "comprehensive" });
    const lines = tsv.split("\n");
    const cardRows = lines.slice(4);
    expect(cardRows.length).toBe(1);
    expect(cardRows[0]).toContain("💡 Key Invariants:");
    expect(cardRows[0]).toContain("🚀 Algorithm:");
    expect(cardRows[0]).toContain("⚠️ Pitfalls:");
  });
});

describe("Export Service - Obsidian Markdown & ZIP Generation", () => {
  it("escapes YAML scalars with quotes, newlines, and colons safely", () => {
    expect(escapeYamlString('Hello "World"')).toBe('"Hello \\"World\\""');
    expect(escapeYamlString("Line 1\nLine 2")).toBe('"Line 1\\nLine 2"');
    expect(escapeYamlString("Problem: 4/A")).toBe('"Problem: 4/A"');
  });

  it("generates valid Obsidian Markdown note with frontmatter", () => {
    const md = generateObsidianMarkdown(sampleEntry1);
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain('title: "Two Sum"');
    expect(md).toContain("platform: LeetCode");
    expect(md).toContain("difficulty: \"Easy\"");
    expect(md).toContain("## 💡 Key Observations & Invariants");
    expect(md).toContain("## 🚀 Algorithmic Approach & Formulation");
    expect(md).toContain("## ⏱️ Complexity Analysis");
    expect(md).toContain("## ⚠️ Mistakes & Edge Cases to Avoid");
  });

  it("packages multiple markdown notes into an Obsidian ZIP with an Index note", async () => {
    const zipBlob = await generateObsidianZip([sampleEntry1, sampleEntry2], { includeIndex: true });
    expect(zipBlob).toBeDefined();
    expect(zipBlob.size).toBeGreaterThan(0);

    const loadedZip = await JSZip.loadAsync(zipBlob);
    expect(loadedZip.file("Two Sum.md")).not.toBeNull();
    expect(loadedZip.file("Watermelon Divide by 2 Even.md")).not.toBeNull();
    expect(loadedZip.file("00_Index.md")).not.toBeNull();

    const indexContent = await loadedZip.file("00_Index.md")!.async("string");
    expect(indexContent).toContain("[[Two Sum\\|Two Sum]]");
    expect(indexContent).toContain("CodeMate Problem Notes Vault");
  });
});

