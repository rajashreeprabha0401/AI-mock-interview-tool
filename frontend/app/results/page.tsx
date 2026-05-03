"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import { interview as interviewApi, InterviewResultsResponse, getUser } from "../../lib/api";
import {
  ChevronDown, ChevronUp, TrendingUp, CheckCircle2, AlertCircle,
  Play, Star, ThumbsUp, Minus, Loader2, Clock, ArrowRight
} from "lucide-react";

const recConfig: Record<string, { label: string; color: string }> = {
  strong_yes: { label: "Strong Hire ✅", color: "#10b981" },
  yes: { label: "Hire ✅", color: "#10b981" },
  maybe: { label: "Maybe 🤔", color: "#f59e0b" },
  no: { label: "No Hire ❌", color: "#ef4444" },
  strong_no: { label: "Strong No Hire ❌", color: "#ef4444" },
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)", fontWeight: 700 }}>{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-surface)" }}>
        <div className="h-full rounded-full transition-all" style={{
          width: `${value * 10}%`,
          background: value >= 8 ? "#10b981" : value >= 6 ? "var(--accent-cyan)" : "#ef4444"
        }} />
      </div>
    </div>
  );
}

// ── Past Interviews List ────────────────────────────────────
function PastInterviewsList() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    interviewApi.getUserStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3" style={{ color: "var(--text-muted)" }}>
      <Loader2 size={20} className="animate-spin" /> Loading your interviews...
    </div>
  );

  const recent = stats?.recent_interviews ?? [];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
          Your Results
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {recent.length > 0 ? `${recent.length} interview${recent.length > 1 ? "s" : ""} found` : "No interviews yet"}
        </p>
      </div>

      {recent.length === 0 ? (
        <div className="card p-12 text-center">
          <Play size={40} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <p className="text-lg font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
            No interviews yet
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Complete your first interview to see results here
          </p>
          <Link href="/interview" className="btn-primary inline-flex items-center gap-2" style={{ textDecoration: "none" }}>
            <Play size={14} /> Start Interview
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {recent.map((iv: any) => (
            <Link key={iv.interview_id} href={`/results?id=${iv.interview_id}`} style={{ textDecoration: "none" }}>
              <div className="card p-5 hover:border-cyan-500/30 transition-all cursor-pointer flex items-center justify-between gap-4"
                style={{ border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: "var(--bg-surface)" }}>
                    {iv.role?.includes("Frontend") || iv.role?.includes("React") ? "⚛️" :
                      iv.role?.includes("Backend") || iv.role?.includes("Python") ? "🔧" :
                        iv.role?.includes("Data") ? "🧮" :
                          iv.role?.includes("Full") ? "🚀" : "💼"}
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
                      {iv.role}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {iv.total_questions} questions · {iv.created_at ? new Date(iv.created_at).toLocaleDateString("en-IN") : "—"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
                    style={{
                      background: iv.status === "completed" ? "rgba(16,185,129,0.1)" : "rgba(0,212,255,0.08)",
                      color: iv.status === "completed" ? "#10b981" : "var(--accent-cyan)",
                    }}>
                    {iv.status === "completed" ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                    {iv.status === "completed" ? "Completed" : "In Progress"}
                  </span>
                  {iv.overall_score != null && (
                    <div className="text-center">
                      <div className="text-lg font-bold" style={{
                        fontFamily: "'Syne', sans-serif",
                        color: iv.overall_score >= 8 ? "#10b981" : iv.overall_score >= 6 ? "var(--accent-cyan)" : "#ef4444"
                      }}>
                        {iv.overall_score?.toFixed(1)}
                      </div>
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>score</div>
                    </div>
                  )}
                  <ArrowRight size={16} style={{ color: "var(--text-muted)" }} />
                </div>
              </div>
            </Link>
          ))}
          <div className="text-center pt-4">
            <Link href="/interview" className="btn-primary inline-flex items-center gap-2" style={{ textDecoration: "none" }}>
              <Play size={14} /> New Interview
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Single Interview Result ─────────────────────────────────
function SingleResult({ interviewId }: { interviewId: string }) {
  const [data, setData] = useState<InterviewResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedQ, setExpandedQ] = useState<number | null>(0);

  useEffect(() => {
    interviewApi.getResults(interviewId)
      .then(setData)
      .catch((e) => setError(e.message || "Failed to load results"))
      .finally(() => setLoading(false));
  }, [interviewId]);

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3" style={{ color: "var(--text-muted)" }}>
      <Loader2 size={20} className="animate-spin" /> Loading results...
    </div>
  );

  if (error) return (
    <div className="max-w-xl mx-auto mt-16 p-6 rounded-xl text-center"
      style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
      <p className="mb-4" style={{ color: "#ef4444" }}>⚠️ {error}</p>
      <Link href="/results" className="btn-primary inline-flex items-center gap-2" style={{ textDecoration: "none" }}>
        ← Back to Results
      </Link>
    </div>
  );

  if (!data) return null;
  const rec = data.hire_recommendation ? recConfig[data.hire_recommendation] : null;

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/results" className="text-xs mb-4 inline-flex items-center gap-1 hover:underline"
        style={{ color: "var(--text-muted)", textDecoration: "none" }}>
        ← All Results
      </Link>
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
          Interview Results
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {data.role} · {data.total_questions} questions · {data.status} ·{" "}
          {data.completed_at ? new Date(data.completed_at).toLocaleDateString("en-IN") : ""}
        </p>
      </div>

      {/* Score + Rec cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-6">
          <div className="text-xs font-bold tracking-wide uppercase mb-3 flex items-center gap-2"
            style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-muted)" }}>
            <Star size={13} /> Overall Score
          </div>
          {data.overall_score != null ? (
            <>
              <div className="text-5xl font-bold mb-1" style={{
                fontFamily: "'Syne', sans-serif",
                color: data.overall_score >= 8 ? "#10b981" : data.overall_score >= 6 ? "var(--accent-cyan)" : "#ef4444"
              }}>
                {data.overall_score.toFixed(1)}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>out of 10</div>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold" style={{ color: "var(--text-muted)" }}>Pending</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>AI evaluation in progress...</div>
            </>
          )}
        </div>

        <div className="card p-6">
          <div className="text-xs font-bold tracking-wide uppercase mb-3 flex items-center gap-2"
            style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-muted)" }}>
            <TrendingUp size={13} /> AI Recommendation
          </div>
          {rec ? (
            <div className="text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: rec.color }}>
              {rec.label}
              {data.overall_feedback && (
                <p className="text-xs font-normal mt-2" style={{ color: "var(--text-secondary)" }}>
                  {data.overall_feedback}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Evaluation pending after interview completion.
            </p>
          )}
        </div>
      </div>

      {/* Question Breakdown */}
      <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
        Question Breakdown
      </h2>
      <div className="space-y-3 mb-6">
        {data.results.map((r, i) => (
          <div key={String(r.id)} className="card overflow-hidden">
            <button className="w-full flex items-start justify-between p-5 text-left"
              onClick={() => setExpandedQ(expandedQ === i ? null : i)}>
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}>
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{r.question_text}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {r.score != null ? `Score: ${r.score.toFixed(1)}/10` : "Pending..."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                {r.score != null && (
                  <span className="text-sm font-bold" style={{
                    color: r.score >= 8 ? "#10b981" : r.score >= 6 ? "var(--accent-cyan)" : "#ef4444"
                  }}>{r.score.toFixed(1)}</span>
                )}
                {expandedQ === i ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />}
              </div>
            </button>

            {expandedQ === i && (
              <div className="px-5 pb-5 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="mt-4 mb-4">
                  <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Your Answer</div>
                  <p className="text-sm p-3 rounded-lg" style={{ background: "var(--bg-surface)", color: "var(--text-secondary)" }}>
                    {r.answer_text}
                  </p>
                </div>
                {r.score != null && (
                  <>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {r.relevance_score != null && <ScoreBar label="Relevance" value={r.relevance_score} />}
                      {r.clarity_score != null && <ScoreBar label="Clarity" value={r.clarity_score} />}
                      {r.depth_score != null && <ScoreBar label="Depth" value={r.depth_score} />}
                    </div>
                    {r.feedback && (
                      <div className="mb-3 p-3 rounded-lg" style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.1)" }}>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{r.feedback}</p>
                      </div>
                    )}
                    {(r.strengths?.length || r.improvements?.length) ? (
                      <div className="grid grid-cols-2 gap-3">
                        {r.strengths?.length ? (
                          <div>
                            <div className="text-xs font-bold mb-2" style={{ color: "#10b981" }}>✓ Strengths</div>
                            {r.strengths.map((s, j) => <p key={j} className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>• {s}</p>)}
                          </div>
                        ) : null}
                        {r.improvements?.length ? (
                          <div>
                            <div className="text-xs font-bold mb-2" style={{ color: "#f59e0b" }}>↑ Improvements</div>
                            {r.improvements.map((s, j) => <p key={j} className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>• {s}</p>)}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {r.ideal_answer && (
                      <div className="mt-3 p-3 rounded-lg" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.1)" }}>
                        <div className="text-xs font-bold mb-1" style={{ color: "#10b981" }}>Ideal Answer</div>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{r.ideal_answer}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Link href="/interview" className="btn-primary flex items-center gap-2" style={{ textDecoration: "none" }}>
          <Play size={14} /> New Interview
        </Link>
        <Link href="/results" className="btn-ghost flex items-center gap-2" style={{ textDecoration: "none" }}>
          ← All Results
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────
function ResultsContent() {
  const params = useSearchParams();
  const interviewId = params.get("id");

  if (interviewId) return <SingleResult interviewId={interviewId} />;
  return <PastInterviewsList />;
}

export default function ResultsPage() {
  const router = useRouter();
  useEffect(() => { if (!getUser()) router.replace("/login"); }, [router]);
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      <Sidebar />
      <main className="ml-[220px] p-8">
        <Suspense fallback={
          <div className="flex items-center justify-center py-24">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        }>
          <ResultsContent />
        </Suspense>
      </main>
    </div>
  );
}
