import { useState, useRef, Suspense, lazy} from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { CandidateReportPDF } from "./CandidateReportPDF.jsx";

import {
  FileText,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  Loader2,
  Sparkles,
  ArrowRight,
  ClipboardList,
  Upload,
  FileUp,
  X,
  Download,
  MessageSquare,
  Star,
  Plus,
  Trash2,
  Briefcase,
  Award,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { analyzeCandidate } from "./services/geminiService.js";
import * as pdfjs from "pdfjs-dist";
import mammoth from "mammoth";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const SAMPLE_JD = `Senior Frontend Engineer
Role Overview:
We are looking for a Senior Frontend Engineer with 5+ years of experience in React and TypeScript. You will be responsible for building highly interactive user interfaces and leading architectural decisions for our core product.

Requirements:
- Strong proficiency in React, TypeScript, and modern CSS (Tailwind preferred).
- Experience with state management libraries like Redux or Zustand.
- Knowledge of performance optimization and web accessibility.
- Excellent communication skills and experience mentoring junior developers.
- Experience with testing frameworks like Jest or Vitest.
`;

const SAMPLE_RESUME = `Alex Rivera
Senior Software Engineer | 6 Years Experience

Summary:
Passionate frontend developer focused on building scalable web applications. Expert in React ecosystem and performance tuning.

Experience:
TechFlow Solutions (2020 - Present)
- Led the migration of a legacy dashboard to React 18, improving load times by 40%.
- Mentored 4 junior developers and established code review standards.
- Built a custom UI component library using Tailwind CSS and Headless UI.

WebCraft Agency (2018 - 2020)
- Developed responsive websites for various clients using React and Redux.
- Implemented unit testing using Jest, achieving 85% coverage.

Skills:
React, TypeScript, JavaScript (ES6+), Tailwind CSS, Redux, Jest, Git, Webpack.
`;

export default function App() {
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [activeTab, setActiveTab] = useState("analysis");
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");

  const fileInputRef = useRef(null);

  // ── Analysis ────────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!jd || !resume) {
      setError("Please provide both a job description and a candidate profile.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const analysis = await analyzeCandidate(jd, resume);
      setResult(analysis);
      const aiQuestions = analysis.suggestedQuestions.map((q) => ({
        id: Math.random().toString(36).substr(2, 9),
        question: `[${q.category}] ${q.question}`,
        answer: "",
        rating: 0,
      }));
      setInterviewQuestions(aiQuestions);
      setActiveTab("analysis");
    } catch (err) {
      console.error(err);
      setError(err.message || "Analysis failed. Please check your inputs and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── File Upload ─────────────────────────────────────────────────────────────
  const extractTextFromPdf = async (arrayBuffer) => {
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item) => item.str).join(" ") + "\n";
    }
    return fullText;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setIsExtracting(true);
    setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      let text = "";
      if (file.type === "application/pdf") {
        text = await extractTextFromPdf(arrayBuffer);
      } else if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.name.endsWith(".docx")
      ) {
        const extracted = await mammoth.extractRawText({ arrayBuffer });
        text = extracted.value;
      } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        text = new TextDecoder().decode(arrayBuffer);
      } else {
        throw new Error("Unsupported file format. Please upload PDF, DOCX, or TXT.");
      }
      if (!text.trim()) throw new Error("Could not extract text from the file.");
      setResume(text);
    } catch (err) {
      setError(err.message || "Failed to extract text from file.");
      setFileName(null);
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Interview Scorecard ─────────────────────────────────────────────────────
  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    setInterviewQuestions([
      ...interviewQuestions,
      { id: Math.random().toString(36).substr(2, 9), question: newQuestion, answer: "", rating: 0 },
    ]);
    setNewQuestion("");
  };

  const updateQuestion = (id, updates) =>
    setInterviewQuestions(interviewQuestions.map((q) => (q.id === id ? { ...q, ...updates } : q)));

  const removeQuestion = (id) =>
    setInterviewQuestions(interviewQuestions.filter((q) => q.id !== id));

  const clearResume = () => { setResume(""); setFileName(null); };

  const loadSamples = () => {
    setJd(SAMPLE_JD);
    setResume(SAMPLE_RESUME);
    setFileName("Alex_Rivera_Resume.pdf");
    setInterviewQuestions([
      { id: "1", question: "Tell me about a complex React architectural decision you led.", answer: "I led the migration to a micro-frontend architecture which improved team autonomy...", rating: 5 },
      { id: "2", question: "How do you handle performance bottlenecks in large applications?", answer: "I use profiling tools to identify slow renders and implement memoization where necessary...", rating: 4 },
    ]);
  };


  const averageInterviewRating =
    interviewQuestions.length > 0
      ? (interviewQuestions.reduce((acc, q) => acc + q.rating, 0) / interviewQuestions.length).toFixed(1)
      : "0.0";

  const resultWithInterviewData = {
    ...result,

    // Generated questions from AI
    suggestedQuestions: (result?.suggestedQuestions || []).map(q => ({
      ...q,
      answer: q.answer || "",
      rating: q.rating || null
    })),

    // Custom questions from interviewer
    customQuestions: interviewQuestions || [],
    averageRating: averageInterviewRating
  };
  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-900 font-sans selection:bg-indigo-100">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="w-full px-6 h-16  flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">TalentMatch AI</h1>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Premium Talent Analytics</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={loadSamples}
              className="hidden sm:flex text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-all items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              <ClipboardList className="w-4 h-4" />
              Demo Data
            </button>
            {result && (
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all shadow-md active:scale-95">
                <Download className="w-4 h-4" />
                <PDFDownloadLink document={<CandidateReportPDF result={resultWithInterviewData} />} fileName="candidate_report.pdf">
                  {({ loading }) => (loading ? "Generating PDF..." : "Download Report")}
                </PDFDownloadLink>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="w-full px-6 py-6">
        <div className="grid lg:grid-cols-12 gap-8">

          {/* ── Left: Inputs ── */}
          <div className="lg:col-span-5 space-y-6">

            {/* Job Description */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 rounded-md text-indigo-600">
                  <Briefcase className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Job Specification</h2>
              </div>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the detailed job description here..."
                className="w-full h-48 p-5 focus:outline-none resize-none text-slate-700 leading-relaxed text-sm placeholder:text-slate-300"
              />
            </div>

            {/* Candidate Profile */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-violet-100 rounded-md text-violet-600">
                    <User className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Candidate Profile</h2>
                </div>
                <div className="flex items-center gap-2">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.docx,.txt" className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExtracting}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-lg transition-all hover:bg-indigo-100"
                  >
                    {isExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    Upload File
                  </button>
                </div>
              </div>
              <div className="relative">
                {fileName && (
                  <div className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full border border-slate-200 text-[10px] font-bold text-slate-600 shadow-sm">
                    <FileUp className="w-3 h-3 text-indigo-500" />
                    <span className="max-w-[120px] truncate">{fileName}</span>
                    <button onClick={clearResume} className="hover:text-red-500 transition-colors p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <textarea
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  placeholder="Paste resume text or upload a document..."
                  className="w-full h-64 p-5 focus:outline-none resize-none text-slate-700 leading-relaxed text-sm placeholder:text-slate-300"
                />
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || isExtracting}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 text-sm uppercase tracking-widest",
                isAnalyzing || isExtracting
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98]"
              )}
            >
              {isAnalyzing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Generating Intelligence...</>
              ) : (
                <><BarChart3 className="w-5 h-5" /> Run Match Analysis</>
              )}
            </button>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-xs font-medium">{error}</p>
              </motion.div>
            )}
          </div>

          {/* ── Right: Results ── */}
          <div className="lg:col-span-7 space-y-6">

            {/* Tab switcher */}
            {result && (
              <div className="flex p-1 bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
                <button
                  onClick={() => setActiveTab("analysis")}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2",
                    activeTab === "analysis" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  <BarChart3 className="w-4 h-4" /> AI Analysis
                </button>
                <button
                  onClick={() => setActiveTab("interview")}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2",
                    activeTab === "interview" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  <MessageSquare className="w-4 h-4" /> Recruiter Interview
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">

              {/* Empty state */}
              {!result && !isAnalyzing && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-[600px] flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-300 rounded-3xl bg-white/50"
                >
                  <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl mb-6 border border-slate-100">
                    <FileText className="w-10 h-10 text-slate-200" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Ready for Analysis</h3>
                  <p className="text-slate-500 mt-3 max-w-sm text-sm leading-relaxed">
                    Provide the job requirements and candidate profile to generate a comprehensive match report.
                  </p>
                </motion.div>
              )}

              {/* Loading state */}
              {isAnalyzing && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-[600px] flex flex-col items-center justify-center p-12 space-y-8 bg-white rounded-3xl border border-slate-200"
                >
                  <div className="relative">
                    <div className="w-32 h-32 border-8 border-indigo-50 rounded-full" />
                    <div className="absolute inset-0 w-32 h-32 border-8 border-indigo-600 rounded-full border-t-transparent animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-indigo-600 animate-pulse" />
                  </div>
                  <div className="text-center space-y-3">
                    <h3 className="text-xl font-bold text-slate-900">Intelligence Engine Running</h3>
                    <p className="text-slate-500 text-sm animate-pulse max-w-xs mx-auto">
                      Synthesizing skills, experience relevance, and cultural alignment...
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Analysis tab */}
              {result && activeTab === "analysis" && (
                <motion.div
                  key="analysis-tab"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Score Card */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600" />
                    <div>
                      <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">AI Match Confidence</h3>
                      <div className="flex items-baseline gap-3 mt-2">
                        <span className="text-6xl font-black text-slate-900 tracking-tighter">{result.matchScore}%</span>
                        <div className={cn(
                          "text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest",
                          result.matchScore >= 80 ? "bg-emerald-100 text-emerald-700" :
                          result.matchScore >= 60 ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {result.matchScore >= 80 ? "Exceptional" : result.matchScore >= 60 ? "Qualified" : "Requires Review"}
                        </div>
                      </div>
                    </div>
                    <div className="w-28 h-28 relative hidden sm:block">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                        <circle
                          cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="10" fill="transparent"
                          strokeDasharray={301.6}
                          strokeDashoffset={301.6 - (301.6 * result.matchScore) / 100}
                          className="text-indigo-600 transition-all duration-1000 ease-out"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BarChart3 className="w-8 h-8 text-indigo-200" />
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><FileText className="w-5 h-5" /></div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Strategic Overview</h3>
                    </div>
                    <div className="prose prose-slate prose-sm max-w-none text-slate-700 leading-relaxed">
                      <Markdown>{result.summary}</Markdown>
                    </div>
                  </div>

                  {/* Strengths & Gaps */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="bg-emerald-50/50 p-8 rounded-3xl border border-emerald-100 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600"><CheckCircle2 className="w-5 h-5" /></div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700">Top Strengths</h3>
                      </div>
                      <ul className="space-y-4">
                        {result.strengths.map((s, i) => (
                          <li key={i} className="text-sm text-slate-700 flex gap-3 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-rose-50/50 p-8 rounded-3xl border border-rose-100 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-rose-100 rounded-xl text-rose-600"><XCircle className="w-5 h-5" /></div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-rose-700">Critical Gaps</h3>
                      </div>
                      <ul className="space-y-4">
                        {result.gaps.map((g, i) => (
                          <li key={i} className="text-sm text-slate-700 flex gap-3 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Skills Matrix */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Award className="w-5 h-5" /></div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Technical Skills Matrix</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50">
                            <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Skill / Competency</th>
                            <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Assessment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {result.technicalSkillsMatch.map((skill, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-8 py-5 text-sm font-bold text-slate-700">{skill.skill}</td>
                              <td className="px-8 py-5">
                                <span className={cn(
                                  "text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest inline-block",
                                  skill.level === "High" ? "bg-emerald-100 text-emerald-700" :
                                  skill.level === "Medium" ? "bg-blue-100 text-blue-700" :
                                  skill.level === "Low" ? "bg-amber-100 text-amber-700" :
                                  "bg-slate-100 text-slate-500"
                                )}>
                                  {skill.level}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-10 rounded-3xl shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-white/10 rounded-xl"><Sparkles className="w-6 h-6 text-indigo-300" /></div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-300">Strategic Recommendations</h3>
                    </div>
                    <ul className="space-y-6">
                      {result.recommendations.map((rec, i) => (
                        <li key={i} className="flex gap-4 items-start group">
                          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-white/10 transition-all border border-white/10">
                            <ArrowRight className="w-4 h-4 text-indigo-400" />
                          </div>
                          <p className="text-sm text-indigo-50/90 leading-relaxed font-medium">{rec}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}

              {/* Interview tab */}
              {result && activeTab === "interview" && (
                <motion.div
                  key="interview-tab"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><MessageSquare className="w-6 h-6" /></div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">Interview Scorecard</h3>
                          <p className="text-xs text-slate-500 font-medium">Rate the candidate based on specific responses</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Avg. Rating</span>
                        <span className="text-3xl font-black text-indigo-600">{averageInterviewRating}</span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {interviewQuestions.map((q) => (
                        <div key={q.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 group relative">
                          <button
                            onClick={() => removeQuestion(q.id)}
                            className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="space-y-4">
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">Question</label>
                              <p className="text-sm font-bold text-slate-800">{q.question}</p>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">Candidate Answer</label>
                              <textarea
                                value={q.answer}
                                onChange={(e) => updateQuestion(q.id, { answer: e.target.value })}
                                placeholder="Record candidate's response..."
                                className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[100px] resize-none"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Response Rating</label>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    onClick={() => updateQuestion(q.id, { rating: star })}
                                    className={cn("p-1 transition-all", q.rating >= star ? "text-amber-400 scale-110" : "text-slate-200 hover:text-amber-200")}
                                  >
                                    <Star className={cn("w-6 h-6", q.rating >= star ? "fill-current" : "")} />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="pt-4 border-t border-slate-100">
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && addQuestion()}
                            placeholder="Add a custom interview question..."
                            className="flex-1 p-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                          <button
                            onClick={addQuestion}
                            className="p-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 opacity-50 grayscale hover:grayscale-0 transition-all cursor-default">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-widest">TalentMatch AI Intelligence Engine</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            © 2026 TalentMatch AI • Enterprise Grade Candidate Intelligence
          </p>
        </div>
      </footer>
    </div>
  );
}
