"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import VoiceMicButton from "../components/VoiceMicButton";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { roles as rolesApi, interview as interviewApi, Role, QuestionResponse, getUser } from "../../lib/api";
import { Mic2, ChevronRight, Clock, Send, Lightbulb, AlertCircle, CheckCircle2, Play, X, Loader2 } from "lucide-react";

const difficultyColors: Record<string, string> = {
  easy: "var(--accent-green)",
  medium: "var(--accent-amber)",
  hard: "var(--accent-red)",
};

const roleEmojis: Record<string, string> = {
  Frontend: "⚛️", Backend: "🔧", Management: "📊", Data: "🧮",
  Infrastructure: "⚙️", Design: "🎨", Default: "💼",
};

type Stage = "setup" | "active" | "submitting";

export default function InterviewPage() {
  const router = useRouter();

  // Setup state
  const [roleList, setRoleList] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [customQInput, setCustomQInput] = useState("10");

  // Interview state
  const [stage, setStage] = useState<Stage>("setup");
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState<QuestionResponse | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [askedTexts, setAskedTexts] = useState<Set<string>>(new Set());
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(120);
  const [hintOpen, setHintOpen] = useState(false);
  const [apiError, setApiError] = useState("");
  const startTimeRef = useRef<number>(Date.now());

  // Voice input
  const { status: voiceStatus, errorMsg: voiceError, toggle: toggleVoice, stop: stopVoice, supported: voiceSupported } =
    useVoiceInput({ onTranscript: (text) => setAnswer((prev) => prev + text) });

  // Auth guard
  useEffect(() => {
    if (!getUser()) router.replace("/login");
  }, [router]);

  // Fetch roles on mount
  useEffect(() => {
    rolesApi.list()
      .then((list) => {
        // Deduplicate by id in case backend returns duplicates
        const seen = new Set<string>();
        setRoleList(list.filter((r) => { if (seen.has(r.id)) return false; seen.add(r.id); return true; }));
      })
      .catch(() => setApiError("Could not load roles. Is the backend running?"))
      .finally(() => setRolesLoading(false));
  }, []);

  // Timer countdown
  useEffect(() => {
    if (stage !== "active") return;
    const t = setInterval(() => setTimeLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [stage, questionNumber]);

  // Stop voice on stage change
  useEffect(() => {
    if (stage !== "active") stopVoice();
  }, [stage, stopVoice]);

  const role = roleList.find((r) => r.id === selectedRole);

  const startInterview = async () => {
    if (!selectedRole) return;
    setApiError("");
    setStage("submitting");
    try {
      const iv = await interviewApi.start({ role_id: selectedRole, total_questions: totalQuestions });
      setInterviewId(iv.interview_id);
      const q = await interviewApi.generateQuestion({ interview_id: iv.interview_id, question_number: 1 });
      setCurrentQ(q);
      setQuestionNumber(1);
      setAskedTexts(new Set([q.question_text]));
      setAnswer("");
      setTimeLeft(240);
      setHintOpen(false);
      startTimeRef.current = Date.now();
      setStage("active");
    } catch (e: any) {
      setApiError(e.message);
      setStage("setup");
    }
  };

  const submitAnswer = async () => {
    if (!interviewId || !currentQ) return;
    setStage("submitting");
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    try {
      const res = await interviewApi.submitAnswer({
        interview_id: interviewId,
        question_id: currentQ.question_id,
        answer_text: answer || "(no answer provided)",
        time_taken_sec: timeTaken,
      });

      if (res.is_complete) {
        router.push(`/results?id=${interviewId}`);
        return;
      }

      // Load next question
      const nextNum = questionNumber + 1;
      const nextQ = await interviewApi.generateQuestion({ interview_id: interviewId, question_number: nextNum });
      // Track to prevent duplicate display
      setAskedTexts((prev) => new Set([...prev, nextQ.question_text]));
      setCurrentQ(nextQ);
      setQuestionNumber(nextNum);
      setAnswer("");
      setTimeLeft(240);
      setHintOpen(false);
      startTimeRef.current = Date.now();
      setStage("active");
    } catch (e: any) {
      setApiError(e.message);
      setStage("active");
    }
  };

  const charCount = answer.length;
  const minChars = 50;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      <Sidebar />
      <main className="lg:ml-[220px] pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8">

        {/* ── SETUP ── */}
        {(stage === "setup" || (stage === "submitting" && !interviewId)) && (
          <div className="max-w-3xl animate-fade-up">
            <div className="mb-8">
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>Step 1 of 2</p>
              <h1 className="text-3xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>Configure Interview</h1>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Select a role and set up your session preferences</p>
            </div>

            {apiError && (
              <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.08)", color: "var(--accent-red)", border: "1px solid rgba(239,68,68,0.2)" }}>
                ⚠️ {apiError}
              </div>
            )}

            {/* Role selection */}
            <div className="mb-6">
              <h2 className="text-sm font-bold mb-3 tracking-wide" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}>Choose a Role</h2>
              {rolesLoading ? (
                <div className="flex items-center gap-2 py-8 justify-center" style={{ color: "var(--text-muted)" }}>
                  <Loader2 size={18} className="animate-spin" /> Loading roles...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roleList.map((r) => (
                    <button key={r.id} onClick={() => setSelectedRole(r.id)}
                      className="card p-4 text-left transition-all hover:-translate-y-0.5"
                      style={{ border: selectedRole === r.id ? "1px solid var(--accent-cyan)" : "1px solid var(--border)", background: selectedRole === r.id ? "rgba(0,212,255,0.04)" : "var(--bg-card)", boxShadow: selectedRole === r.id ? "var(--glow-cyan)" : "none" }}>
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{roleEmojis[r.category] || roleEmojis.Default}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>{r.title}</span>
                            <span className="badge" style={{ background: `${difficultyColors[r.difficulty]}18`, color: difficultyColors[r.difficulty] }}>{r.difficulty}</span>
                          </div>
                          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{r.description || r.category}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Question count */}
            <div className="card p-5 mb-6">
              <h2 className="text-sm font-bold mb-3" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}>Number of Questions</h2>
              {/* Quick presets */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[5, 10, 25, 50, 100].map((n) => (
                  <button key={n} onClick={() => { setTotalQuestions(n); setCustomQInput(String(n)); }}
                    className="w-12 h-9 rounded-lg text-sm font-bold transition-all"
                    style={{ fontFamily: "'Syne', sans-serif", background: totalQuestions === n ? "var(--accent-cyan)" : "var(--bg-surface)", color: totalQuestions === n ? "var(--bg-deep)" : "var(--text-secondary)", border: totalQuestions === n ? "none" : "1px solid var(--border)" }}>
                    {n}
                  </button>
                ))}
              </div>
              {/* Custom slider */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Custom amount</span>
                  <span className="text-sm font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--accent-cyan)" }}>{totalQuestions} questions</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={totalQuestions}
                  onChange={(e) => { const v = Number(e.target.value); setTotalQuestions(v); setCustomQInput(String(v)); }}
                  className="w-full"
                  style={{ accentColor: "var(--accent-cyan)", cursor: "pointer" }}
                />
                <div className="flex justify-between text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  <span>1</span><span>25</span><span>50</span><span>75</span><span>100</span>
                </div>
              </div>
              {/* Manual input */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Or type exact number:</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={customQInput}
                  onChange={(e) => {
                    setCustomQInput(e.target.value);
                    const v = Math.min(100, Math.max(1, Number(e.target.value) || 1));
                    setTotalQuestions(v);
                  }}
                  className="input-field text-center"
                  style={{ width: "70px", padding: "6px 8px", fontSize: "0.875rem" }}
                />
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Estimated time: ~{Math.round(totalQuestions * 4)} minutes</p>
            </div>

            <button onClick={startInterview} disabled={!selectedRole || stage === "submitting"}
              className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none">
              {stage === "submitting" ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
              Start Interview
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* ── ACTIVE ── */}
        {(stage === "active" || (stage === "submitting" && interviewId)) && currentQ && (
          <div className="max-w-3xl animate-fade-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-lg">{roleEmojis[role?.category || ""] || roleEmojis.Default}</span>
                <div>
                  <h1 className="text-base font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>{role?.title}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    {[...Array(totalQuestions)].map((_, i) => (
                      <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < questionNumber ? "var(--accent-cyan)" : "var(--bg-surface)", maxWidth: "28px" }} />
                    ))}
                    <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>{questionNumber}/{totalQuestions}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono" style={{ background: "var(--bg-surface)", color: timeLeft < 30 ? "var(--accent-red)" : "var(--accent-cyan)", border: "1px solid var(--border)" }}>
                  <Clock size={13} />{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
                </div>
                <button onClick={() => setStage("setup")} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* API error */}
            {apiError && (
              <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.08)", color: "var(--accent-red)", border: "1px solid rgba(239,68,68,0.2)" }}>
                ⚠️ {apiError}
              </div>
            )}

            {/* Question */}
            <div className="rounded-xl p-6 mb-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-bright)", boxShadow: "var(--glow-cyan)" }}>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold" style={{ background: "rgba(0,212,255,0.12)", color: "var(--accent-cyan)", fontFamily: "'Syne', sans-serif" }}>
                  Q{questionNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge" style={{ background: "rgba(0,212,255,0.1)", color: "var(--accent-cyan)" }}>{currentQ.question_type}</span>
                  </div>
                  <p className="text-base leading-relaxed" style={{ color: "var(--text-primary)" }}>{currentQ.question_text}</p>
                </div>
              </div>
            </div>

            {/* Hint */}
            <div className="mb-4">
              <button onClick={() => setHintOpen(!hintOpen)} className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: hintOpen ? "var(--accent-amber)" : "var(--text-muted)" }}>
                <Lightbulb size={13} />{hintOpen ? "Hide hint" : "Show hint"}
              </button>
              {hintOpen && (
                <div className="mt-2 p-3 rounded-lg text-xs leading-relaxed animate-fade-in" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", color: "var(--text-secondary)" }}>
                  💡 Take a moment to structure your answer — consider using examples from your experience and explaining your reasoning clearly.
                </div>
              )}
            </div>

            {/* Answer textarea */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold tracking-wide" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}>Your Answer</label>
                <VoiceMicButton status={voiceStatus} onToggle={toggleVoice} supported={voiceSupported} />
              </div>
              <textarea
                className="input-field resize-none"
                rows={8}
                placeholder="Type your answer here or click Voice to speak..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                style={{ minHeight: "200px" }}
                disabled={stage === "submitting"}
              />
              {voiceError && <p className="text-xs mt-1" style={{ color: "var(--accent-red)" }}>⚠️ {voiceError}</p>}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1.5 text-xs" style={{ color: charCount >= minChars ? "var(--accent-green)" : "var(--text-muted)" }}>
                  {charCount >= minChars ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  {charCount < minChars ? `${minChars - charCount} more chars for a complete answer` : "Good length!"}
                </div>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{charCount} / 5000</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setAnswer("")} className="btn-ghost text-sm flex items-center gap-2" style={{ padding: "10px 20px" }}>Clear</button>
              <button onClick={submitAnswer} disabled={stage === "submitting" || charCount < minChars}
                className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none">
                {stage === "submitting" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {questionNumber < totalQuestions ? "Submit & Next" : "Finish Interview"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
