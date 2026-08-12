"use client";

import { Button } from "@base-ui/react";
import { CheckCircle2, AlertCircle, Home } from "lucide-react";

export interface EvaluationJSON {
  overall_score: number;
  competency_scores: { name: string; score: number }[];
  strengths: string[];
  areas_for_improvement: string[];
}

export interface ScorecardProps {
  evaluation: EvaluationJSON;
  onReset?: () => void;
}

export function Scorecard({ evaluation, onReset }: ScorecardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-zinc-950 border border-zinc-800 p-8 rounded-none shadow-2xl text-zinc-100 my-8">
      <div className="mb-8 text-center border-b border-zinc-800 pb-8">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">Interview Scorecard</h2>
        <div className="mt-8 relative inline-flex items-center justify-center">
          <svg className="w-40 h-40 transform -rotate-90">
            <circle className="text-zinc-800" strokeWidth="12" stroke="currentColor" fill="transparent" r="70" cx="80" cy="80" />
            <circle
              className={getProgressColor(evaluation.overall_score)}
              strokeWidth="12"
              strokeDasharray={440}
              strokeDashoffset={440 - (440 * evaluation.overall_score) / 100}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="70"
              cx="80"
              cy="80"
              style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
            />
          </svg>
          <div className="absolute text-5xl font-bold">
            <span className={getScoreColor(evaluation.overall_score)}>{evaluation.overall_score}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-zinc-300">Competency Breakdown</h3>
          {evaluation.competency_scores.map((comp, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-zinc-400">{comp.name}</span>
                <span className={getScoreColor(comp.score)}>{comp.score}/100</span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-2.5 overflow-hidden">
                <div className={`h-2.5 rounded-full ${getProgressColor(comp.score)}`} style={{ width: `${comp.score}%` }}></div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold text-zinc-300 flex items-center gap-2 mb-4">
              <CheckCircle2 className="text-emerald-500" /> Key Strengths
            </h3>
            <ul className="space-y-2">
              {evaluation.strengths.map((str, i) => (
                <li key={i} className="text-zinc-400 text-sm flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">•</span> {str}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-zinc-300 flex items-center gap-2 mb-4">
              <AlertCircle className="text-yellow-500" /> Areas for Improvement
            </h3>
            <ul className="space-y-2">
              {evaluation.areas_for_improvement.map((str, i) => (
                <li key={i} className="text-zinc-400 text-sm flex items-start gap-2">
                  <span className="text-yellow-500 mt-1">•</span> {str}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {onReset && (
        <div className="mt-12 flex justify-center border-t border-zinc-800/50 pt-8 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/10 to-transparent pointer-events-none"></div>
          <Button
            onClick={onReset}
            className="group relative w-64 h-14 overflow-hidden rounded-sm bg-zinc-100 font-bold text-zinc-900 transition-all hover:bg-white active:scale-[0.99] shadow-[0_10px_40px_-10px_rgba(255,255,255,0.2)] border-0"
          >
            <span className="flex items-center justify-center gap-2 uppercase tracking-widest text-sm relative z-10">
              <Home className="w-5 h-5 text-zinc-900" />
              Return to Home
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
