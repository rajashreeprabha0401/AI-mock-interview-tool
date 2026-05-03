"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { getUser } from "../../lib/api";
import { getHRSession } from "../../lib/hr-auth";
import {
  Users, Search, ThumbsUp, ThumbsDown, TrendingUp, CheckCircle2,
  Clock, RefreshCw, Download, Trash2, UserCheck, UserX, ChevronDown, ChevronUp, Shield
} from "lucide-react";

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
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

const recConfig: Record<string, { label: string; color: string }> = {
  strong_yes: { label: "Strong Hire ✅", color: "#10b981" },
  yes: { label: "Hire ✅", color: "#10b981" },
  maybe: { label: "Maybe 🤔", color: "#f59e0b" },
  no: { label: "No Hire ❌", color: "#ef4444" },
  strong_no: { label: "Strong No ❌", color: "#ef4444" },
};

export default function HRDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"interviews" | "candidates">("interviews");
  const [filter, setFilter] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch("/admin/dashboard");
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = getUser();
    const hr = getHRSession();
    if (!user && !hr) { router.replace("/hr-login"); return; }
    load();
  }, [load, router]);

  const hireDecision = async (interviewId: string, rec: string) => {
    await apiFetch(`/admin/interviews/${interviewId}/hire-decision`, {
      method: "PATCH",
      body: JSON.stringify({ hire_recommendation: rec }),
    });
    load();
  };

  const deleteInterview = async (interviewId: string) => {
    if (!confirm("Delete this interview? This cannot be undone.")) return;
    await apiFetch(`/admin/interviews/${interviewId}`, { method: "DELETE" });
    load();
  };

  const deleteCandidate = async (userId: string, name: string) => {
    if (!confirm(`Delete candidate "${name}" and ALL their data? This cannot be undone.`)) return;
    await apiFetch(`/admin/candidates/${userId}`, { method: "DELETE" });
    load();
  };

  const toggleActive = async (userId: string) => {
    await apiFetch(`/admin/candidates/${userId}/toggle-active`, { method: "PATCH" });
    load();
  };

  const grantPermission = async (userId: string) => {
    await apiFetch(`/admin/candidates/${userId}/grant-permission`, { method: "POST" });
    load();
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = [["Candidate", "Email", "Role", "Status", "Score", "Recommendation", "Date"]];
    data.recent_activity.forEach((a: any) => {
      rows.push([a.user_name, a.user_email, a.role_title, a.status,
        a.overall_score ?? "—", a.hire_recommendation ?? "Pending",
        a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "candidates.csv"; a.click();
  };

  const interviews = data?.recent_activity ?? [];
  const candidates = data?.users ?? [];
  const stats = data?.stats ?? {};

  const filteredInterviews = interviews.filter((i: any) => {
    const matchSearch = i.user_name.toLowerCase().includes(search.toLowerCase()) ||
      i.user_email.toLowerCase().includes(search.toLowerCase()) ||
      i.role_title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || i.hire_recommendation === filter ||
      (filter === "pending" && !i.hire_recommendation);
    return matchSearch && matchFilter;
  });

  const filteredCandidates = candidates.filter((c: any) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      <Sidebar />
      <main className="ml-[220px] p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} style={{ color: "var(--accent-amber)" }} />
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--accent-amber)" }}>HR PORTAL</span>
            </div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
              Candidate Dashboard
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Manage candidates · Review interviews · Hire decisions
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={exportCSV} className="btn-ghost flex items-center gap-2 text-sm">
              <Download size={14} /> Export CSV
            </button>
            <button onClick={() => load()} className="btn-ghost flex items-center gap-2 text-sm">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Candidates", value: stats.total_users ?? 0, icon: Users, color: "var(--accent-cyan)" },
            { label: "Completed Interviews", value: stats.completed_interviews ?? 0, icon: CheckCircle2, color: "#10b981" },
            { label: "Hired", value: (stats.hire_distribution?.strong_yes ?? 0) + (stats.hire_distribution?.yes ?? 0), icon: UserCheck, color: "#10b981" },
            { label: "Avg Score", value: stats.avg_overall_score ? `${stats.avg_overall_score}/10` : "—", icon: TrendingUp, color: "var(--accent-amber)" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${color}18` }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{label}</span>
              </div>
              <div className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "var(--bg-card)" }}>
          {(["interviews", "candidates"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-5 py-2 rounded-lg text-sm font-bold capitalize transition-all"
              style={{
                fontFamily: "'Syne', sans-serif",
                background: tab === t ? "var(--accent-cyan)" : "transparent",
                color: tab === t ? "var(--bg-deep)" : "var(--text-secondary)",
              }}>
              {t === "interviews" ? `Interviews (${interviews.length})` : `Candidates (${candidates.length})`}
            </button>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input type="text" placeholder="Search by name, email or role..."
              className="input-field pl-9 w-full"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {tab === "interviews" && (
            <div className="flex gap-2">
              {["All", "strong_yes", "yes", "maybe", "no", "pending"].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-3 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: filter === f ? "rgba(0,212,255,0.12)" : "var(--bg-card)",
                    color: filter === f ? "var(--accent-cyan)" : "var(--text-muted)",
                    border: filter === f ? "1px solid var(--accent-cyan)" : "1px solid var(--border)",
                  }}>
                  {f === "All" ? "All" : f === "pending" ? "Pending" : recConfig[f]?.label || f}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>Loading...</div>
        ) : tab === "interviews" ? (
          /* ── INTERVIEWS TAB ── */
          <div className="space-y-3">
            {filteredInterviews.length === 0 ? (
              <div className="card p-12 text-center">
                <p style={{ color: "var(--text-muted)" }}>No interviews found</p>
              </div>
            ) : filteredInterviews.map((iv: any) => {
              const rec = iv.hire_recommendation ? recConfig[iv.hire_recommendation] : null;
              const expanded = expandedId === iv.interview_id;
              return (
                <div key={iv.interview_id} className="card overflow-hidden">
                  <div className="p-5 flex items-center justify-between gap-4">
                    {/* Candidate info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: "rgba(0,212,255,0.12)", color: "var(--accent-cyan)", fontFamily: "'Syne', sans-serif" }}>
                        {iv.user_name?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
                          {iv.user_name}
                        </div>
                        <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{iv.user_email}</div>
                      </div>
                    </div>

                    {/* Role */}
                    <div className="text-center hidden md:block">
                      <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{iv.role_title}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>Role</div>
                    </div>

                    {/* Status */}
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0"
                      style={{
                        background: iv.status === "completed" ? "rgba(16,185,129,0.1)" : "rgba(0,212,255,0.08)",
                        color: iv.status === "completed" ? "#10b981" : "var(--accent-cyan)",
                      }}>
                      {iv.status === "completed" ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                      {iv.status}
                    </span>

                    {/* Score */}
                    <div className="text-center w-16 flex-shrink-0">
                      <div className="text-lg font-bold" style={{
                        fontFamily: "'Syne', sans-serif",
                        color: iv.overall_score >= 8 ? "#10b981" : iv.overall_score >= 6 ? "var(--accent-cyan)" : iv.overall_score ? "#ef4444" : "var(--text-muted)"
                      }}>
                        {iv.overall_score ? iv.overall_score.toFixed(1) : "—"}
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>score</div>
                    </div>

                    {/* Recommendation */}
                    <div className="w-28 flex-shrink-0">
                      {rec ? (
                        <span className="text-xs font-bold" style={{ color: rec.color }}>{rec.label}</span>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Pending</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button title="Hire" onClick={() => hireDecision(iv.interview_id, "yes")}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                        style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                        <ThumbsUp size={13} />
                      </button>
                      <button title="Decline" onClick={() => hireDecision(iv.interview_id, "no")}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                        style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
                        <ThumbsDown size={13} />
                      </button>
                      <button title="Delete Interview" onClick={() => deleteInterview(iv.interview_id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                        style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}>
                        <Trash2 size={13} />
                      </button>
                      <button onClick={() => setExpandedId(expanded ? null : iv.interview_id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ color: "var(--text-muted)" }}>
                        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded hire decision panel */}
                  {expanded && (
                    <div className="px-5 pb-5 pt-0 border-t" style={{ borderColor: "var(--border)" }}>
                      <div className="mt-4">
                        <p className="text-xs font-bold mb-3" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-secondary)" }}>
                          SET HIRE DECISION
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(recConfig).map(([key, cfg]) => (
                            <button key={key} onClick={() => hireDecision(iv.interview_id, key)}
                              className="px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105"
                              style={{
                                background: iv.hire_recommendation === key ? `${cfg.color}22` : "var(--bg-surface)",
                                color: iv.hire_recommendation === key ? cfg.color : "var(--text-secondary)",
                                border: iv.hire_recommendation === key ? `1px solid ${cfg.color}` : "1px solid var(--border)",
                              }}>
                              {cfg.label}
                            </button>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            Interview: {iv.created_at ? new Date(iv.created_at).toLocaleDateString("en-IN") : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── CANDIDATES TAB ── */
          <div className="space-y-3">
            {filteredCandidates.length === 0 ? (
              <div className="card p-12 text-center">
                <p style={{ color: "var(--text-muted)" }}>No candidates found</p>
              </div>
            ) : filteredCandidates.map((c: any) => (
              <div key={c.id} className="card p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: "rgba(0,212,255,0.12)", color: "var(--accent-cyan)", fontFamily: "'Syne', sans-serif" }}>
                    {c.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
                      {c.full_name}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{c.email}</div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{c.interview_count}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>Interviews</div>
                </div>

                <div className="text-center">
                  <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{c.completed_count}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>Completed</div>
                </div>

                <div className="text-center">
                  <div className="text-sm font-bold" style={{ color: c.avg_score >= 8 ? "#10b981" : c.avg_score >= 6 ? "var(--accent-cyan)" : c.avg_score ? "#ef4444" : "var(--text-muted)" }}>
                    {c.avg_score ? `${c.avg_score}/10` : "—"}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>Avg Score</div>
                </div>

                <span className={`text-xs font-bold px-2 py-1 rounded-full`}
                  style={{
                    background: c.is_active ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                    color: c.is_active ? "#10b981" : "#ef4444",
                  }}>
                  {c.is_active ? "Active" : "Inactive"}
                </span>

                {/* Candidate actions */}
                <div className="flex items-center gap-2">
                  <button title={c.is_active ? "Deactivate" : "Grant Permission"}
                    onClick={() => c.is_active ? toggleActive(c.id) : grantPermission(c.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: c.is_active ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                      color: c.is_active ? "#ef4444" : "#10b981",
                    }}>
                    {c.is_active ? <><UserX size={12} /> Deactivate</> : <><UserCheck size={12} /> Activate</>}
                  </button>
                  <button title="Delete Candidate"
                    onClick={() => deleteCandidate(c.id, c.full_name)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
