import type { QueryRequest, QueryResponse } from "../schemas/query-schema.js";

const SYSTEM_PROMPT = `You are CodeMate, an expert competitive programming companion.
RULES:
1. NEVER output a full code solution.
2. Guide the user Socratically through hints, invariants, constraints, and edge cases.
3. Be concise and emphasize algorithmic principles and asymptotic complexity.`;

export async function queryOpenAI(req: QueryRequest, apiKey: string, model = "gpt-4o-mini"): Promise<QueryResponse> {
  const userContent = `[Request Type: ${req.type}]
Problem: ${req.problemTitle}
Statement:
${req.problemStatement}
${req.constraints ? `Constraints:\n${req.constraints}` : ""}
${req.userCode ? `User Code:\n\`\`\`\n${req.userCode}\n\`\`\`` : ""}
${req.hintLevel ? `Hint Level Requested: Level ${req.hintLevel} of 4` : ""}
${req.additionalContext ? `Context: ${req.additionalContext}` : ""}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${errorText.slice(0, 300)}`);
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("OpenAI returned empty completion response.");
  }

  return {
    ok: true,
    content: text,
    model: `openai/${model}`,
  };
}
