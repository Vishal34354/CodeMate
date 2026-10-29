import { z } from "zod";

export const QueryRequestSchema = z.object({
  type: z.enum(["hint", "explain", "debug", "compare", "edge-cases", "complexity", "approaches"]),
  problemTitle: z.string().min(1).max(500),
  problemStatement: z.string().max(25000),
  constraints: z.string().max(5000).optional(),
  userCode: z.string().max(25000).optional(),
  hintLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  additionalContext: z.string().max(5000).optional(),
});

export type QueryRequest = z.infer<typeof QueryRequestSchema>;

export interface QueryResponse {
  ok: boolean;
  content: string;
  model: string;
  error?: string;
}
