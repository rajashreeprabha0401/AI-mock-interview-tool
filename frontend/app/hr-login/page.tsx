"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Eye, EyeOff, Briefcase, ArrowRight } from "lucide-react";
import { saveHRSession } from "../../lib/hr-auth";
import { auth, saveSession } from "../../lib/api";

export default function HRLoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!password) { setError("Please enter the HR password."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await auth.login({ email: "hr@company.com", password });
      saveSession(res.access_token, res.user);
      saveHRSession(name.trim());
      router.push("/hr-dashboard");
    } catch {
      setError("Incorrect HR password. Contact your administrator.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen dot-grid flex items-center justify-center p-4"
      style={{ background: "var(--bg-deep)" }}>
      <div className="fixed pointer-events-none" style={{
        top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "600px", height: "600px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)",
      }} />
      <div className="w-full max-w-[420px] relative">
        <div className="flex flex-col items-center mb-10 animate-fade-up">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)", boxShadow: "0 0 32px rgba(245,158,11,0.2)" }}>
            <Briefcase size={24} style={{ color: "var(--accent-amber)" }} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
            HR Portal
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Sign in to review candidate interviews
          </p>
        </div>

        <div className="card p-8 animate-fade-up delay-100"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 tracking-wide uppercase"
                style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}>
                Your Name
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }} />
                <input type="text" placeholder="e.g. Priya Sharma" className="input-field pl-9"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 tracking-wide uppercase"
                style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}>
                HR Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }} />
                <input type={showPass ? "text" : "password"} placeholder="••••••••"
                  className="input-field pl-9 pr-10" value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                Default password: <strong>hr123456</strong>
              </p>
            </div>

            {error && (
              <p className="text-xs px-3 py-2.5 rounded-lg"
                style={{ background: "rgba(239,68,68,0.08)", color: "var(--accent-red)", border: "1px solid rgba(239,68,68,0.2)" }}>
                ⚠️ {error}
              </p>
            )}

            <button onClick={handleLogin} disabled={loading}
              className="btn-primary flex items-center justify-center gap-2 w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--accent-amber)", color: "#1a1000", boxShadow: "0 0 20px rgba(245,158,11,0.25)" }}>
              {loading
                ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <><span>Sign In to HR Portal</span><ArrowRight size={16} /></>
              }
            </button>
          </div>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: "var(--text-muted)" }}>
          Candidate?{" "}
          <a href="/login" className="hover:underline" style={{ color: "var(--accent-cyan)" }}>
            Go to candidate login →
          </a>
        </p>
      </div>
    </div>
  );
}
