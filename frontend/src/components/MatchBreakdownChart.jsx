import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { BarChart3 } from "lucide-react";

const CATEGORIES = [
  { key: "hardSkills",  name: "Hard Skills", color: "#4f46e5" },
  { key: "softSkills",  name: "Soft Skills", color: "#7c3aed" },
  { key: "experience",  name: "Experience",  color: "#10b981" },
  { key: "education",   name: "Education",   color: "#f59e0b" },
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
        {payload[0].payload.name}
      </p>
      <p className="text-xl font-black text-slate-900">{payload[0].value}%</p>
    </div>
  );
}

export default function MatchBreakdownChart({ categoryScores }) {
  if (!categoryScores) return null;

  const data = CATEGORIES.map(({ key, name, color }) => ({
    name,
    score: categoryScores[key] ?? 0,
    color,
  }));

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
          <BarChart3 className="w-5 h-5" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Match Breakdown</h3>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              dataKey="name"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fontWeight: 600, fill: "#64748b" }}
              width={100}
            />
            <Tooltip cursor={{ fill: "#f8fafc" }} content={<CustomTooltip />} />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={32} isAnimationActive={false}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Score pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-50">
        {CATEGORIES.map(({ key, name, color }) => (
          <div key={key} className="text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{name}</span>
            <div className="flex items-center justify-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-sm font-black text-slate-900">{categoryScores[key] ?? 0}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
