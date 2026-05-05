"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { getUser, updateUserLocally, profile as profileApi, UserOut } from "../../lib/api";
import { setHRPassword, getHRPassword } from "../../lib/hr-auth";
import {
  User, Mail, Shield, Save, CheckCircle2, Camera, Calendar, Lock,
  Bell, Palette, ChevronRight, Key, Eye, EyeOff, Briefcase,
} from "lucide-react";

type Theme = "dark" | "dimmed" | "light";
interface Preferences { emailSummaries: boolean; weeklyDigest: boolean; hireAlerts: boolean; }

function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.classList.remove("theme-dark", "theme-dimmed", "theme-light");
  if (t !== "dark") root.classList.add(`theme-${t}`);
  localStorage.setItem("app_theme", t);
}

const PREFS_KEY = "user_preferences";
const DEFAULT_PREFS: Preferences = { emailSummaries: true, weeklyDigest: false, hireAlerts: true };
function loadPrefs(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try { const raw = localStorage.getItem(PREFS_KEY); return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS; }
  catch { return DEFAULT_PREFS; }
}

function SectionHeader({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <Icon size={15} style={{ color }} />
      <span className="text-sm font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>{label}</span>
    </div>
  );
}

function DetailRow({ label, value, valueColor, mono }: { label: string; value: string; valueColor?: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-xs font-semibold" style={{ color: valueColor || "var(--text-secondary)", fontFamily: mono ? "'DM Mono', monospace" : "'Syne', sans-serif" }}>{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserOut | null>(null);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [hrPassword, setHrPasswordState] = useState("");
  const [showHrPass, setShowHrPass] = useState(false);
  const [hrPassSaved, setHrPassSaved] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace("/login"); return; }
    setUser(u);
    setFullName(u.full_name);
    const savedTheme = (localStorage.getItem("app_theme") as Theme) || "dark";
    setTheme(savedTheme);
    setApiKey(localStorage.getItem("api_key") || "");
    setPrefs(loadPrefs());
    setHrPasswordState(getHRPassword());
  }, [router]);

  const handleThemeChange = (t: Theme) => { setTheme(t); applyTheme(t); };

  const handlePrefToggle = (key: keyof Preferences) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  };

  const handleApiKeySave = () => {
    localStorage.setItem("api_key", apiKey.trim());
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2500);
  };

  const handleHrPassSave = () => {
    if (!hrPassword.trim()) return;
    setHRPassword(hrPassword.trim());
    setHrPassSaved(true);
    setTimeout(() => setHrPassSaved(false), 2500);
  };

  const initials = fullName ? fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?";
  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—";

  const handleSave = async () => {
    if (!fullName.trim()) { setError("Name cannot be empty."); return; }
    setSaving(true); setError(null);
    try {
      await profileApi.update({ full_name: fullName.trim() });
      updateUserLocally({ full_name: fullName.trim() });
      setUser((prev) => prev ? { ...prev, full_name: fullName.trim() } : prev);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      setError((e as Error).message || "Failed to save.");
    } finally { setSaving(false); }
  };

  const roleColor = user?.role === "admin" ? "var(--accent-amber)" : "var(--accent-cyan)";
  const roleBg = user?.role === "admin" ? "rgba(245,158,11,0.12)" : "rgba(0,212,255,0.08)";
  const themeOptions: { key: Theme; label: string; preview: string }[] = [
    { key: "dark", label: "Dark", preview: "#080c14" },
    { key: "dimmed", label: "Dimmed", preview: "#111927" },
    { key: "light", label: "Light", preview: "#eef2fb" },
  ];
  const prefRows: { key: keyof Preferences; label: string; sub: string }[] = [
    { key: "emailSummaries", label: "Email me interview summaries", sub: "Get a recap after each session" },
    { key: "weeklyDigest", label: "Weekly progress digest", sub: "Summary of your activity and scores" },
    { key: "hireAlerts", label: "Hire recommendation alerts", sub: "Notify when a recommendation is ready" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      <Sidebar />
      <main className="lg:ml-[220px] pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8">
        <div className="mb-8 animate-fade-up">
          <p className="text-xs mb-1 tracking-widest uppercase font-bold" style={{ color: "var(--text-muted)" }}>Account</p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>Settings</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Manage your profile and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 max-w-4xl">
          <div className="space-y-5">
            {/* Profile */}
            <div className="card p-6 animate-fade-up">
              <SectionHeader icon={User} label="Profile Information" color="var(--accent-cyan)" />
              <div className="flex items-center gap-5 mb-6 pb-6" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold"
                    style={{ background: "rgba(0,212,255,0.12)", color: "var(--accent-cyan)", fontFamily: "'Syne', sans-serif" }}>
                    {initials}
                  </div>
                  <button className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-bright)" }} title="Coming soon">
                    <Camera size={11} style={{ color: "var(--text-muted)" }} />
                  </button>
                </div>
                <div>
                  <div className="text-base font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>{user?.full_name || "—"}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{user?.email}</div>
                  <span className="inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: roleBg, color: roleColor, fontFamily: "'Syne', sans-serif" }}>{user?.role}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 tracking-wide uppercase" style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}>Full Name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                    <input type="text" value={fullName} onChange={(e) => { setFullName(e.target.value); setSaved(false); setError(null); }} className="input-field pl-9 w-full" placeholder="Your full name" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 tracking-wide uppercase" style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}>Email Address</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                    <input type="email" value={user?.email || ""} readOnly className="input-field pl-9 w-full" style={{ opacity: 0.6, cursor: "not-allowed" }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 tracking-wide uppercase" style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}>Role</label>
                  <div className="relative">
                    <Shield size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                    <input type="text" value={user?.role || ""} readOnly className="input-field pl-9 w-full capitalize" style={{ opacity: 0.6, cursor: "not-allowed" }} />
                  </div>
                </div>
              </div>
              {error && <div className="mt-4 rounded-lg px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--accent-red)" }}>{error}</div>}
              <div className="flex items-center gap-3 mt-6">
                <button onClick={handleSave} disabled={saving || fullName === user?.full_name} className="btn-primary flex items-center gap-2">
                  {saving ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
                  {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
                </button>
                {fullName !== user?.full_name && !saving && (
                  <button onClick={() => { setFullName(user?.full_name || ""); setError(null); }} className="text-sm" style={{ color: "var(--text-muted)" }}>Discard</button>
                )}
                {saved && <span className="text-xs flex items-center gap-1" style={{ color: "var(--accent-green)" }}><CheckCircle2 size={12} /> Profile updated</span>}
              </div>
            </div>

            {/* API Key */}
            <div className="card p-6 animate-fade-up delay-100">
              <SectionHeader icon={Key} label="API Key" color="var(--accent-green)" />
              <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
                Your API key is sent as <code style={{ fontFamily: "'DM Mono'", color: "var(--accent-cyan)", background: "var(--bg-surface)", padding: "1px 5px", borderRadius: "4px" }}>X-API-Key</code> with every backend request. Without this, interview generation will fail.
              </p>
              <div className="relative mb-3">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                <input type={showApiKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                  className="input-field pl-9 pr-10 w-full" placeholder="Paste your API key here…" />
                <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                  {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button onClick={handleApiKeySave} className="btn-primary flex items-center gap-2 text-sm" style={{ background: "var(--accent-green)", padding: "9px 18px" }}>
                {apiKeySaved ? <CheckCircle2 size={14} /> : <Save size={14} />}
                {apiKeySaved ? "Key Saved!" : "Save API Key"}
              </button>
              {apiKey
                ? <p className="text-[11px] mt-2 flex items-center gap-1" style={{ color: "var(--accent-green)" }}><CheckCircle2 size={11} /> API key configured — requests will include it.</p>
                : <p className="text-[11px] mt-2" style={{ color: "var(--accent-amber)" }}>⚠ No API key set — interviews may not generate responses.</p>
              }
            </div>

            {/* Preferences */}
            <div className="card p-6 animate-fade-up delay-100">
              <SectionHeader icon={Bell} label="Preferences" color="var(--accent-amber)" />
              <div className="space-y-3">
                {prefRows.map((pref) => (
                  <div key={pref.key} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <div className="text-xs font-semibold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>{pref.label}</div>
                      <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{pref.sub}</div>
                    </div>
                    <button onClick={() => handlePrefToggle(pref.key)}
                      className="relative w-9 h-5 rounded-full transition-all flex-shrink-0"
                      style={{ background: prefs[pref.key] ? "var(--accent-cyan)" : "var(--bg-surface)", border: prefs[pref.key] ? "none" : "1px solid var(--border-bright)" }}>
                      <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                        style={{ background: prefs[pref.key] ? "var(--bg-deep)" : "var(--text-muted)", left: prefs[pref.key] ? "calc(100% - 18px)" : "2px" }} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[11px] mt-3" style={{ color: "var(--text-muted)" }}>Preferences save automatically and persist across sessions.</p>
            </div>

            {/* Appearance / Theme */}
            <div className="card p-6 animate-fade-up delay-200">
              <SectionHeader icon={Palette} label="Appearance" color="#a78bfa" />
              <div className="flex gap-3">
                {themeOptions.map((t) => (
                  <button key={t.key} onClick={() => handleThemeChange(t.key)}
                    className="flex-1 rounded-xl p-3 text-xs font-semibold transition-all"
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      background: theme === t.key ? "rgba(0,212,255,0.08)" : "var(--bg-surface)",
                      border: theme === t.key ? "1px solid rgba(0,212,255,0.3)" : "1px solid var(--border)",
                      color: theme === t.key ? "var(--accent-cyan)" : "var(--text-muted)",
                    }}>
                    <div className="w-full h-8 rounded-lg mb-2" style={{ background: t.preview, border: "1px solid var(--border)" }} />
                    {t.label}
                    {theme === t.key && <div className="mt-1 text-[10px]" style={{ color: "var(--accent-green)" }}>✓ Active</div>}
                  </button>
                ))}
              </div>
              <p className="text-[11px] mt-3" style={{ color: "var(--text-muted)" }}>Theme is applied instantly and saved across sessions.</p>
            </div>

            {/* HR Config (admin only) */}
            {user?.role === "admin" && (
              <div className="card p-6 animate-fade-up delay-200">
                <SectionHeader icon={Briefcase} label="HR Portal Configuration" color="var(--accent-amber)" />
                <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
                  Set the shared password HR staff use at <code style={{ fontFamily: "'DM Mono'", color: "var(--accent-cyan)", background: "var(--bg-surface)", padding: "1px 5px", borderRadius: "4px" }}>/hr-login</code>. They enter their name + this password.
                </p>
                <div className="relative mb-3">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                  <input type={showHrPass ? "text" : "password"} value={hrPassword} onChange={(e) => setHrPasswordState(e.target.value)}
                    className="input-field pl-9 pr-10 w-full" placeholder="HR portal password" />
                  <button type="button" onClick={() => setShowHrPass(!showHrPass)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                    {showHrPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button onClick={handleHrPassSave} className="btn-primary flex items-center gap-2 text-sm"
                  style={{ background: "var(--accent-amber)", color: "#1a1000", padding: "9px 18px" }}>
                  {hrPassSaved ? <CheckCircle2 size={14} /> : <Save size={14} />}
                  {hrPassSaved ? "Password Saved!" : "Update HR Password"}
                </button>
                <p className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>
                  Default: <code style={{ fontFamily: "'DM Mono'", color: "var(--accent-amber)" }}>hr2024</code>. Change after first setup.
                </p>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <div className="card p-5 animate-fade-up delay-100">
              <SectionHeader icon={Calendar} label="Account Details" color="var(--accent-green)" />
              <div className="space-y-3">
                <DetailRow label="Member since" value={joinedDate} />
                <DetailRow label="Account status" value={user?.is_active ? "Active" : "Inactive"} valueColor={user?.is_active ? "var(--accent-green)" : "var(--accent-red)"} />
                <DetailRow label="User ID" value={user?.id?.slice(0, 8) + "…" || "—"} mono />
              </div>
            </div>

            <div className="card p-5 animate-fade-up delay-200">
              <SectionHeader icon={Lock} label="Security" color="var(--accent-cyan)" />
              <div className="space-y-2">
                {[
                  { label: "Change Password", desc: "Update your login password" },
                  { label: "Two-Factor Auth", desc: "Add an extra layer of security" },
                  { label: "Active Sessions", desc: "Manage where you're logged in" },
                ].map((item) => (
                  <button key={item.label} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 transition-all text-left" style={{ border: "1px solid var(--border)" }}>
                    <div>
                      <div className="text-xs font-semibold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>{item.label}</div>
                      <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{item.desc}</div>
                    </div>
                    <ChevronRight size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  </button>
                ))}
              </div>
              <p className="text-[11px] mt-3" style={{ color: "var(--text-muted)" }}>Security features coming soon.</p>
            </div>

            <div className="rounded-xl p-5 animate-fade-up delay-300" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <div className="text-sm font-bold mb-1" style={{ fontFamily: "'Syne', sans-serif", color: "var(--accent-red)" }}>Danger Zone</div>
              <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>Permanently delete your account and all data.</p>
              <button className="text-xs px-3 py-2 rounded-lg font-semibold w-full" style={{ fontFamily: "'Syne', sans-serif", background: "rgba(239,68,68,0.08)", color: "var(--accent-red)", border: "1px solid rgba(239,68,68,0.3)" }}>
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
