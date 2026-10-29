import { describe, it, expect } from "vitest";
import {
  normalizeProblemUrl,
  detectPlatform,
  isSupportedProblemUrl,
  slugToTitle,
  getNextReviewDate,
} from "../utils";

describe("URL Utilities", () => {
  it("normalizes LeetCode URLs correctly", () => {
    expect(normalizeProblemUrl("https://leetcode.com/problems/two-sum/")).toBe("leetcode:two-sum");
    expect(normalizeProblemUrl("https://leetcode.com/problems/01-matrix/description/?envType=daily")).toBe("leetcode:01-matrix");
    expect(normalizeProblemUrl("https://leetcode.com/problems/trapping-rain-water/description/?envType=daily")).toBe("leetcode:trapping-rain-water");
  });

  it("normalizes Codeforces problemset URLs correctly", () => {
    expect(normalizeProblemUrl("https://codeforces.com/problemset/problem/4/A")).toBe("codeforces:4/A");
    expect(normalizeProblemUrl("https://codeforces.com/problemset/problem/1850/C?locale=en")).toBe("codeforces:1850/C");
    expect(normalizeProblemUrl("https://codeforces.com/problemset/problem/2276/G")).toBe("codeforces:2276/G");
  });

  it("normalizes Codeforces contest and gym URLs correctly", () => {
    expect(normalizeProblemUrl("https://codeforces.com/contest/1900/problem/B")).toBe("codeforces:1900/B");
    expect(normalizeProblemUrl("https://codeforces.com/gym/1234/problem/A")).toBe("codeforces:1234/A");
  });

  it("detects platforms accurately", () => {
    expect(detectPlatform("https://leetcode.com/problems/merge-k-sorted-lists/")).toBe("LeetCode");
    expect(detectPlatform("https://codeforces.com/problemset/problem/71/A")).toBe("Codeforces");
    expect(detectPlatform("https://google.com")).toBeNull();
  });

  it("validates supported problem URLs", () => {
    expect(isSupportedProblemUrl("https://leetcode.com/problems/3sum/")).toBe(true);
    expect(isSupportedProblemUrl("https://leetcode.com/contest/")).toBe(false);
    expect(isSupportedProblemUrl("https://codeforces.com/problemset/problem/1/A")).toBe(true);
    expect(isSupportedProblemUrl("https://codeforces.com/ratings")).toBe(false);
  });

  it("converts slugs to readable titles", () => {
    expect(slugToTitle("longest-substring-without-repeating-characters")).toBe(
      "Longest Substring Without Repeating Characters"
    );
  });

  it("calculates spaced repetition review dates into the future", () => {
    const nextDateStr = getNextReviewDate(0);
    const today = new Date().toISOString().split("T")[0];
    expect(nextDateStr > today).toBe(true);
  });
});
