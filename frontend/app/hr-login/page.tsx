"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Shield } from "lucide-react";
import { saveHRSession } from "../../lib/hr-auth";
import { auth, saveSession } from "../../lib/api";

export default function HRLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (!password) { setError("Please enter your password."); return; }
    setLoading(true); setError("");
    try {
      const res = await auth.login({ email: email.trim(), password });
      if (res.user.role !== "hr" && res.user.role !== "admin") {
        setError("Access denied. HR credentials required.");
        setLoading(false); return;
      }
      saveSession(res.access_token, res.user);
      saveHRSession(res.user.full_name);
      router.push("/hr-dashboard");
    } catch {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-deep)" }}>
      {/* Left Panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12"
        style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.05) 0%, rgba(245,158,11,0.05) 100%)", borderRight: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent-amber)", boxShadow: "0 0 20px rgba(245,158,11,0.3)" }}>
            <Shield size={18} color="#1a1000" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
            InterviewAI
          </span>
        </div>
        <div>
          <h2 className="text-4xl font-bold mb-4 leading-tight"
            style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
            Manage your<br />
            <span style={{ color: "var(--accent-amber)" }}>talent pipeline</span>
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Review AI-powered interview results, make hire decisions, and manage your candidates — all in one place.
          </p>
          <div className="mt-8 space-y-3">
            {["AI-evaluated interview scores", "Hire / No-Hire recommendations", "Candidate management & deletion", "Export reports as CSV"].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(245,158,11,0.15)", color: "var(--accent-amber)" }}>
                  ✓
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>© 2026 InterviewAI · HR Portal</p>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-10">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
              <Shield size={22} style={{ color: "var(--accent-amber)" }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
              HR Sign In
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Sign in to access the HR portal
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 tracking-wide uppercase"
                style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}>
                Email Address
              </label>
              <input type="email" placeholder="hr@company.com" className="input-field w-full"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 tracking-wide uppercase"
                style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}>
                Password
              </label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} placeholder="••••••••"
                  className="input-field w-full pr-10"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleLogin()} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-3 py-2.5 rounded-lg text-xs"
                style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={handleLogin} disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "var(--accent-amber)", color: "#1a1000" }}>
              {loading
                ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <><span>Sign In to HR Portal</span><ArrowRight size={16} /></>
              }
            </button>
          </div>

          <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
            Candidate?{" "}
            <a href="/login" className="hover:underline" style={{ color: "var(--accent-cyan)" }}>
              Candidate login →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
