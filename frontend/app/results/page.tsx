"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import { interview as interviewApi, InterviewResultsResponse, getUser } from "../../lib/api";
import { ChevronDown, ChevronUp, TrendingUp, CheckCircle2, AlertCircle, Play, Star, ThumbsUp, Minus, Loader2 } from "lucide-react";

const recommendationConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  strong_yes: { label: "Strong Hire", color: "var(--accent-green)", icon: ThumbsUp },
  yes: { label: "Hire", color: "var(--accent-green)", icon: ThumbsUp },
  maybe: { label: "Maybe", color: "var(--accent-amber)", icon: Minus },
  no: { label: "No Hire", color: "var(--accent-red)", icon: AlertCircle },
  strong_no: { label: "Strong No Hire", color: "var(--accent-red)", icon: AlertCircle },
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)", fontWeight: 700 }}>{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-surface)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${value * 10}%`, background: value >= 8 ? "var(--accent-green)" : value >= 6 ? "var(--accent-cyan)" : "var(--accent-red)" }} />
      </div>
    </div>
  );
}

function ResultsContent() {
  const params = useSearchParams();
  const interviewId = params.get("id");
  const [data, setData] = useState<InterviewResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedQ, setExpandedQ] = useState<number | null>(0);

  useEffect(() => {
    if (!interviewId) { setError("No interview ID found. Please complete an interview first."); setLoading(false); return; }
    interviewApi.getResults(interviewId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [interviewId]);

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3" style={{ color: "var(--text-muted)" }}>
      <Loader2 size={20} className="animate-spin" /> Loading results...
    </div>
  );

  if (error) return (
    <div className="max-w-xl mx-auto mt-16 p-6 rounded-xl text-center" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
      <p className="mb-4" style={{ color: "var(--accent-red)" }}>⚠️ {error}</p>
      <Link href="/interview" className="btn-primary inline-flex items-center gap-2" style={{ textDecoration: "none" }}>
        <Play size={14} /> Start Interview
      </Link>
    </div>
  );

  if (!data) return null;

  const isPending = data.overall_score === null;
  const rec = data.hire_recommendation ? recommendationConfig[data.hire_recommendation] : null;

  const avgRelevance = data.results.filter(r => r.relevance_score !== null).reduce((s, r) => s + (r.relevance_score || 0), 0) / (data.results.filter(r => r.relevance_score !== null).length || 1);
  const avgClarity = data.results.filter(r => r.clarity_score !== null).reduce((s, r) => s + (r.clarity_score || 0), 0) / (data.results.filter(r => r.clarity_score !== null).length || 1);
  const avgDepth = data.results.filter(r => r.depth_score !== null).reduce((s, r) => s + (r.depth_score || 0), 0) / (data.results.filter(r => r.depth_score !== null).length || 1);

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 animate-fade-up">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>Interview Results</p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>{data.role}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {data.total_questions} questions · {data.status}
            {data.completed_at && ` · ${new Date(data.completed_at).toLocaleDateString()}`}
          </p>
        </div>
        <Link href="/interview" className="btn-primary flex items-center gap-2 text-sm" style={{ textDecoration: "none", padding: "9px 16px" }}>
          <Play size={14} /> New Interview
        </Link>
      </div>

      {/* Score overview */}
      <div className="grid gap-4 mb-8 animate-fade-up delay-100" style={{ gridTemplateColumns: rec ? "1fr 1fr auto" : "1fr 1fr" }}>
        {/* Score */}
        <div className="card p-6" style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.06), var(--bg-card))", borderColor: "rgba(0,212,255,0.2)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} style={{ color: "var(--accent-cyan)" }} />
            <span className="text-xs font-bold tracking-wide" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}>OVERALL SCORE</span>
          </div>
          {isPending ? (
            <div className="py-4">
              <p className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-muted)" }}>Pending</p>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>AI evaluation in progress...</p>
            </div>
          ) : (
            <>
              <div className="text-6xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--accent-cyan)" }}>
                {data.overall_score?.toFixed(1)}<span className="text-2xl" style={{ color: "var(--text-muted)" }}>/10</span>
              </div>
              {!isPending && (
                <div className="mt-3 space-y-2">
                  {avgRelevance > 0 && <ScoreBar label="Relevance" value={avgRelevance} />}
                  {avgClarity > 0 && <ScoreBar label="Clarity" value={avgClarity} />}
                  {avgDepth > 0 && <ScoreBar label="Depth" value={avgDepth} />}
                </div>
              )}
            </>
          )}
        </div>

        {/* Feedback */}
        <div className="card p-6">
          <div className="text-xs font-bold tracking-wide mb-3" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}>AI FEEDBACK SUMMARY</div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {isPending ? "Your answers have been saved. AI scoring will be available once evaluation completes." : (data.overall_feedback || "Good performance overall.")}
          </p>
        </div>

        {/* Recommendation */}
        {rec && (
          <div className="card p-6 flex flex-col items-center justify-center min-w-[140px]" style={{ background: `${rec.color}0d`, borderColor: `${rec.color}40` }}>
            <rec.icon size={28} style={{ color: rec.color, marginBottom: 8 }} />
            <div className="text-base font-bold text-center" style={{ fontFamily: "'Syne', sans-serif", color: rec.color }}>{rec.label}</div>
            <div className="text-xs mt-1 text-center" style={{ color: "var(--text-muted)" }}>AI Recommendation</div>
          </div>
        )}
      </div>

      {/* Per-question breakdown */}
      <div className="animate-fade-up delay-200">
        <h2 className="text-base font-bold mb-4" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>Question Breakdown</h2>
        <div className="space-y-3">
          {data.results.map((q, i) => {
            const isOpen = expandedQ === i;
            const score = q.score ?? null;
            const scoreColor = score === null ? "var(--text-muted)" : score >= 8 ? "var(--accent-green)" : score >= 6 ? "var(--accent-cyan)" : "var(--accent-red)";

            return (
              <div key={q.id} className="card overflow-hidden transition-all" style={{ borderColor: isOpen ? "var(--border-bright)" : "var(--border)" }}>
                <button className="w-full flex items-start gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors" onClick={() => setExpandedQ(isOpen ? null : i)}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ background: `${scoreColor}18`, color: scoreColor, fontFamily: "'Syne', sans-serif" }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{q.question_text || `Question ${i + 1}`}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {q.feedback && <span className="text-xs" style={{ color: "var(--text-muted)" }}>{q.feedback.substring(0, 60)}...</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: scoreColor }}>
                      {score !== null ? score.toFixed(1) : "—"}
                    </div>
                    {isOpen ? <ChevronUp size={15} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={15} style={{ color: "var(--text-muted)" }} />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 animate-fade-in" style={{ borderTop: "1px solid var(--border)" }}>
                    {/* Sub-scores */}
                    {(q.relevance_score || q.clarity_score || q.depth_score) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 mb-5">
                        {[["Relevance", q.relevance_score], ["Clarity", q.clarity_score], ["Depth", q.depth_score]].map(([label, val]) =>
                          val !== null && (
                            <div key={label as string} className="rounded-lg p-3 text-center" style={{ background: "var(--bg-surface)" }}>
                              <div className="text-lg font-bold" style={{ fontFamily: "'Syne', sans-serif", color: (val as number) >= 8 ? "var(--accent-green)" : (val as number) >= 6 ? "var(--accent-cyan)" : "var(--accent-red)" }}>{(val as number).toFixed(1)}</div>
                              <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {/* Your answer */}
                    {q.answer_text && (
                      <div className="mb-4">
                        <div className="text-xs font-bold mb-2 tracking-wide" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-muted)" }}>YOUR ANSWER</div>
                        <p className="text-sm leading-relaxed p-3 rounded-lg" style={{ background: "var(--bg-surface)", color: "var(--text-secondary)" }}>{q.answer_text}</p>
                      </div>
                    )}

                    {/* Ideal answer */}
                    {q.ideal_answer && (
                      <div className="mb-4">
                        <div className="text-xs font-bold mb-2 tracking-wide" style={{ fontFamily: "'Syne', sans-serif", color: "var(--accent-cyan)" }}>IDEAL ANSWER</div>
                        <p className="text-sm leading-relaxed p-3 rounded-lg" style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)", color: "var(--text-secondary)" }}>{q.ideal_answer}</p>
                      </div>
                    )}

                    {/* Strengths & Improvements */}
                    {(q.strengths || q.improvements) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.strengths && (
                          <div>
                            <div className="text-xs font-bold mb-2 tracking-wide flex items-center gap-1" style={{ fontFamily: "'Syne', sans-serif", color: "var(--accent-green)" }}>
                              <CheckCircle2 size={11} /> STRENGTHS
                            </div>
                            <ul className="space-y-1">
                              {q.strengths.map((s) => <li key={s} className="text-xs flex items-start gap-1.5" style={{ color: "var(--text-secondary)" }}><span style={{ color: "var(--accent-green)", marginTop: 2 }}>·</span>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {q.improvements && (
                          <div>
                            <div className="text-xs font-bold mb-2 tracking-wide flex items-center gap-1" style={{ fontFamily: "'Syne', sans-serif", color: "var(--accent-amber)" }}>
                              <AlertCircle size={11} /> IMPROVE
                            </div>
                            <ul className="space-y-1">
                              {q.improvements.map((s) => <li key={s} className="text-xs flex items-start gap-1.5" style={{ color: "var(--text-secondary)" }}><span style={{ color: "var(--accent-amber)", marginTop: 2 }}>·</span>{s}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {isPending && <p className="text-xs mt-4 text-center" style={{ color: "var(--text-muted)" }}>⏳ Detailed scores available after AI evaluation</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  useEffect(() => {
    if (!getUser()) router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      <Sidebar />
      <main className="lg:ml-[220px] pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8">
        <Suspense fallback={<div className="flex items-center gap-2 py-24 justify-center" style={{ color: "var(--text-muted)" }}><Loader2 size={20} className="animate-spin" /> Loading...</div>}>
          <ResultsContent />
        </Suspense>
      </main>
    </div>
  );
}
