import { describe, it, expect } from "vitest";
import app from "../src/index.js";
import { handleLocalMockQuery } from "../src/providers/local-mock.js";

describe("Backend Local Mock Provider", () => {
  it("generates progressive hints", () => {
    const res = handleLocalMockQuery({
      type: "hint",
      problemTitle: "Two Sum",
      problemStatement: "Given an array of integers nums and an integer target...",
      hintLevel: 1,
    });
    expect(res.ok).toBe(true);
    expect(res.content).toContain("Level 1");
    expect(res.model).toBe("codemate-local-engine");
  });

  it("generates conceptual explanation without spoiling code", () => {
    const res = handleLocalMockQuery({
      type: "explain",
      problemTitle: "Subarray Sum Equals K",
      problemStatement: "Given an array of integers nums and an integer k, return the total number of continuous subarrays whose sum equals to k.",
      constraints: "1 <= nums.length <= 2 * 10^5",
    });
    expect(res.ok).toBe(true);
    expect(res.content).toContain("Conceptual Breakdown");
    expect(res.content).toContain("10⁵");
  });

  it("diagnoses code pitfalls", () => {
    const buggyCode = `
      #include <bits/stdc++.h>
      using namespace std;
      int main() {
        int val = 1e18;
        for (int i = 0; i <= vec.size(); i++) {}
      }
    `;
    const res = handleLocalMockQuery({
      type: "debug",
      problemTitle: "Sample Problem",
      problemStatement: "Sample statement",
      userCode: buggyCode,
    });
    expect(res.ok).toBe(true);
    expect(res.content).toContain("Overflow");
    expect(res.content).toContain("Unsigned");
  });
});
