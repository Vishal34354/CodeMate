/**
 * Code Review Engine
 * 
 * Performs pattern-based static analysis on user code.
 * Supports C++, Python, and Java.
 * 
 * Clearly distinguishes between:
 * - Certain syntactic observations
 * - Possible bugs (heuristic)
 * - Style suggestions
 * 
 * Does NOT claim to compile code or verify correctness.
 * Does NOT execute arbitrary user code.
 */

import type { CodeFinding, FindingSeverity, FindingSource } from "@/types";

interface Pattern {
  test: RegExp;
  message: string;
  severity: FindingSeverity;
  source: FindingSource;
  language?: "cpp" | "python" | "java" | "any";
}

const PATTERNS: Pattern[] = [
  // ─── C++ Patterns ───────────────────────────────────────────
  {
    test: /\bint\s+\w+\s*=\s*1e18/,
    message: "Probable overflow: 1e18 exceeds int range. Use `long long` instead.",
    severity: "error",
    source: "syntactic",
    language: "cpp",
  },
  {
    test: /\bint\s+\w+\s*=\s*1e9/,
    message: "Caution: 1e9 is close to the int limit (2.1×10⁹). If multiplied or added, it may overflow. Consider `long long`.",
    severity: "warning",
    source: "heuristic",
    language: "cpp",
  },
  {
    test: /\b(?:for|while)\s*\([^)]*<=\s*\w+\.size\(\)/,
    message: "Possible off-by-one: `.size()` returns an unsigned value. Using `<=` may access one past the end, or underflow if size is 0 and compared with a signed index.",
    severity: "error",
    source: "syntactic",
    language: "cpp",
  },
  {
    test: /\bint\s+\w+\s*=\s*\w+\.size\(\)/,
    message: "Type mismatch: `.size()` returns `size_t` (unsigned). Assigning to `int` may cause issues with large containers or negative comparisons.",
    severity: "warning",
    source: "syntactic",
    language: "cpp",
  },
  {
    test: /#include\s*<bits\/stdc\+\+\.h>/,
    message: "Style: `#include <bits/stdc++.h>` is non-standard and not portable. Fine for contests, but avoid in production code.",
    severity: "info",
    source: "syntactic",
    language: "cpp",
  },
  {
    test: /using\s+namespace\s+std/,
    message: "Style: `using namespace std` pollutes the global namespace. Acceptable in contests but risky in larger projects.",
    severity: "info",
    source: "syntactic",
    language: "cpp",
  },
  {
    test: /\bnew\s+\w+[\[<]/,
    message: "Manual memory management detected. Consider using smart pointers or containers unless performance-critical.",
    severity: "suggestion",
    source: "heuristic",
    language: "cpp",
  },
  {
    test: /\bsort\s*\(\s*\w+\.begin\s*\(\).*\[.*\]\s*\{[^}]*<=[^}]*\}/,
    message: "Comparator check: ensure it defines a strict weak ordering (never returns true for equal elements).",
    severity: "warning",
    source: "heuristic",
    language: "cpp",
  },
  {
    test: /\b(?:sort|stable_sort)\s*\(/,
    message: "Sorting check: verify the comparator is a strict weak ordering and that sorting doesn't destroy needed original indices.",
    severity: "info",
    source: "heuristic",
    language: "cpp",
  },
  {
    test: /\bvector<\s*bool\s*>/,
    message: "Warning: `vector<bool>` is a special case in C++ and doesn't behave like a normal vector. Consider `vector<char>` or `bitset` instead.",
    severity: "warning",
    source: "syntactic",
    language: "cpp",
  },
  {
    test: /\bpow\s*\([^)]*\)/,
    message: "Floating-point `pow()` can cause precision errors for integer arithmetic. Consider using integer exponentiation instead.",
    severity: "warning",
    source: "heuristic",
    language: "cpp",
  },

  // ─── Python Patterns ────────────────────────────────────────
  {
    test: /\brange\s*\(\s*len\s*\(/,
    message: "Style: `for i in range(len(x))` can often be replaced with `for i, val in enumerate(x)` or direct iteration.",
    severity: "info",
    source: "heuristic",
    language: "python",
  },
  {
    test: /\bdef\s+\w+\s*\([^)]*\[\]\s*[=]/,
    message: "Mutable default argument: using a list as a default parameter value is a common Python bug. Use `None` and initialize inside the function.",
    severity: "error",
    source: "syntactic",
    language: "python",
  },
  {
    test: /\bglobal\s+/,
    message: "Using `global` variables can make code harder to reason about. Consider passing values as parameters instead.",
    severity: "info",
    source: "heuristic",
    language: "python",
  },
  {
    test: /sys\.setrecursionlimit/,
    message: "Increased recursion limit detected. Deep recursion can cause stack overflow. Consider an iterative approach for very deep recursion.",
    severity: "warning",
    source: "heuristic",
    language: "python",
  },
  {
    test: /\bexcept\s*:/,
    message: "Bare `except:` catches all exceptions including SystemExit and KeyboardInterrupt. Specify the exception type.",
    severity: "warning",
    source: "syntactic",
    language: "python",
  },

  // ─── Java Patterns ──────────────────────────────────────────
  {
    test: /==\s*(?:new\s+\w+|"[^"]*")/,
    message: "In Java, `==` compares references, not values. Use `.equals()` for object comparison.",
    severity: "error",
    source: "syntactic",
    language: "java",
  },
  {
    test: /\bint\s+\w+\s*=\s*Integer\.MAX_VALUE.*\+/,
    message: "Adding to Integer.MAX_VALUE will overflow. Use `long` for intermediate calculations.",
    severity: "error",
    source: "heuristic",
    language: "java",
  },
  {
    test: /\.length\s*-\s*1(?!\s*[;\)])/,
    message: "Check: `.length - 1` can be -1 for empty arrays, which may cause ArrayIndexOutOfBoundsException.",
    severity: "warning",
    source: "heuristic",
    language: "java",
  },

  // ─── Universal Patterns ─────────────────────────────────────
  {
    test: /\b(?:dfs|bfs)\s*\(/i,
    message: "Graph traversal detected: confirm visited-state handling and recursion depth (iterative may be safer for deep graphs).",
    severity: "info",
    source: "heuristic",
    language: "any",
  },
  {
    test: /long\s+long/,
    message: "Good: `long long` detected. Still verify that intermediate products and accumulations don't overflow.",
    severity: "info",
    source: "syntactic",
    language: "any",
  },
  {
    test: /\bmod\b|\bMOD\b|%\s*(?:1e9|1000000007|998244353)/,
    message: "Modular arithmetic detected. Ensure you apply mod after every addition/multiplication, not just at the end. Check for negative remainders.",
    severity: "info",
    source: "heuristic",
    language: "any",
  },
  {
    test: /(?:\/\/|#)\s*TODO|(?:\/\/|#)\s*FIXME|(?:\/\/|#)\s*HACK/i,
    message: "TODO/FIXME/HACK comment found. Make sure this is addressed before submission.",
    severity: "warning",
    source: "syntactic",
    language: "any",
  },
];

// ─── Language Detection ─────────────────────────────────────────────

function detectLanguage(code: string): "cpp" | "python" | "java" | "unknown" {
  if (/^#include\s*<|^using\s+namespace|^#pragma|\bvector<|\bint\s+main\s*\(/m.test(code)) return "cpp";
  if (/^import\s+java\.|^public\s+class|^class\s+\w+\s*\{|\bSystem\.out\.print/m.test(code)) return "java";
  if (/^(?:def|class|import|from)\s+|\bprint\s*\(|^\s*if\s+__name__/m.test(code)) return "python";
  return "unknown";
}

// ─── Main Analysis Function ─────────────────────────────────────────

export function analyzeCode(code: string): CodeFinding[] {
  if (!code.trim()) {
    return [{
      severity: "info",
      source: "syntactic",
      message: "No code provided. Paste your code to check for common patterns.",
    }];
  }

  const language = detectLanguage(code);
  const findings: CodeFinding[] = [];

  // Language detection info
  if (language !== "unknown") {
    findings.push({
      severity: "info",
      source: "syntactic",
      message: `Detected language: ${language === "cpp" ? "C++" : language === "java" ? "Java" : "Python"}`,
    });
  }

  // Run pattern checks
  for (const pattern of PATTERNS) {
    if (pattern.language && pattern.language !== "any" && pattern.language !== language) {
      continue;
    }
    if (pattern.test.test(code)) {
      findings.push({
        severity: pattern.severity,
        source: pattern.source,
        message: pattern.message,
      });
    }
  }

  // Add manual checklist if no warnings/errors found
  const hasIssues = findings.some((f) => f.severity === "error" || f.severity === "warning");
  if (!hasIssues) {
    findings.push({
      severity: "info",
      source: "heuristic",
      message: "No pattern-based issues detected. This does not prove correctness — it only means common pitfalls were not matched.",
    });
  }

  // Always add the manual checklist
  findings.push({
    severity: "info",
    source: "heuristic",
    message: "Manual checklist:\n• Empty/minimum input\n• Duplicate values and boundary cases\n• Integer overflow in intermediate calculations\n• Required time and memory complexity\n• Correct input/output format",
  });

  return findings;
}

export { detectLanguage };
