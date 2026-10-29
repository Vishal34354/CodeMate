import type { QueryRequest, QueryResponse } from "../schemas/query-schema.js";
import { handleLocalMockQuery } from "../providers/local-mock.js";
import { queryGemini } from "../providers/gemini.js";
import { queryOpenAI } from "../providers/openai.js";

export async function routeQuery(req: QueryRequest): Promise<QueryResponse> {
  const provider = (process.env.AI_PROVIDER || "mock").toLowerCase();

  if (provider === "gemini") {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      try {
        const model = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
        return await queryGemini(req, key, model);
      } catch (err) {
        console.warn("[CodeMate Backend] Gemini failed, falling back to local engine:", err);
      }
    } else {
      console.warn("[CodeMate Backend] GEMINI_API_KEY missing, using local engine.");
    }
  }

  if (provider === "openai") {
    const key = process.env.OPENAI_API_KEY;
    if (key) {
      try {
        const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
        return await queryOpenAI(req, key, model);
      } catch (err) {
        console.warn("[CodeMate Backend] OpenAI failed, falling back to local engine:", err);
      }
    } else {
      console.warn("[CodeMate Backend] OPENAI_API_KEY missing, using local engine.");
    }
  }

  // Default / fallback: local heuristic engine
  return handleLocalMockQuery(req);
}
