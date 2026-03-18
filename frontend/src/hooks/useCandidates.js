import { useState } from "react";
import { analyzeCandidate } from "../services/geminiService.js";
import { extractCandidateName } from "../utils/resumeParser.js";

function makeId() {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * @returns {{
 *   candidates: Candidate[],
 *   selectedCandidateId: string|null,
 *   selectedCandidate: Candidate|null,
 *   elapsedTime: number,
 *   error: string|null,
 *   setError: Function,
 *   setSelectedCandidateId: Function,
 *   addNewCandidate: Function,
 *   removeCandidate: Function,
 *   updateCandidateResume: Function,
 *   handleAnalyze: Function,
 *   updateQuestion: Function,
 *   removeQuestion: Function,
 *   addQuestion: Function,
 *   clearResume: Function,
 *   loadSamples: Function,
 * }}
 */
export function useCandidates(jd) {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState(null);

  const selectedCandidate = candidates.find((c) => c.id === selectedCandidateId) ?? null;

  const startTimer = () => {
    setElapsedTime(0);
    const id = setInterval(() => setElapsedTime((t) => t + 1), 1000);
    return () => clearInterval(id);
  };

  // Candidate CRUD
  const addNewCandidate = () => {
    const id = makeId();
    setCandidates((prev) => [
      ...prev,
      { id, name: "New Candidate", resume: "", resumeFile: null, fileName: null, result: null, isAnalyzing: false, interviewQuestions: [] },
    ]);
    setSelectedCandidateId(id);
  };

  const removeCandidate = (id) => {
    setCandidates((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (selectedCandidateId === id) {
        setSelectedCandidateId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  };

  const updateCandidateResume = (id, resume, file, fileName) => {
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              resume,
              resumeFile: file ?? c.resumeFile,
              fileName: fileName ?? c.fileName,
              name: c.name === "New Candidate"
                ? extractCandidateName(resume, fileName?.split(".")[0] ?? "Candidate")
                : c.name,
            }
          : c
      )
    );
  };

  // Analysis 
  const handleAnalyze = async (candidateId) => {
    const id = candidateId ?? selectedCandidateId;
    const candidate = candidates.find((c) => c.id === id);

    if (!jd?.trim() || !candidate?.resume?.trim()) {
      setError("Please provide both a job description and a candidate profile.");
      return;
    }

    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, isAnalyzing: true } : c)));
    setError(null);

    const stopTimer = startTimer();

    try {
      const analysis = await analyzeCandidate(jd, candidate.resume);

      const aiQuestions = analysis.suggestedQuestions.map((q) => ({
        id: makeId(),
        question: `[${q.category}] ${q.question}`,
        answer: "",
        rating: 0,
      }));

      const candidateName = extractCandidateName(
        candidate.resume,
        candidate.fileName?.split(".")[0] ?? candidate.name
      );

      setCandidates((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                result: analysis,
                isAnalyzing: false,
                interviewQuestions: aiQuestions,
                name: candidateName,
              }
            : c
        )
      );
    } catch (err) {
      setError(err.message || "Analysis failed. Please check your inputs and try again.");
      setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, isAnalyzing: false } : c)));
    } finally {
      stopTimer();
    }
  };

  // Interview questions
  const addQuestion = (text) => {
    if (!text?.trim() || !selectedCandidateId) return;
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === selectedCandidateId
          ? { ...c, interviewQuestions: [...c.interviewQuestions, { id: makeId(), question: text.trim(), answer: "", rating: 0 }] }
          : c
      )
    );
  };

  const updateQuestion = (questionId, updates) => {
    if (!selectedCandidateId) return;
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === selectedCandidateId
          ? { ...c, interviewQuestions: c.interviewQuestions.map((q) => (q.id === questionId ? { ...q, ...updates } : q)) }
          : c
      )
    );
  };

  const removeQuestion = (questionId) => {
    if (!selectedCandidateId) return;
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === selectedCandidateId
          ? { ...c, interviewQuestions: c.interviewQuestions.filter((q) => q.id !== questionId) }
          : c
      )
    );
  };

  const clearResume = () => {
    if (!selectedCandidateId) return;
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === selectedCandidateId ? { ...c, resume: "", resumeFile: null, fileName: null } : c
      )
    );
  };

  // Sample data
  const loadSamples = (setJd, sampleJd, sampleResume) => {
    setJd(sampleJd);
    const id = "sample-1";
    setCandidates([
      {
        id,
        name: "Alex Rivera",
        resume: sampleResume,
        resumeFile: null,
        fileName: "Alex_Rivera_Resume.pdf",
        result: null,
        isAnalyzing: false,
        interviewQuestions: [
          { id: "s1", question: "Tell me about a complex React architectural decision you led.", answer: "I led the migration to a micro-frontend architecture...", rating: 5 },
          { id: "s2", question: "How do you handle performance bottlenecks in large applications?", answer: "I use profiling tools to identify slow renders...", rating: 4 },
        ],
      },
    ]);
    setSelectedCandidateId(id);
  };

  return {
    candidates,
    selectedCandidateId,
    selectedCandidate,
    elapsedTime,
    error,
    setError,
    setSelectedCandidateId,
    addNewCandidate,
    removeCandidate,
    updateCandidateResume,
    handleAnalyze,
    addQuestion,
    updateQuestion,
    removeQuestion,
    clearResume,
    loadSamples,
  };
}