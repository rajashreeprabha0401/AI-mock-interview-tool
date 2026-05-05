"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { admin as adminApi, AdminDashboardData, AdminUserRow, ActivityItem, getUser } from "../../lib/api";
import {
  Users,
  Mic2,
  TrendingUp,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  BarChart2,
  RefreshCw,
  Award,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

// ── Mini bar chart (pure SVG) ──────────────────────────────────
function MiniBarChart({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  const max = Math.max(...data, 1);
  const w = 6, gap = 4;
  const totalW = data.length * (w + gap) - gap;
  return (
    <svg width={totalW} height={height} className="opacity-70">
      {data.map((v, i) => {
        const barH = Math.max(2, (v / max) * height);
        return <rect key={i} x={i * (w + gap)} y={height - barH} width={w} height={barH} rx={2} fill={color} />;
      })}
    </svg>
  );
}

// ── Donut chart ────────────────────────────────────────────────
function HireDonut({ strong_yes, yes, no, strong_no, pending }: { strong_yes: number; yes: number; no: number; strong_no: number; pending: number }) {
  const segments = [
    { label: "Strong Yes", value: strong_yes, color: "#10b981" },
    { label: "Yes", value: yes, color: "#34d399" },
    { label: "Pending", value: pending, color: "#6b7280" },
    { label: "No", value: no, color: "#f87171" },
    { label: "Strong No", value: strong_no, color: "#ef4444" },
  ].filter((s) => s.value > 0);
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total === 0) return (
    <div className="flex items-center justify-center w-[120px] h-[120px] rounded-full text-xs"
      style={{ border: "2px dashed var(--border-bright)", color: "var(--text-muted)" }}>No data</div>
  );
  const r = 45, cx = 60, cy = 60;
  let cumAngle = -Math.PI / 2;
  const arcs: { d: string; color: string; label: string; value: number }[] = [];
  for (const seg of segments) {
    const angle = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle), y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle), y2 = cy + r * Math.sin(cumAngle);
    arcs.push({ d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${angle > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`, color: seg.color, label: seg.label, value: seg.value });
  }
  return (
    <div className="flex items-center gap-5">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {arcs.map((arc, i) => <path key={i} d={arc.d} fill={arc.color} opacity={0.9} />)}
        <circle cx={cx} cy={cy} r={28} fill="var(--bg-card)" />
        <text x={cx} y={cy - 5} textAnchor="middle" fill="var(--text-primary)" fontSize="14" fontWeight="bold" fontFamily="'Syne', sans-serif">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-muted)" fontSize="8">evals</text>
      </svg>
      <div className="space-y-1.5">
        {arcs.map((arc, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: arc.color }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{arc.label}</span>
            <span className="text-xs font-bold ml-auto" style={{ color: "var(--text-secondary)", fontFamily: "'Syne', sans-serif" }}>{arc.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  const pct = (score / 10) * 100;
  const color = score >= 8 ? "var(--accent-green)" : score >= 6 ? "var(--accent-cyan)" : "var(--accent-red)";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 rounded-full" style={{ width: "50px", background: "var(--bg-surface)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color, fontFamily: "'Syne', sans-serif" }}>{score.toFixed(1)}</span>
    </div>
  );
}

function HireBadge({ rec }: { rec: string | null }) {
  if (!rec) return <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>—</span>;
  const map: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
    strong_yes: { icon: <ThumbsUp size={10} />, color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "Strong Yes" },
    yes: { icon: <ThumbsUp size={10} />, color: "#34d399", bg: "rgba(52,211,153,0.1)", label: "Yes" },
    maybe: { icon: <span style={{ fontSize: 10 }}>~</span>, color: "#f59e0b", bg: "rgba(245,158,11,0.10)", label: "Maybe" },
    no: { icon: <ThumbsDown size={10} />, color: "#f87171", bg: "rgba(248,113,113,0.1)", label: "No" },
    strong_no: { icon: <ThumbsDown size={10} />, color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "Strong No" },
  };
  const key = rec.toLowerCase().replace(/ /g, "_").replace(/-/g, "_");
  const cfg = map[key];
  if (!cfg) return <span className="text-xs" style={{ color: "var(--text-muted)" }}>{rec}</span>;
  return (
    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full w-fit"
      style={{ background: cfg.bg, color: cfg.color, fontFamily: "'Syne', sans-serif" }}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = status === "completed" ? { color: "var(--accent-green)", bg: "rgba(16,185,129,0.1)" }
    : status === "in_progress" ? { color: "var(--accent-cyan)", bg: "rgba(0,212,255,0.08)" }
    : { color: "var(--text-muted)", bg: "var(--bg-surface)" };
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
      style={{ background: cfg.bg, color: cfg.color, fontFamily: "'Syne', sans-serif" }}>
      {status.replace("_", " ")}
    </span>
  );
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Skeleton({ w = "100%", h = "16px" }: { w?: string; h?: string }) {
  return <div className="rounded animate-pulse" style={{ width: w, height: h, background: "var(--bg-surface)" }} />;
}

// ══════════════════════════════════════════════════════════════
export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "activity" | "settings">("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);

  // ── Auth guard: only admin users allowed ──────────────────
  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) { router.replace("/login"); return; }
    if (currentUser.role !== "admin") { router.replace("/dashboard"); return; }
  }, [router]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const d = await adminApi.dashboard();
      setData(d);
    } catch (e: unknown) {
      setError((e as Error).message || "Failed to load admin data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleUser = async (userId: string) => {
    setTogglingUser(userId);
    try {
      const res = await adminApi.toggleUserActive(userId);
      setData((prev) => prev ? { ...prev, users: prev.users.map((u) => u.id === userId ? { ...u, is_active: res.is_active } : u) } : prev);
    } catch (e: unknown) { alert((e as Error).message); }
    finally { setTogglingUser(null); }
  };

  const filteredUsers = (data?.users ?? []).filter(
    (u) => u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const stats = data?.stats;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      <Sidebar />
      <main className="lg:ml-[220px] pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 animate-fade-up">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge" style={{ background: "rgba(245,158,11,0.12)", color: "var(--accent-amber)" }}>Admin Panel</span>
              {refreshing && <span className="text-xs" style={{ color: "var(--text-muted)" }}>Refreshing…</span>}
            </div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>System Management</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Live platform analytics — users, interviews, results</p>
          </div>
          <button onClick={() => load(true)} disabled={refreshing} className="btn-ghost flex items-center gap-2 text-sm">
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl px-5 py-4 mb-6"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <AlertTriangle size={16} style={{ color: "var(--accent-red)" }} />
            <span className="text-sm" style={{ color: "var(--accent-red)" }}>{error}</span>
            <button onClick={() => load()} className="ml-auto text-xs underline" style={{ color: "var(--accent-red)" }}>Retry</button>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-up delay-100">
          {[
            { label: "Total Users", sub: stats ? `${stats.active_users} active` : "—", val: stats?.total_users ?? 0, icon: Users, color: "var(--accent-cyan)", spark: [12, 18, 14, 22, 19, 25, stats?.total_users ?? 0] },
            { label: "Total Interviews", sub: stats ? `${stats.completed_interviews} completed` : "—", val: stats?.total_interviews ?? 0, icon: Mic2, color: "#a78bfa", spark: [5, 9, 7, 11, 8, 14, stats?.total_interviews ?? 0] },
            { label: "Avg. Score", sub: stats ? `${stats.total_results} evaluations` : "—", val: stats?.avg_overall_score != null ? stats.avg_overall_score.toFixed(1) : "—", icon: TrendingUp, color: "var(--accent-green)", spark: [5, 6, 6.5, 7, 6.8, 7.2, stats?.avg_overall_score ?? 0] },
            { label: "Pending", sub: "Awaiting completion", val: stats?.pending_interviews ?? 0, icon: Clock, color: "var(--accent-amber)", spark: [2, 3, 1, 4, 2, 3, stats?.pending_interviews ?? 0] },
          ].map((s) => (
            <div key={s.label} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}18` }}>
                  <s.icon size={15} style={{ color: s.color }} />
                </div>
                <MiniBarChart data={s.spark} color={s.color} />
              </div>
              {loading ? <Skeleton w="60px" h="28px" /> : (
                <div className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>{s.val}</div>
              )}
              <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</div>
              <div className="text-xs mt-0.5" style={{ color: s.color }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg mb-6 w-fit animate-fade-up delay-200" style={{ background: "var(--bg-surface)" }}>
          {(["overview", "users", "activity", "settings"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-md text-sm font-semibold capitalize transition-all"
              style={{ fontFamily: "'Syne', sans-serif", background: activeTab === tab ? "var(--bg-elevated)" : "transparent", color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)", border: activeTab === tab ? "1px solid var(--border-bright)" : "1px solid transparent" }}>
              {tab}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <div className="animate-fade-in space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Award size={15} style={{ color: "var(--accent-cyan)" }} />
                  <h2 className="text-sm font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>Hire Recommendations</h2>
                </div>
                {loading ? <div className="flex gap-4"><Skeleton w="120px" h="120px" /><div className="flex-1 space-y-2">{[1,2,3,4].map(i=><Skeleton key={i} h="16px"/>)}</div></div>
                  : <HireDonut {...(stats?.hire_distribution ?? { strong_yes: 0, yes: 0, no: 0, strong_no: 0, pending: 0 })} />}
              </div>
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-5">
                  <BarChart2 size={15} style={{ color: "#a78bfa" }} />
                  <h2 className="text-sm font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>Interview Breakdown</h2>
                </div>
                {loading ? <div className="space-y-3">{[1,2,3].map(i=><Skeleton key={i} h="20px"/>)}</div> : (
                  <div className="space-y-4">
                    {[
                      { label: "Completed", value: stats?.completed_interviews ?? 0, color: "var(--accent-green)" },
                      { label: "Pending", value: stats?.pending_interviews ?? 0, color: "var(--accent-amber)" },
                      { label: "In Progress", value: Math.max(0, (stats?.total_interviews ?? 0) - (stats?.completed_interviews ?? 0) - (stats?.pending_interviews ?? 0)), color: "var(--accent-cyan)" },
                    ].map((item) => {
                      const pct = (stats?.total_interviews ?? 0) > 0 ? (item.value / (stats?.total_interviews ?? 1)) * 100 : 0;
                      return (
                        <div key={item.label}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                            <span style={{ color: item.color, fontFamily: "'Syne', sans-serif" }} className="font-bold">{item.value}</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-surface)" }}>
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: item.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Activity size={15} style={{ color: "var(--accent-green)" }} />
                  <h2 className="text-sm font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>Recent Activity</h2>
                </div>
                <button onClick={() => setActiveTab("activity")} className="text-xs" style={{ color: "var(--accent-cyan)" }}>View all →</button>
              </div>
              {loading ? <div className="space-y-3">{[1,2,3].map(i=><Skeleton key={i} h="48px"/>)}</div>
                : (data?.recent_activity ?? []).length === 0
                  ? <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>No activity yet.</p>
                  : <div className="space-y-2">{(data?.recent_activity ?? []).slice(0, 5).map((item) => <ActivityRowComp key={item.interview_id} item={item} />)}</div>}
            </div>
          </div>
        )}

        {/* ── Users Tab ── */}
        {activeTab === "users" && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-[320px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                <input type="text" placeholder="Search users…" className="input-field pl-9" value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: "9px 16px 9px 36px" }} />
              </div>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="card overflow-hidden">
              <div className="grid px-5 py-3 text-xs font-bold tracking-wide"
                style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-muted)", gridTemplateColumns: "2fr 1.8fr 80px 80px 90px 110px 90px", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}>
                <span>USER</span><span>EMAIL</span><span>ROLE</span><span>STATUS</span><span>INTERVIEWS</span><span>AVG SCORE</span><span>ACTIONS</span>
              </div>
              {loading ? <div className="p-5 space-y-3">{[1,2,3,4,5].map(i=><Skeleton key={i} h="40px"/>)}</div>
                : filteredUsers.length === 0 ? <div className="py-12 text-center" style={{ color: "var(--text-muted)" }}>No users found.</div>
                : filteredUsers.map((u, i) => (
                  <UserRowComp key={u.id} user={u} isLast={i === filteredUsers.length - 1} toggling={togglingUser === u.id} onToggle={() => toggleUser(u.id)} />
                ))}
            </div>
          </div>
        )}

        {/* ── Activity Tab ── */}
        {activeTab === "activity" && (
          <div className="animate-fade-in">
            <div className="card overflow-hidden">
              <div className="grid px-5 py-3 text-xs font-bold tracking-wide"
                style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-muted)", gridTemplateColumns: "2fr 1.5fr 1fr 90px 110px 100px", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}>
                <span>CANDIDATE</span><span>ROLE</span><span>STATUS</span><span>SCORE</span><span>HIRE REC</span><span>TIME</span>
              </div>
              {loading ? <div className="p-5 space-y-3">{[1,2,3,4,5].map(i=><Skeleton key={i} h="48px"/>)}</div>
                : (data?.recent_activity ?? []).length === 0
                  ? <div className="py-12 text-center" style={{ color: "var(--text-muted)" }}>No activity yet.</div>
                  : (data?.recent_activity ?? []).map((item, i) => (
                    <div key={item.interview_id} className="grid items-center px-5 py-4 hover:bg-white/[0.02] transition-colors"
                      style={{ gridTemplateColumns: "2fr 1.5fr 1fr 90px 110px 100px", borderBottom: i < (data?.recent_activity.length ?? 1) - 1 ? "1px solid var(--border)" : "none" }}>
                      <div>
                        <div className="text-sm font-semibold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>{item.user_name}</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>{item.user_email}</div>
                      </div>
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{item.role_title}</span>
                      <StatusBadge status={item.status} />
                      <ScoreBar score={item.overall_score} />
                      <HireBadge rec={item.hire_recommendation} />
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{relTime(item.created_at)}</span>
                    </div>
                  ))}
            </div>
          </div>
        )}

        {/* ── Settings Tab ── */}
        {activeTab === "settings" && (
          <div className="animate-fade-in max-w-2xl space-y-4">
            {[
              { title: "AI Model", desc: "OpenRouter model for question generation and evaluation", value: "claude-sonnet-4-20250514", type: "text" },
              { title: "Default Questions", desc: "Default number of questions per interview session", value: "5", type: "number" },
              { title: "Max Questions", desc: "Maximum allowed questions per session", value: "10", type: "number" },
              { title: "CORS Origin", desc: "Allowed frontend URL for cross-origin requests", value: "http://localhost:3000", type: "text" },
            ].map((s) => (
              <div key={s.title} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold mb-0.5" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>{s.title}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s.desc}</div>
                  </div>
                  <input type={s.type} defaultValue={s.value} className="input-field text-sm" style={{ width: "220px" }} />
                </div>
              </div>
            ))}
            <div className="rounded-xl p-5" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} style={{ color: "var(--accent-red)" }} />
                <span className="text-sm font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--accent-red)" }}>Danger Zone</span>
              </div>
              <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>These actions are irreversible.</p>
              <div className="flex gap-2">
                {["Clear All Interview Data", "Reset Platform"].map((label) => (
                  <button key={label} className="text-xs px-3 py-2 rounded-lg font-semibold"
                    style={{ fontFamily: "'Syne', sans-serif", background: "rgba(239,68,68,0.08)", color: "var(--accent-red)", border: "1px solid rgba(239,68,68,0.3)" }}>{label}</button>
                ))}
              </div>
            </div>
            <button className="btn-primary text-sm">Save Settings</button>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────
function ActivityRowComp({ item }: { item: ActivityItem }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/[0.02] transition-colors" style={{ border: "1px solid var(--border)" }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: "rgba(0,212,255,0.1)", color: "var(--accent-cyan)", fontFamily: "'Syne', sans-serif" }}>
        {item.user_name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}>{item.user_name}</span>
        <span className="text-xs mx-1.5" style={{ color: "var(--text-muted)" }}>·</span>
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{item.role_title}</span>
      </div>
      <StatusBadge status={item.status} />
      {item.overall_score != null && (
        <span className="text-xs font-bold" style={{ color: item.overall_score >= 8 ? "var(--accent-green)" : item.overall_score >= 6 ? "var(--accent-cyan)" : "var(--accent-red)", fontFamily: "'Syne', sans-serif" }}>
          {item.overall_score.toFixed(1)}
        </span>
      )}
      <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>{relTime(item.created_at)}</span>
    </div>
  );
}

function UserRowComp({ user, isLast, toggling, onToggle }: { user: AdminUserRow; isLast: boolean; toggling: boolean; onToggle: () => void }) {
  const joined = new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <div className="grid items-center px-5 py-4 hover:bg-white/[0.02] transition-colors"
      style={{ gridTemplateColumns: "2fr 1.8fr 80px 80px 90px 110px 90px", borderBottom: !isLast ? "1px solid var(--border)" : "none" }}>
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: user.role === "admin" ? "rgba(245,158,11,0.15)" : "rgba(0,212,255,0.1)", color: user.role === "admin" ? "var(--accent-amber)" : "var(--accent-cyan)", fontFamily: "'Syne', sans-serif" }}>
          {user.full_name[0]}
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>{user.full_name}</div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>Joined {joined}</div>
        </div>
      </div>
      <span className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>{user.email}</span>
      <span className="badge w-fit" style={{ background: user.role === "admin" ? "rgba(245,158,11,0.12)" : "rgba(0,212,255,0.08)", color: user.role === "admin" ? "var(--accent-amber)" : "var(--accent-cyan)" }}>{user.role}</span>
      <div>
        {user.is_active
          ? <div className="flex items-center gap-1 text-xs" style={{ color: "var(--accent-green)" }}><CheckCircle2 size={12} />Active</div>
          : <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}><XCircle size={12} />Inactive</div>}
      </div>
      <span className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
        {user.interview_count}{user.completed_count > 0 && <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>({user.completed_count}✓)</span>}
      </span>
      <ScoreBar score={user.avg_score} />
      <button onClick={onToggle} disabled={toggling} className="text-xs px-2 py-1 rounded-md transition-all font-semibold"
        style={{ fontFamily: "'Syne', sans-serif", background: user.is_active ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)", color: user.is_active ? "var(--accent-red)" : "var(--accent-green)", border: user.is_active ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(16,185,129,0.25)", opacity: toggling ? 0.5 : 1 }}>
        {toggling ? "…" : user.is_active ? "Deactivate" : "Activate"}
      </button>
    </div>
  );
}
