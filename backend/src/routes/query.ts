import { Router } from "express";
import { QueryRequestSchema } from "../schemas/query-schema.js";
import { routeQuery } from "../services/ai-router.js";

const router = Router();

router.post("/query", async (req, res) => {
  const parseResult = QueryRequestSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({
      ok: false,
      error: "Invalid request payload",
      details: parseResult.error.format(),
    });
  }

  try {
    const result = await routeQuery(parseResult.data);
    return res.json(result);
  } catch (err) {
    console.error("[CodeMate Backend] Error handling query:", err);
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

export default router;
