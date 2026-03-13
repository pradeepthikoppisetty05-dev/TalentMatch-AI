// ─── Shared Types ────────────────────────────────────────────────────────────
// These are used by the backend (response shape) and the frontend (type imports).
// If you add a monorepo later, extract these to a shared package.

export interface AnalysisResult {
  matchScore: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  technicalSkillsMatch: {
    skill: string;
    level: "High" | "Medium" | "Low" | "Missing";
  }[];
  suggestedQuestions: {
    question: string;
    category: "Fitment" | "Interest" | "Technical" | "Behavioral";
  }[];
}

export interface AnalyzeRequest {
  jd: string;
  resume: string;
}

export interface ErrorResponse {
  error: string;
}