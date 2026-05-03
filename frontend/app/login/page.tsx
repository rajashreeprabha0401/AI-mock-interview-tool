"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Zap, ArrowRight } from "lucide-react";
import { auth, saveSession } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await auth.register({ full_name: name, email, password });
      }
      const res = await auth.login({ email, password });
      saveSession(res.access_token, res.user);
      router.push(res.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen dot-grid flex items-center justify-center p-4" style={{ background: "var(--bg-deep)" }}>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)" }} />

      <div className="w-full max-w-[420px] relative">
        <div className="flex flex-col items-center mb-10 animate-fade-up">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--accent-cyan)", boxShadow: "0 0 32px rgba(0,212,255,0.35)" }}>
            <Zap size={22} color="var(--bg-deep)" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>InterviewAI</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{isRegister ? "Create your account" : "Sign in to your account"}</p>
        </div>

        <div className="card p-8 animate-fade-up delay-100" style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}>
          <div className="flex rounded-lg p-1 mb-7" style={{ background: "var(--bg-surface)" }}>
            {["Sign In", "Register"].map((tab, i) => (
              <button key={tab} onClick={() => { setIsRegister(i === 1); setError(""); }}
                className="flex-1 py-2 rounded-md text-sm font-semibold transition-all"
                style={{ fontFamily: "'Syne', sans-serif", background: isRegister === (i === 1) ? "var(--bg-elevated)" : "transparent", color: isRegister === (i === 1) ? "var(--text-primary)" : "var(--text-muted)", border: isRegister === (i === 1) ? "1px solid var(--border-bright)" : "1px solid transparent" }}>
                {tab}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold mb-2 tracking-wide" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}>Full Name</label>
                <input type="text" placeholder="Alex Johnson" className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-2 tracking-wide" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}>Email Address</label>
              <input type="email" placeholder="alex@example.com" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 tracking-wide" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}>Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} placeholder="••••••••" className="input-field pr-12" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", color: "var(--accent-red)", border: "1px solid rgba(239,68,68,0.2)" }}>⚠️ {error}</p>}

            <button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center justify-center gap-2 w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <><span>{isRegister ? "Create Account" : "Sign In"}</span><ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
