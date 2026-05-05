"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import {
  admin as adminApi,
  AdminDashboardData,
  ActivityItem,
  getUser,
} from "../../lib/api";
import { getHRSession } from "../../lib/hr-auth";
import {
  Users,
  Search,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertTriangle,
  Filter,
  Download,
  Award,
  Minus,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────
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

// ── Score ring ─────────────────────────────────────────────────
function ScoreRing({ score }: { score: number | null }) {
  if (score === null) return (
    <div className="flex items-center justify-center w-10 h-10">
      <Minus size={14} style={{ color: "var(--text-muted)" }} />
    </div>
  );
  const color = score >= 8 ? "#10b981" : score >= 6 ? "#00d4ff" : "#ef4444";
  const pct = (score / 10) * 100;
  const r = 16, c = 20, stroke = 3;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative flex items-center justify-center w-10 h-10">
      <svg width="40" height="40" style={{ transform: "rotate(-90deg)" }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--bg-surface)" strokeWidth={stroke} />
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute text-[10px] font-bold" style={{ color, fontFamily: "'Syne', sans-serif" }}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

// ── Hire badge ─────────────────────────────────────────────────
const HIRE_MAP: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  strong_yes: { icon: <ThumbsUp size={11} />, color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "Strong Yes" },
  yes: { icon: <ThumbsUp size={11} />, color: "#34d399", bg: "rgba(52,211,153,0.10)", label: "Yes" },
  maybe: { icon: <Minus size={11} />, color: "#f59e0b", bg: "rgba(245,158,11,0.10)", label: "Maybe" },
  no: { icon: <ThumbsDown size={11} />, color: "#f87171", bg: "rgba(248,113,113,0.10)", label: "No" },
  strong_no: { icon: <ThumbsDown size={11} />, color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "Strong No" },
};

function HireBadge({ rec }: { rec: string | null }) {
  if (!rec) return (
    <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
      style={{ background: "var(--bg-surface)", color: "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}>
      Pending
    </span>
  );
  const key = rec.toLowerCase().replace(/[\s-]/g, "_");
  const cfg = HIRE_MAP[key];
  if (!cfg) return <span className="text-xs" style={{ color: "var(--text-muted)" }}>{rec}</span>;
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit"
      style={{ background: cfg.bg, color: cfg.color, fontFamily: "'Syne', sans-serif" }}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

// ── Status badge ───────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = status === "completed"
    ? { color: "var(--accent-green)", bg: "rgba(16,185,129,0.1)", icon: <CheckCircle2 size={11} /> }
    : status === "in_progress"
    ? { color: "var(--accent-cyan)", bg: "rgba(0,212,255,0.08)", icon: <Clock size={11} /> }
    : { color: "var(--text-muted)", bg: "var(--bg-surface)", icon: <Clock size={11} /> };
  return (
    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full w-fit capitalize"
      style={{ background: cfg.bg, color: cfg.color, fontFamily: "'Syne', sans-serif" }}>
      {cfg.icon}{status.replace("_", " ")}
    </span>
  );
}

// ── Summary stat card ──────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color }}>{sub}</div>}
    </div>
  );
}

// ── Filter pill ────────────────────────────────────────────────
function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{
        fontFamily: "'Syne', sans-serif",
        background: active ? "rgba(0,212,255,0.12)" : "var(--bg-surface)",
        color: active ? "var(--accent-cyan)" : "var(--text-muted)",
        border: active ? "1px solid rgba(0,212,255,0.3)" : "1px solid var(--border)",
      }}
    >
      {label}
    </button>
  );
}

// ── Export helper (CSV) ────────────────────────────────────────
function exportCSV(items: ActivityItem[]) {
  const header = ["Candidate", "Email", "Role", "Status", "Score", "Hire Recommendation", "Date"];
  const rows = items.map((r) => [
    r.user_name,
    r.user_email,
    r.role_title,
    r.status,
    r.overall_score?.toString() ?? "",
    r.hire_recommendation ?? "pending",
    r.created_at,
  ]);
  const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `candidates-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════
const REC_FILTERS = ["All", "Strong Yes", "Yes", "Maybe", "No", "Strong No", "Pending"] as const;
type RecFilter = (typeof REC_FILTERS)[number];

export default function HRDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [recFilter, setRecFilter] = useState<RecFilter>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Completed" | "In Progress">("All");
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "score" | "name">("date");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    const u = getUser();
    const hr = getHRSession();
    // Allow: admin users OR HR portal session holders
    if (!u && !hr) { router.replace("/hr-login"); return; }
    if (u && u.role !== "admin" && !hr) { router.replace("/dashboard"); return; }
  }, [router]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const d = await adminApi.dashboard();
      setData(d);
    } catch (e: unknown) {
      setError((e as Error).message || "Failed to load HR data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const candidates = data?.recent_activity ?? [];

  // Apply filters
  const filtered = candidates.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.user_name.toLowerCase().includes(q) || c.user_email.toLowerCase().includes(q) || c.role_title.toLowerCase().includes(q);

    const recKey = c.hire_recommendation?.toLowerCase().replace(/[\s-]/g, "_") ?? null;
    const matchRec = recFilter === "All"
      || (recFilter === "Pending" && !recKey)
      || HIRE_MAP[recKey ?? ""]?.label === recFilter;

    const matchStatus = statusFilter === "All"
      || (statusFilter === "Completed" && c.status === "completed")
      || (statusFilter === "In Progress" && c.status === "in_progress");

    return matchSearch && matchRec && matchStatus;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "date") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    else if (sortBy === "score") cmp = (a.overall_score ?? -1) - (b.overall_score ?? -1);
    else cmp = a.user_name.localeCompare(b.user_name);
    return sortDir === "desc" ? -cmp : cmp;
  });

  const stats = data?.stats;
  const hireYes = (stats?.hire_distribution.strong_yes ?? 0) + (stats?.hire_distribution.yes ?? 0);
  const hireNo = (stats?.hire_distribution.no ?? 0) + (stats?.hire_distribution.strong_no ?? 0);
  const hireRate = hireYes + hireNo > 0 ? Math.round((hireYes / (hireYes + hireNo)) * 100) : null;

  function toggleSort(col: "date" | "score" | "name") {
    if (sortBy === col) setSortDir((d) => d === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  }

  const SortIndicator = ({ col }: { col: "date" | "score" | "name" }) => (
    <span style={{ color: sortBy === col ? "var(--accent-cyan)" : "transparent", marginLeft: "4px" }}>
      {sortBy === col ? (sortDir === "desc" ? "↓" : "↑") : "↕"}
    </span>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      <Sidebar />

      <main className="lg:ml-[220px] pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 animate-fade-up">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge" style={{ background: "rgba(16,185,129,0.12)", color: "var(--accent-green)" }}>
                HR Portal
              </span>
              {refreshing && <span className="text-xs" style={{ color: "var(--text-muted)" }}>Refreshing…</span>}
            </div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
              Candidate Dashboard
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              All candidates · Scores · Hire / No-Hire recommendations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCSV(sorted)}
              className="btn-ghost flex items-center gap-2 text-sm"
            >
              <Download size={13} /> Export CSV
            </button>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="btn-ghost flex items-center gap-2 text-sm"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
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

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-up delay-100">
          <StatCard
            label="Total Candidates"
            value={loading ? "…" : stats?.total_users ?? 0}
            icon={Users}
            color="var(--accent-cyan)"
            sub={stats ? `${stats.active_users} active` : undefined}
          />
          <StatCard
            label="Completed Interviews"
            value={loading ? "…" : stats?.completed_interviews ?? 0}
            icon={CheckCircle2}
            color="var(--accent-green)"
            sub={stats ? `${stats.total_interviews} total` : undefined}
          />
          <StatCard
            label="Hire Rate"
            value={loading ? "…" : hireRate !== null ? `${hireRate}%` : "—"}
            icon={Award}
            color="#a78bfa"
            sub={hireRate !== null ? `${hireYes} recommended` : "No data yet"}
          />
          <StatCard
            label="Avg. Score"
            value={loading ? "…" : stats?.avg_overall_score != null ? stats.avg_overall_score.toFixed(1) : "—"}
            icon={TrendingUp}
            color="var(--accent-amber)"
            sub={stats ? `${stats.total_results} evaluations` : undefined}
          />
        </div>

        {/* Hire summary strip */}
        {!loading && stats && (
          <div className="card p-4 mb-6 animate-fade-up delay-200">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={13} style={{ color: "var(--text-muted)" }} />
              <span className="text-xs font-bold tracking-wide uppercase" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-muted)" }}>
                Recommendation Breakdown
              </span>
            </div>
            <div className="flex gap-3 flex-wrap">
              {[
                { key: "strong_yes", label: "Strong Yes", value: stats.hire_distribution.strong_yes, color: "#10b981" },
                { key: "yes",        label: "Yes",        value: stats.hire_distribution.yes,        color: "#34d399" },
                { key: "pending",    label: "Pending",    value: stats.hire_distribution.pending,    color: "var(--text-muted)" },
                { key: "no",         label: "No",         value: stats.hire_distribution.no,         color: "#f87171" },
                { key: "strong_no",  label: "Strong No",  value: stats.hire_distribution.strong_no,  color: "#ef4444" },
              ].map((seg) => (
                <div key={seg.key} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--bg-surface)" }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: seg.color }} />
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{seg.label}</span>
                  <span className="text-xs font-bold" style={{ color: seg.color, fontFamily: "'Syne', sans-serif" }}>{seg.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters & search */}
        <div className="flex items-start justify-between gap-4 mb-4 animate-fade-up delay-300">
          <div className="flex flex-col gap-3 flex-1">
            {/* Search */}
            <div className="relative max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search by name, email or role…"
                className="input-field pl-9 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ padding: "9px 16px 9px 36px" }}
              />
            </div>
            {/* Filter pills */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs self-center" style={{ color: "var(--text-muted)" }}>Hire rec:</span>
              {REC_FILTERS.map((f) => (
                <FilterPill key={f} label={f} active={recFilter === f} onClick={() => setRecFilter(f)} />
              ))}
              <span className="text-xs self-center ml-3" style={{ color: "var(--text-muted)" }}>Status:</span>
              {(["All", "Completed", "In Progress"] as const).map((f) => (
                <FilterPill key={f} label={f} active={statusFilter === f} onClick={() => setStatusFilter(f)} />
              ))}
            </div>
          </div>
          <div className="text-xs pt-2 flex-shrink-0" style={{ color: "var(--text-muted)" }}>
            {sorted.length} candidate{sorted.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden animate-fade-up delay-300">
          {/* Table header */}
          <div
            className="grid px-6 py-3 text-xs font-bold tracking-wide"
            style={{
              fontFamily: "'Syne', sans-serif",
              color: "var(--text-muted)",
              gridTemplateColumns: "2.2fr 1.6fr 1.4fr 80px 130px 110px 90px",
              borderBottom: "1px solid var(--border)",
              background: "var(--bg-surface)",
            }}
          >
            <button className="text-left flex items-center" onClick={() => toggleSort("name")}>
              CANDIDATE <SortIndicator col="name" />
            </button>
            <span>EMAIL</span>
            <span>ROLE</span>
            <span>STATUS</span>
            <button className="text-left flex items-center" onClick={() => toggleSort("score")}>
              SCORE <SortIndicator col="score" />
            </button>
            <span>RECOMMENDATION</span>
            <button className="text-left flex items-center" onClick={() => toggleSort("date")}>
              DATE <SortIndicator col="date" />
            </button>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h="52px" />)}
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {candidates.length === 0 ? "No interview data yet." : "No candidates match your filters."}
              </p>
              {candidates.length > 0 && (
                <button className="text-xs mt-2" style={{ color: "var(--accent-cyan)" }}
                  onClick={() => { setSearch(""); setRecFilter("All"); setStatusFilter("All"); }}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            sorted.map((c, i) => (
              <CandidateRow
                key={c.interview_id}
                item={c}
                isLast={i === sorted.length - 1}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}

// ── Candidate row ──────────────────────────────────────────────
function CandidateRow({ item, isLast }: { item: ActivityItem; isLast: boolean }) {
  const initial = item.user_name[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="grid items-center px-6 py-4 hover:bg-white/[0.02] transition-colors"
      style={{
        gridTemplateColumns: "2.2fr 1.6fr 1.4fr 80px 130px 110px 90px",
        borderBottom: !isLast ? "1px solid var(--border)" : "none",
      }}
    >
      {/* Candidate */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: "rgba(0,212,255,0.1)", color: "var(--accent-cyan)", fontFamily: "'Syne', sans-serif" }}
        >
          {initial}
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
            {item.user_name}
          </div>
        </div>
      </div>

      {/* Email */}
      <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{item.user_email}</span>

      {/* Role */}
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{item.role_title}</span>

      {/* Status */}
      <StatusBadge status={item.status} />

      {/* Score ring */}
      <div className="flex items-center gap-2">
        <ScoreRing score={item.overall_score} />
        {item.overall_score !== null && (
          <div className="h-1.5 rounded-full flex-1 max-w-[40px]" style={{ background: "var(--bg-surface)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.overall_score / 10) * 100}%`,
                background: item.overall_score >= 8 ? "#10b981" : item.overall_score >= 6 ? "#00d4ff" : "#ef4444",
              }}
            />
          </div>
        )}
      </div>

      {/* Hire badge */}
      <HireBadge rec={item.hire_recommendation} />

      {/* Date */}
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{relTime(item.created_at)}</span>
    </div>
  );
}
