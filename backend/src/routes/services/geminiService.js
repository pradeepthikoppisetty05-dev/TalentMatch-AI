import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    matchScore: { type: Type.NUMBER },
    summary: { type: Type.STRING },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
    technicalSkillsMatch: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          skill: { type: Type.STRING },
          level: {
            type: Type.STRING,
            enum: ["High", "Medium", "Low", "Missing"],
          },
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
          category: {
            type: Type.STRING,
            enum: ["Fitment", "Interest", "Technical", "Behavioral"],
          },
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

Provide a comprehensive comparison that evaluates:
1. Hard skills (technical stack, tools, methodologies).
2. Soft skills (leadership, communication, problem-solving).
3. Experience relevance (years of experience, industry background).
4. Education and certifications.

Return a detailed match score (0-100), a concise executive summary, top strengths, critical gaps, and specific strategic recommendations for the hiring manager.

Additionally, generate 5-7 targeted interview questions to:
- Identify the candidate's fitment for this specific role.
- Gauge their genuine interest in the position and company.
- Verify critical technical or domain-specific requirements from the JD.

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