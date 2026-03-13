// ─── Frontend API Client ──────────────────────────────────────────────────────
// The Gemini SDK and API key live entirely on the backend.
// This file is the only place the frontend talks to the server.

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Sends JD + resume to the backend and returns the AnalysisResult.
 * @param {string} jd
 * @param {string} resume
 * @returns {Promise<object>}
 */
export async function analyzeCandidate(jd, resume) {
  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jd, resume }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      payload.error ?? `Request failed with status ${response.status}`
    );
  }

  return response.json();
}