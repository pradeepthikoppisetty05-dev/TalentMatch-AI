import { Router } from "express";
import multer from "multer";
import { generateFullReport, generateComparisonReport } from "../services/pdfService.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];
    cb(null, allowed.includes(file.mimetype)
      ? true
      : new Error("Unsupported file type. Please upload PDF, DOCX, or TXT.")
    );
  },
});


router.post("/report", authenticate, upload.single("resume"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Resume file is required." });
  }
  if (!req.body.result) {
    return res.status(400).json({ error: "Analysis result JSON is required." });
  }

  let analysisResult;
  let interviewQuestions = [];

  try {
    analysisResult = JSON.parse(req.body.result);
  } catch {
    return res.status(400).json({ error: "Invalid analysis result JSON." });
  }

  try {
    if (req.body.interviewQuestions) {
      interviewQuestions = JSON.parse(req.body.interviewQuestions);
    }
  } catch {
    interviewQuestions = [];
  }

  const candidateName = (req.body.candidateName || "").trim();
  const jobTitle      = (req.body.jobTitle      || "").trim();

  try {
    const pdfBuffer = await generateFullReport(
      analysisResult,
      interviewQuestions,
      req.file.buffer,
      req.file.mimetype,
      candidateName,
      jobTitle
    );

    const safeName = candidateName
      ? candidateName.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")
      : "Candidate";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}_Report.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("[POST /api/report]", err?.message ?? err);
    return res.status(500).json({ error: "Failed to generate report. Please try again." });
  }
});

router.post("/comparison", authenticate, async (req, res) => {
  let candidates = [];
  let jobTitle = "";
 
  try {
    candidates = req.body.candidates ?? [];
    jobTitle   = (req.body.jobTitle ?? "").trim();
  } catch {
    return res.status(400).json({ error: "Invalid request body." });
  }
 
  if (!Array.isArray(candidates) || candidates.length < 1) {
    return res.status(400).json({ error: "At least one analyzed candidate is required." });
  }
 
  try {
    const pdfBuffer = await generateComparisonReport(candidates, jobTitle);
 
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Candidate_Comparison.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("[POST /api/comparison]", err?.message ?? err);
    return res.status(500).json({ error: "Failed to generate comparison report." });
  }
});

export default router;