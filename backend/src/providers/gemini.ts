import type { QueryRequest, QueryResponse } from "../schemas/query-schema.js";

export async function queryGemini(req: QueryRequest, apiKey: string, model = "gemini-flash-lite-latest"): Promise<QueryResponse> {
  let systemInstruction = `You are CodeMate, an expert competitive programming companion.
Your mission is to help competitive programmers think systematically and master algorithms.`;

  let prompt = "";

  if (req.type === "approaches") {
    systemInstruction += `
You are an expert competitive programmer and algorithm judge.
When generating multi-approach solutions:
1. NEVER produce ambiguous, placeholder, or half-finished code (e.g. NEVER write '// Delegating to optimal solution' or '// Placeholder' or leave empty bodies).
2. Every approach MUST have FULL, WORKING, COMPILABLE code in C++, Java, and Python 3.
3. If an approach is a Brute Force that TLEs, write the COMPLETE working brute force implementation anyway so the user can understand and run it.
4. Ensure correctness against all problem constraints. Strictly verify the mathematical logic before writing code.
5. STRICT COMMENT-LESS CODE REQUIREMENT: All code inside markdown code blocks (C++, Java, Python 3) MUST BE COMPLETELY COMMENT-LESS. Do NOT write single-line comments (// or #) or multi-line comments (/* */ or """ """) inside code blocks. The code must be pure, clean, production-ready, and comment-free so it is immediately copy-pasteable into an online judge without clutter.

Follow this exact structure:
### Approach 1: Brute Force / Simulation
#### 1. Intuition & High-Level Idea
#### 2. Complexity Analysis ($O(...)$ Time and Space with clear proof)
#### 3. Step-by-Step Logic Explanation
#### 4. Full Complete Code to Copy (Working, COMMENT-LESS C++, Java, and Python 3 with NO placeholders)

### Approach 2: Intermediate / Better Optimization
#### 1. Intuition & High-Level Idea
#### 2. Complexity Analysis ($O(...)$ Time and Space with clear proof)
#### 3. Step-by-Step Logic Explanation
#### 4. Full Complete Code to Copy (Working, COMMENT-LESS C++, Java, and Python 3 with NO placeholders)

### Approach 3: Peak Optimal Algorithm
#### 1. Intuition & High-Level Idea
#### 2. Complexity Analysis ($O(...)$ Time and Space with clear proof)
#### 3. Step-by-Step Logic Explanation
#### 4. Full Complete Code to Copy (Working, COMMENT-LESS C++, Java, and Python 3 with NO placeholders)

### Summary Comparison Table
Include Time, Space, Verdict, and Trade-offs across all 3 approaches.`;

    prompt = `Solve this problem across 3 distinct approaches (Brute Force -> Intermediate -> Peak Optimal) with complete, bug-free, comment-less, copy-paste ready code in C++, Java, and Python 3 for each approach. Remember: DO NOT include any comments inside code blocks.
Problem: ${req.problemTitle}
Statement:
${req.problemStatement}
${req.constraints ? `Constraints:\n${req.constraints}` : ""}
${req.additionalContext ? `Context:\n${req.additionalContext}` : ""}`;
  } else if (req.type === "debug") {
    systemInstruction += `
You are in CodeMate Debug Mode.
Analyze the user's submitted code against the problem statement and constraints.
Be extremely specific:
1. Diagnosis: Is it Wrong Answer (WA), Time Limit Exceeded (TLE), Integer Overflow, or Edge Case failure?
2. Line-by-Line Vulnerability: Pinpoint the exact lines with logic flaws, off-by-one errors, or unsafe operations.
3. Minimal Counter-Example: Provide a specific, concrete test input where this code fails, the expected output, and the actual output.
4. Complexity Bottleneck: If TLE, calculate the worst-case operations and show why it exceeds ~10⁸ ops/sec.
5. Actionable Guidance: Provide step-by-step guidance on how to fix the logic without giving away raw code unless necessary.`;

    prompt = `Debug this competitive programming solution:
Problem: ${req.problemTitle}
Statement:
${req.problemStatement}
${req.constraints ? `Constraints:\n${req.constraints}` : ""}
User Code:
\`\`\`
${req.userCode || "No code provided"}
\`\`\`
${req.additionalContext ? `Context:\n${req.additionalContext}` : ""}`;
  } else {
    systemInstruction += `
RULES:
1. Do not give away complete code solutions directly; use Socratic questioning and progressive guidance.
2. Emphasize invariants, constraint limits, and mathematical properties.`;

    prompt = `[Request Type: ${req.type}]
Problem: ${req.problemTitle}
Statement:
${req.problemStatement}
${req.constraints ? `Constraints:\n${req.constraints}` : ""}
${req.userCode ? `User Code:\n\`\`\`\n${req.userCode}\n\`\`\`` : ""}
${req.hintLevel ? `Hint Level: Level ${req.hintLevel} of 4` : ""}
${req.additionalContext ? `Context: ${req.additionalContext}` : ""}`;
  }

  const cleanedModel = model.replace(/^models\//, "");
  const candidateModels = Array.from(new Set([
    cleanedModel,
    "gemini-2.0-flash",
    "gemini-flash-lite-latest",
    "gemini-1.5-flash-latest",
    "gemini-2.0-flash-exp",
    "gemini-1.5-pro",
  ])).filter((m) => m && !m.includes("2.5") && m !== "gemini-1.5-flash");

  let lastError = "";

  for (const candidate of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey.trim(),
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
          },
        }),
      });

      if (res.status === 404) {
        const errText = await res.text().catch(() => "");
        lastError = `Model ${candidate} 404: ${errText.slice(0, 100)}`;
        continue;
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${errorText.slice(0, 300)}`);
      }

      const data = await res.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Gemini returned empty candidate response.");
      }

      return {
        ok: true,
        content: text,
        model: `gemini/${candidate}`,
      };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Gemini API request timed out after 55s.");
      }
      lastError = err instanceof Error ? err.message : "Network error";
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(`Could not query Gemini with any candidate model. ${lastError}`);
}
