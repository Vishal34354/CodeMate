import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import queryRouter from "./routes/query.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";

// CORS: allow Chrome extension origins and localhost
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl) or chrome extensions
      if (!origin || origin.startsWith("chrome-extension://") || origin.includes("localhost") || origin.includes("127.0.0.1")) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for local companion tool
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "2mb" }));

// Health check endpoint for sidepanel settings ping
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "codemate-backend",
    version: "1.0.0",
    provider: process.env.AI_PROVIDER || "mock",
    timestamp: new Date().toISOString(),
  });
});

// Query endpoint
app.use("/api", queryRouter);

// Start server if not in test mode
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[CodeMate Backend] Server running on port ${PORT}`);
    console.log(`[CodeMate Backend] Health check: http://localhost:${PORT}/health`);
    console.log(`[CodeMate Backend] AI Provider: ${process.env.AI_PROVIDER || "mock"}`);
  });
}

export default app;
