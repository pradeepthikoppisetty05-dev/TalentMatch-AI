import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    matchScore:      { type: Type.NUMBER },
    summary:         { type: Type.STRING },
    strengths:       { type: Type.ARRAY, items: { type: Type.STRING } },
    gaps:            { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },

    proceedVerdict: {
      type: Type.STRING,
      enum: ["Proceed", "Maybe", "Reject"],
    },
    proceedReason: { type: Type.STRING },

    categoryScores: {
      type: Type.OBJECT,
      properties: {
        hardSkills:  { type: Type.NUMBER },
        softSkills:  { type: Type.NUMBER },
        experience:  { type: Type.NUMBER },
        education:   { type: Type.NUMBER },
      },
      required: ["hardSkills", "softSkills", "experience", "education"],
    },

    technicalSkillsMatch: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          skill: { type: Type.STRING },
          level: { type: Type.STRING, enum: ["High", "Medium", "Low", "Missing"] },
        },
        required: ["skill", "level"],
      },
    },

    suggestedQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          category: { type: Type.STRING, enum: ["Fitment", "Interest", "Technical", "Behavioral"] },
        },
        required: ["question", "category"],
      },
    },
  },
  required: [
    "matchScore",
    "summary",
    "strengths",
    "gaps",
    "recommendations",
    "proceedVerdict",
    "proceedReason",
    "categoryScores",
    "technicalSkillsMatch",
    "suggestedQuestions",
  ],
};

export async function analyzeCandidate(jd, resume) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: [
      {
        text: `You are an expert technical recruiter and talent analyst. Analyze the following candidate resume against the job description with high precision.

Provide a comprehensive evaluation covering:
1. Hard skills (technical stack, tools, methodologies) — score 0-100.
2. Soft skills (leadership, communication, problem-solving) — score 0-100.
3. Experience relevance (years, industry background) — score 0-100.
4. Education and certifications — score 0-100.

Return:
- An overall matchScore (0-100) weighted across all categories.
- categoryScores with individual scores for hardSkills, softSkills, experience, education.
- A hiring verdict: "Proceed" (strong fit), "Maybe" (borderline), or "Reject" (clear mismatch).
- A one-sentence proceedReason justifying the verdict.
- A concise executive summary.
- Top strengths and critical gaps.
- Strategic recommendations for the hiring manager.
- 5-7 targeted interview questions (Fitment, Interest, Technical, Behavioral categories).

JOB DESCRIPTION:
${jd}

CANDIDATE RESUME:
${resume}
`,
      },
    ],
    config: {
      temperature: 0,
      seed: 42,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  return JSON.parse(response.text);
}