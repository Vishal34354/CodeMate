import { describe, it, expect } from "vitest";
import { analyzeCode, detectLanguage } from "../sidepanel/services/code-review";

describe("Code Review & Heuristic Analysis", () => {
  it("detects languages accurately", () => {
    expect(detectLanguage("#include <iostream>\nusing namespace std;\nint main() {}")).toBe("cpp");
    expect(detectLanguage("import java.util.*;\npublic class Solution {}")).toBe("java");
    expect(detectLanguage("def solve():\n    print('hello')")).toBe("python");
  });

  it("identifies integer overflow risk for 1e18 in standard int", () => {
    const code = `
      #include <vector>
      int main() {
        int infinity = 1e18;
      }
    `;
    const findings = analyzeCode(code);
    const overflowFinding = findings.find((f) => f.message.includes("1e18 exceeds int range"));
    expect(overflowFinding).toBeDefined();
    expect(overflowFinding?.severity).toBe("error");
  });

  it("identifies unsigned off-by-one `<=` on size()", () => {
    const code = `
      #include <vector>
      void test(std::vector<int>& v) {
        for (int i = 0; i <= v.size(); i++) {
        }
      }
    `;
    const findings = analyzeCode(code);
    const offByOneFinding = findings.find((f) => f.message.includes("off-by-one"));
    expect(offByOneFinding).toBeDefined();
    expect(offByOneFinding?.severity).toBe("error");
  });

  it("flags TODO comments", () => {
    const code = `
      def solve():
          # TODO: fix edge case when n is 0
          return 42
    `;
    const findings = analyzeCode(code);
    const todoFinding = findings.find((f) => f.message.includes("TODO"));
    expect(todoFinding).toBeDefined();
    expect(todoFinding?.severity).toBe("warning");
  });
});
