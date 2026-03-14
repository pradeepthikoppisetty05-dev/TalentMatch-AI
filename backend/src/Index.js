import "dotenv/config";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.js";
import { testConnection } from "./db/tempconnection.js";
import analyzeRouter from "./routes/analyze.js";

// Validate required env vars on startup
const required = ["GEMINI_API_KEY", "JWT_SECRET"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌  Missing required env vars: ${missing.join(", ")}`);
  console.error("    Copy backend/.env.example → backend/.env and fill in values.");
  process.exit(1);
}

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:5173";

// Middleware
app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "2mb" }));

// Routes
app.use("/api/auth", authRouter); 
app.use("/api", analyzeRouter);

// Health check
app.get("/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

// 404 fallback
app.use((_req, res) => res.status(404).json({ error: "Route not found." }));

// Start
async function start() {
  await testConnection(); 
 
  app.listen(PORT, () => {
    console.log(`✅  TalentMatch API  →  http://localhost:${PORT}`);
    console.log(`   Auth             →  /api/auth/register | /api/auth/login`);
    console.log(`   Analyze          →  /api/analyze  (JWT protected)`);
    console.log(`   Health           →  /health`);
    console.log(`   Allowed origin   →  ${ALLOWED_ORIGIN}`);
  });
}
 
start();