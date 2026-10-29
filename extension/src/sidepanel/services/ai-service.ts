/**
 * AI Service — Optional backend integration
 * 
 * Provides an interface for AI-powered hints, explanations, and debugging.
 * API keys stay on the backend; the extension never stores them.
 * 
 * Requirements:
 * - Never sends data without explicit user action
 * - Never sends cookies, credentials, or unrelated page data
 * - Shows what will be shared before sending
 * - Works gracefully when the backend is unavailable
 */

import type { ProblemContext, Settings, HintLevel } from "@/types";

export interface AIRequest {
  type: "hint" | "explain" | "debug" | "compare" | "edge-cases" | "complexity" | "approaches";
  problemTitle: string;
  problemStatement: string;
  constraints?: string;
  userCode?: string;
  hintLevel?: HintLevel;
  additionalContext?: string;
}

export interface AIResponse {
  ok: boolean;
  content: string;
  source: "ai";
  model?: string;
  error?: string;
}

/**
 * What data will be sent to the AI backend.
 * Show this to the user before sending.
 */
export function describeDataSharing(request: AIRequest): string {
  const parts: string[] = [];
  parts.push(`• Problem title: "${request.problemTitle}"`);

  if (request.problemStatement) {
    const len = request.problemStatement.length;
    parts.push(`• Problem statement: ${len} characters`);
  }

  if (request.constraints) {
    parts.push(`• Problem constraints`);
  }

  if (request.userCode) {
    const lines = request.userCode.split("\n").length;
    parts.push(`• Your code: ${lines} lines`);
  }

  parts.push(`\nThis data will be sent to: your configured backend server.`);
  parts.push(`The backend forwards it to the configured AI provider.`);
  parts.push(`No cookies, credentials, or unrelated data will be included.`);

  return parts.join("\n");
}

/**
 * Check if the AI backend is available.
 */
export async function checkBackendHealth(backendUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${backendUrl}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Directly query Gemini API from extension using user's free API key
 */
/**
 * Directly query Gemini API from extension with automatic model fallbacks
 */
async function queryGeminiDirect(
  apiKey: string,
  model = "gemini-2.0-flash",
  request: AIRequest
): Promise<AIResponse> {
  // Candidate models to try in sequence if a model returns 404
  const cleanedModel = model.replace(/^models\//, "");
  const candidateModels = Array.from(new Set([
    cleanedModel,
    "gemini-2.0-flash",
    "gemini-flash-lite-latest",
    "gemini-1.5-flash-latest",
    "gemini-2.0-flash-exp",
    "gemini-1.5-pro",
  ])).filter((m) => m && !m.includes("2.5") && m !== "gemini-1.5-flash");

  let systemInstruction = `You are CodeMate, an expert competitive programming companion. Your mission is to help competitive programmers think systematically and master algorithms.`;
  let promptText = "";

  if (request.type === "approaches") {
    systemInstruction += `
You are an expert competitive programmer and algorithm judge.
When generating multi-approach solutions:
1. NEVER produce ambiguous, placeholder, or half-finished code (e.g. NEVER write '// Delegating to optimal solution' or '// Placeholder' or leave empty bodies).
2. Every approach MUST have FULL, WORKING, COMPILABLE code in C++, Java, and Python 3.
3. If an approach is a Brute Force that TLEs, write the COMPLETE working brute force implementation anyway so the user can understand and run it.
4. Ensure correctness against all problem constraints. Strictly verify the mathematical logic before writing code.
5. STRICT COMMENT-LESS CODE REQUIREMENT: All code inside markdown code blocks (C++, Java, Python 3) MUST BE COMPLETELY COMMENT-LESS. Do NOT include single-line comments (// or #) or multi-line comments (/* */ or """ """) inside the code blocks. The code must be pure, clean, production-ready, and comment-free so it is immediately copy-pasteable into an online judge without clutter.

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
Include Time, Space, Verdict, and Trade-offs.`;

    promptText = `Solve this problem across 3 distinct approaches (Brute Force -> Intermediate -> Peak Optimal) with complete, bug-free, comment-less, copy-paste ready code in C++, Java, and Python 3 for each approach. Remember: DO NOT put any comments inside the code blocks.
Problem: ${request.problemTitle}
Statement:
${request.problemStatement}
${request.constraints ? `Constraints:\n${request.constraints}` : ""}
${request.additionalContext ? `Context:\n${request.additionalContext}` : ""}`;
  } else if (request.type === "debug") {
    systemInstruction += `
Focus purely on identifying the exact logical bug, edge case miss, or invariant violation in the user's code.
Provide:
1. Bug Identification (line and logic)
2. Failing Edge Case
3. Minimal Surgical Fix`;

    promptText = `Debug this code:
Problem: ${request.problemTitle}
Statement: ${request.problemStatement}
User Code:
${request.userCode || "No code provided"}
${request.additionalContext ? `Context:\n${request.additionalContext}` : ""}`;
  } else if (request.type === "explain") {
    systemInstruction += `
Provide an in-depth Socratic breakdown of this problem.
Keep each section crisp, punchy, and structured:
1. Core Mental Model & Invariant (Why is the problem formulated this way?)
2. State Transition & Observation Walkthrough (Use clear bullet points with concise, complete examples).
3. Critical Edge Cases (Boundary cases, integer overflow, zeroes/negatives).
NEVER leave calculations or sentences half-finished. Keep formatting clean and readable without overwhelming walls of text.`;

    promptText = `Provide an in-depth conceptual and invariant breakdown for:
Problem: ${request.problemTitle}
Statement:
${request.problemStatement}
${request.constraints ? `Constraints:\n${request.constraints}` : ""}
${request.additionalContext ? `Context:\n${request.additionalContext}` : ""}`;
  } else {
    promptText = `Help with problem "${request.problemTitle}":
Statement:
${request.problemStatement}
${request.constraints ? `Constraints:\n${request.constraints}` : ""}
${request.additionalContext ? `Context:\n${request.additionalContext}` : ""}`;
  }

  const payload = {
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  };

  let lastError = "";

  for (const candidate of candidateModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${apiKey.trim()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 404) {
        // Model not available on this API key tier, try next candidate
        const errJson = await res.text().catch(() => "");
        lastError = `Model ${candidate} 404: ${errJson.slice(0, 100)}`;
        continue;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown Gemini error");
        return {
          ok: false,
          content: "",
          source: "ai",
          error: `Gemini API error (${res.status}): ${errText.slice(0, 250)}`,
        };
      }

      const data = await res.json();
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        return { ok: false, content: "", source: "ai", error: "Empty response from Gemini." };
      }

      return {
        ok: true,
        content,
        source: "ai",
        model: candidate,
      };
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        return { ok: false, content: "", source: "ai", error: "Gemini API request timed out after 45 seconds." };
      }
      lastError = err instanceof Error ? err.message : "Network error";
    }
  }

  return {
    ok: false,
    content: "",
    source: "ai",
    error: `Could not find an available Gemini model for this API key. ${lastError}`,
  };
}

/**
 * Send a request to AI (either direct via API Key or via local backend server).
 */
export async function queryAI(
  settings: Settings,
  request: AIRequest
): Promise<AIResponse> {
  if (!settings.aiEnabled) {
    return { ok: false, content: "", source: "ai", error: "AI is disabled in settings." };
  }

  if (!settings.aiConsented) {
    return { ok: false, content: "", source: "ai", error: "AI consent has not been given. Enable it in Settings." };
  }

  // Option 1: Direct Gemini API key (no backend server required)
  if (settings.apiKey && settings.apiKey.trim().length > 10) {
    const chosenModel = (settings.model && !settings.model.includes("2.5") && settings.model !== "gemini-1.5-flash") ? settings.model : "gemini-2.0-flash";
    return queryGeminiDirect(settings.apiKey, chosenModel, request);
  }

  // Option 2: Fall back to configured backend server
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 65000);

    const res = await fetch(`${settings.backendUrl}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: request.type,
        problemTitle: request.problemTitle,
        problemStatement: request.problemStatement.slice(0, 12000),
        constraints: request.constraints?.slice(0, 2000),
        userCode: request.userCode?.slice(0, 12000),
        hintLevel: request.hintLevel,
        additionalContext: request.additionalContext?.slice(0, 2000),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      return {
        ok: false,
        content: "",
        source: "ai",
        error: `Backend returned ${res.status}: ${errorText.slice(0, 200)}`,
      };
    }

    const data = await res.json();
    return {
      ok: true,
      content: typeof data.content === "string" ? data.content : JSON.stringify(data),
      source: "ai",
      model: data.model,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, content: "", source: "ai", error: "Request timed out after 65 seconds." };
    }
    return {
      ok: false,
      content: "",
      source: "ai",
      error: `Could not reach the backend: ${err instanceof Error ? err.message : "Unknown error"}. Tip: You can also enter a free Gemini API Key in Settings to run serverless!`,
    };
  }
}

/**
 * Build the prompt context for different AI request types.
 */
export function buildAIRequest(
  type: AIRequest["type"],
  context: ProblemContext,
  userCode?: string,
  hintLevel?: HintLevel,
  additionalContext?: string
): AIRequest {
  return {
    type,
    problemTitle: context.title,
    problemStatement: context.statement,
    constraints: context.constraints,
    userCode,
    hintLevel,
    additionalContext,
  };
}
