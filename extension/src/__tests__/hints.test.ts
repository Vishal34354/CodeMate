import { describe, it, expect } from "vitest";
import { generateHints } from "../sidepanel/services/hint-engine";
import type { ProblemContext } from "../types";

describe("Progressive Hint Engine", () => {
  const mockProblem: ProblemContext = {
    platform: "LeetCode",
    problemId: "leetcode:two-sum",
    title: "Two Sum",
    url: "https://leetcode.com/problems/two-sum/",
    statement: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    examples: "Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]",
    constraints: "2 <= nums.length <= 10^4",
    tags: ["Array", "Hash Table"],
    difficulty: "Easy",
    editorCode: "",
    pageTitle: "Two Sum - LeetCode",
    extractedAt: Date.now(),
    extractionQuality: "full",
  };

  it("generates exactly 4 progressive hint levels", () => {
    const hints = generateHints(mockProblem);
    expect(hints).toHaveLength(4);
    expect(hints[0].level).toBe(1);
    expect(hints[1].level).toBe(2);
    expect(hints[2].level).toBe(3);
    expect(hints[3].level).toBe(4);
  });

  it("incorporates topic heuristics for Hash Table problems", () => {
    const hints = generateHints(mockProblem);
    const approachHint = hints[1].content;
    expect(approachHint.toLowerCase()).toMatch(/hash|map|complement|lookup/);
  });

  it("handles empty or generic problem context without crashing", () => {
    const genericProblem: ProblemContext = {
      platform: "Codeforces",
      problemId: "codeforces:999/Z",
      title: "Unknown Problem",
      url: "https://codeforces.com/problemset/problem/999/Z",
      statement: "A tricky sequence problem.",
      examples: "",
      constraints: "",
      tags: [],
      difficulty: "",
      editorCode: "",
      pageTitle: "Codeforces",
      extractedAt: Date.now(),
      extractionQuality: "title-only",
    };

    const hints = generateHints(genericProblem);
    expect(hints).toHaveLength(4);
    expect(hints[0].content).toBeTruthy();
  });
});
