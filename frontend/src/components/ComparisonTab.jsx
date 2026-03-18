import { Users, CheckCircle2, AlertCircle, XCircle, Download, Loader2 } from "lucide-react";
import { useState } from "react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function MiniBar({ value, color }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-600">{value}%</span>
    </div>
  );
}

function DownloadButton({ onClick }) {
  const [busy, setBusy] = useState(false);
  const handleClick = async () => {
    setBusy(true);
    try { await onClick(); } finally { setBusy(false); }
  };
  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm",
        busy
          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
          : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95"
      )}
    >
      {busy
        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
        : <><Download className="w-3.5 h-3.5" /> Download Comparison</>
      }
    </button>
  );
}

export default function ComparisonTab({ candidates, onDownloadComparison }) {
  const analyzed = candidates.filter((c) => c.result);

  if (analyzed.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
        <Users className="w-10 h-10 text-slate-200 mb-4" />
        <p className="text-sm font-bold text-slate-500">No analyzed candidates yet.</p>
        <p className="text-xs text-slate-400 mt-1">Analyze at least two candidates to compare them here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Side-by-Side Comparison ({analyzed.length} candidates)
          </h3>
        </div>
        {typeof onDownloadComparison === "function" && (
          <DownloadButton onClick={onDownloadComparison} />
        )}
      </div>

      <div className="min-w-[700px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 w-36">
                Metric
              </th>
              {analyzed.map((c) => (
                <th key={c.id} className="px-4 py-4 text-[10px] font-bold text-slate-700 uppercase tracking-widest border-b border-slate-100 text-center">
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">

            {/* Overall Match */}
            <tr>
              <td className="px-4 py-5 text-sm font-bold text-slate-700 bg-slate-50/30">Overall Match</td>
              {analyzed.map((c) => (
                <td key={c.id} className="px-4 py-5 text-center">
                  <span className={cn(
                    "text-2xl font-black",
                    c.result.matchScore >= 80 ? "text-emerald-600" :
                    c.result.matchScore >= 60 ? "text-amber-600" : "text-red-600"
                  )}>
                    {c.result.matchScore}%
                  </span>
                </td>
              ))}
            </tr>

            {/* Category scores */}
            {[
              { key: "hardSkills",  label: "Hard Skills",  color: "bg-indigo-600"  },
              { key: "softSkills",  label: "Soft Skills",  color: "bg-violet-600"  },
              { key: "experience",  label: "Experience",   color: "bg-emerald-600" },
              { key: "education",   label: "Education",    color: "bg-amber-600"   },
            ].map(({ key, label, color }) => (
              <tr key={key}>
                <td className="px-4 py-5 text-sm font-bold text-slate-700 bg-slate-50/30">{label}</td>
                {analyzed.map((c) => (
                  <td key={c.id} className="px-4 py-5 text-center">
                    <MiniBar value={c.result.categoryScores?.[key] ?? 0} color={color} />
                  </td>
                ))}
              </tr>
            ))}

            {/* Verdict */}
            <tr>
              <td className="px-4 py-5 text-sm font-bold text-slate-700 bg-slate-50/30 align-top">Verdict</td>
              {analyzed.map((c) => (
                <td key={c.id} className="px-4 py-5 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    {c.result.proceedVerdict === "Proceed" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : c.result.proceedVerdict === "Maybe" ? (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={cn(
                      "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest",
                      c.result.proceedVerdict === "Proceed" ? "bg-emerald-100 text-emerald-700" :
                      c.result.proceedVerdict === "Maybe"   ? "bg-amber-100 text-amber-700"   :
                                                              "bg-red-100 text-red-700"
                    )}>
                      {c.result.proceedVerdict ?? "—"}
                    </span>
                  </div>
                  {c.result.proceedReason && (
                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-3 leading-relaxed italic max-w-[180px] mx-auto">
                      "{c.result.proceedReason}"
                    </p>
                  )}
                </td>
              ))}
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  );
}
