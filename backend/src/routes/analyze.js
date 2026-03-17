import { Router } from "express";
import { analyzeCandidate } from "../services/geminiService.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();


router.post("/analyze", authenticate, async (req, res) => {
  const { jd, resume } = req.body;

  if (!jd?.trim() || !resume?.trim()) {
    return res
      .status(400)
      .json({ error: "Both 'jd' and 'resume' fields are required." });
  }

  if (jd.length > 20_000 || resume.length > 20_000) {
    return res
      .status(413)
      .json({ error: "Input too large. Maximum 20,000 characters each." });
  }

  try {
    const result = await analyzeCandidate(jd, resume);
    return res.status(200).json(result);
  } catch (err) {
    console.error("[POST /api/analyze]", err?.message ?? err);
    return res
      .status(502)
      .json({ error: "AI analysis failed. Please try again." });
  }
});

export default router;