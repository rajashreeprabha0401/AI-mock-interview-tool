"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { getUser, saveSession, UserOut } from "../../lib/api";
import { Shield, Key, Trash2, Eye, EyeOff, CheckCircle2, AlertCircle, User, Mail, Save } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data.detail)
      ? data.detail.map((d: any) => d.msg).join(", ")
      : data.detail || `Error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserOut | null>(null);

  // Profile
  const [fullName, setFullName] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [savingPwd, setSavingPwd] = useState(false);

  // API Key
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Theme
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const changeTheme = (t: string) => {
    setTheme(t);
    localStorage.setItem("theme", t);
    document.documentElement.setAttribute("data-theme", t);
  };
  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace("/login"); return; }
    setUser(u);
    setFullName(u.full_name);
    const saved = localStorage.getItem("api_key") || "";
    setApiKey(saved);
  }, [router]);

  const saveProfile = async () => {
    if (!fullName.trim()) { setProfileMsg({ type: "err", text: "Name cannot be empty" }); return; }
    setSavingProfile(true); setProfileMsg(null);
    try {
      const updated = await apiFetch("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ full_name: fullName.trim() }),
      });
      const token = getToken();
      saveSession(token, updated);
      setUser(updated);
      setProfileMsg({ type: "ok", text: "Profile updated successfully!" });
    } catch (e: any) {
      setProfileMsg({ type: "err", text: e.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) { setPwdMsg({ type: "err", text: "All fields required" }); return; }
    if (newPwd !== confirmPwd) { setPwdMsg({ type: "err", text: "New passwords do not match" }); return; }
    if (newPwd.length < 6) { setPwdMsg({ type: "err", text: "Password must be at least 6 characters" }); return; }
    setSavingPwd(true); setPwdMsg(null);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
      });
      setPwdMsg({ type: "ok", text: "Password changed successfully!" });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (e: any) {
      setPwdMsg({ type: "err", text: e.message });
    } finally {
      setSavingPwd(false);
    }
  };

  const saveApiKey = () => {
    localStorage.setItem("api_key", apiKey.trim());
    alert("✅ API Key saved!");
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeletingAccount(true);
    try {
      await apiFetch("/auth/account", { method: "DELETE" });
      localStorage.clear();
      router.replace("/login");
    } catch (e: any) {
      alert("Error: " + e.message);
      setDeletingAccount(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      <Sidebar />
      <main className="ml-[220px] p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>Settings</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Manage your account, security and preferences</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Profile */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <User size={16} style={{ color: "var(--accent-cyan)" }} />
                <h2 className="text-sm font-bold tracking-wide uppercase" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>Profile</h2>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
                  style={{ background: "rgba(0,212,255,0.12)", color: "var(--accent-cyan)", fontFamily: "'Syne', sans-serif" }}>
                  {user.full_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="font-bold" style={{ color: "var(--text-primary)" }}>{user.full_name}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{user.email}</div>
                  <div className="text-xs mt-0.5 px-2 py-0.5 rounded-full inline-block capitalize"
                    style={{ background: "rgba(0,212,255,0.1)", color: "var(--accent-cyan)" }}>{user.role}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5 tracking-wide uppercase"
                    style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}>Full Name</label>
                  <input type="text" className="input-field w-full" value={fullName}
                    onChange={e => setFullName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 tracking-wide uppercase"
                    style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}>Email</label>
                  <input type="email" className="input-field w-full" value={user.email} disabled
                    style={{ opacity: 0.6, cursor: "not-allowed" }} />
                </div>

                {profileMsg && (
                  <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                    style={{
                      background: profileMsg.type === "ok" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                      color: profileMsg.type === "ok" ? "#10b981" : "#ef4444",
                    }}>
                    {profileMsg.type === "ok" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {profileMsg.text}
                  </div>
                )}

                <button onClick={saveProfile} disabled={savingProfile}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50">
                  <Save size={14} /> {savingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
            {/* Theme */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <span style={{ fontSize: 16 }}>??</span>
                <h2 className="text-sm font-bold tracking-wide uppercase" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>Theme</h2>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "dark", label: "Dark", bg: "#0a0f1e", accent: "#00d4ff" },
                  { id: "light", label: "Light", bg: "#f0f4ff", accent: "#0066cc" },
                  { id: "midnight", label: "Midnight", bg: "#050510", accent: "#a78bfa" },
                ].map((t) => (
                  <button key={t.id} onClick={() => changeTheme(t.id)}
                    className="p-3 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: t.bg,
                      color: t.accent,
                      border: theme === t.id ? `2px solid ${t.accent}` : "2px solid transparent",
                      fontFamily: "'Syne', sans-serif",
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>


            {/* API Key */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Key size={16} style={{ color: "var(--accent-cyan)" }} />
                <h2 className="text-sm font-bold tracking-wide uppercase" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>API Key</h2>
              </div>
              <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
                Your OpenRouter API key is used for AI interview evaluation. Without this, scores will use fallback values.
              </p>
              <div className="relative mb-3">
                <input
                  type={showApiKey ? "text" : "password"}
                  placeholder="sk-or-v1-..."
                  className="input-field w-full pr-10"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                />
                <button type="button" onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}>
                  {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {apiKey && (
                <p className="text-xs mb-3" style={{ color: "#10b981" }}>✅ API key configured</p>
              )}
              <button onClick={saveApiKey} className="btn-primary flex items-center gap-2">
                <Save size={14} /> Save API Key
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Security - Change Password */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <Shield size={16} style={{ color: "var(--accent-cyan)" }} />
                <h2 className="text-sm font-bold tracking-wide uppercase" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>Security</h2>
              </div>

              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>Change Password</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5 tracking-wide uppercase"
                    style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}>Current Password</label>
                  <div className="relative">
                    <input type={showPwd ? "text" : "password"} className="input-field w-full pr-10"
                      placeholder="••••••••" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                      {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 tracking-wide uppercase"
                    style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}>New Password</label>
                  <input type={showPwd ? "text" : "password"} className="input-field w-full"
                    placeholder="Min 6 characters" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 tracking-wide uppercase"
                    style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}>Confirm New Password</label>
                  <input type={showPwd ? "text" : "password"} className="input-field w-full"
                    placeholder="Repeat new password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
                </div>

                {pwdMsg && (
                  <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                    style={{
                      background: pwdMsg.type === "ok" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                      color: pwdMsg.type === "ok" ? "#10b981" : "#ef4444",
                    }}>
                    {pwdMsg.type === "ok" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {pwdMsg.text}
                  </div>
                )}

                <button onClick={changePassword} disabled={savingPwd}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50">
                  <Shield size={14} /> {savingPwd ? "Changing..." : "Change Password"}
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="card p-6" style={{ border: "1px solid rgba(239,68,68,0.3)" }}>
              <div className="flex items-center gap-2 mb-4">
                <Trash2 size={16} style={{ color: "#ef4444" }} />
                <h2 className="text-sm font-bold tracking-wide uppercase" style={{ fontFamily: "'Syne', sans-serif", color: "#ef4444" }}>Danger Zone</h2>
              </div>

              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                Permanently delete your account and all your interview data. This action <strong>cannot be undone</strong>.
              </p>

              <div className="mb-3">
                <label className="block text-xs font-bold mb-1.5 tracking-wide uppercase"
                  style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}>
                  Type <strong style={{ color: "#ef4444" }}>DELETE</strong> to confirm
                </label>
                <input type="text" className="input-field w-full"
                  placeholder="Type DELETE here"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  style={{ border: deleteConfirm === "DELETE" ? "1px solid #ef4444" : undefined }}
                />
              </div>

              <button
                onClick={deleteAccount}
                disabled={deleteConfirm !== "DELETE" || deletingAccount}
                className="w-full py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.3)",
                  fontFamily: "'Syne', sans-serif",
                }}>
                {deletingAccount ? "Deleting..." : "🗑 Delete My Account"}
              </button>
            </div>

            {/* Account Info */}
            <div className="card p-6">
              <h2 className="text-sm font-bold mb-4 tracking-wide uppercase"
                style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}>Account Info</h2>
              <div className="space-y-3 text-sm">
                {[
                  { label: "Account Status", value: user.is_active ? "Active" : "Inactive", color: user.is_active ? "#10b981" : "#ef4444" },
                  { label: "Role", value: user.role, color: "var(--accent-cyan)" },
                  { label: "Member Since", value: user.created_at ? new Date(user.created_at).toLocaleDateString("en-IN") : "—" },
                  { label: "User ID", value: user.id.slice(0, 8) + "..." },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between items-center py-2"
                    style={{ borderBottom: "1px solid var(--border)" }}>
                    <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                    <span className="font-semibold" style={{ color: color || "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

