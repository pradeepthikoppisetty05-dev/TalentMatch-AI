import "dotenv/config";
import express from "express";
import cors from "cors";
import analyzeRouter from "./routes/analyze.js";

// Validate required env vars on startup
if (!process.env.GEMINI_API_KEY) {
  console.error("❌  GEMINI_API_KEY is not set. Add it to backend/.env");
  process.exit(1);
}

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:5173";

// Middleware
app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json({ limit: "2mb" }));

// Routes
app.use("/api", analyzeRouter);

// Health check
app.get("/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

// 404 fallback
app.use((_req, res) => res.status(404).json({ error: "Route not found." }));

// Start
app.listen(PORT, () => {
  console.log(`✅  TalentMatch API  →  http://localhost:${PORT}`);
  console.log(`   Health check     →  http://localhost:${PORT}/health`);
  console.log(`   Allowed origin   →  ${ALLOWED_ORIGIN}`);
});