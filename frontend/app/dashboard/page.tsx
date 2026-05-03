"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import { getUser, interview as interviewApi, UserStats, roles as rolesApi, Role } from "../../lib/api";
import {
  Mic2,
  TrendingUp,
  Target,
  ChevronRight,
  Play,
  Star,
  Flame,
  Trophy,
  ArrowUpRight,
  Loader2,
} from "lucide-react";

const difficultyColors: Record<string, string> = {
  easy: "var(--accent-green)",
  medium: "var(--accent-amber)",
  hard: "var(--accent-red)",
};

const roleEmojis: Record<string, string> = {
  Frontend: "⚛️", Backend: "🔧", Management: "📊", Data: "🧮",
  Infrastructure: "⚙️", Design: "🎨", Default: "💼",
};

function getDynamicDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatRelativeTime(isoDate: string | null): string {
  if (!isoDate) return "—";
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("there");
  const [stats, setStats] = useState<UserStats | null>(null);
  const [roleList, setRoleList] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace("/login"); return; }
    setUserName(u.full_name.split(" ")[0]);

    Promise.allSettled([
      interviewApi.getUserStats(),
      rolesApi.list(),
    ])
      .then(([statsResult, rolesResult]) => {
        if (statsResult.status === "fulfilled") setStats(statsResult.value);
        if (rolesResult.status === "fulfilled") {
          // Deduplicate by id in case backend returns duplicate roles
          const seen = new Set<string>();
          const unique = rolesResult.value.filter((r) => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
          });
          setRoleList(unique);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const totalInterviews = stats?.total_interviews ?? 0;
  const avgScore = stats?.avg_score != null ? stats.avg_score.toFixed(1) : "—";
  const bestScore = stats?.best_score != null ? stats.best_score.toFixed(1) : "—";
  const streak = stats?.streak ?? 0;
  const weeklyCount = stats?.weekly_count ?? 0;
  const recentInterviews = stats?.recent_interviews ?? [];
  const weeklyGoal = 5;
  const weeklyProgress = Math.min(weeklyCount / weeklyGoal, 1);

  const statCards = [
    {
      label: "Total Interviews",
      value: loading ? "…" : String(totalInterviews),
      delta: weeklyCount > 0 ? `+${weeklyCount} this week` : "None yet",
      up: weeklyCount > 0,
      icon: Mic2,
      color: "var(--accent-cyan)",
    },
    {
      label: "Avg. Score",
      value: loading ? "…" : avgScore,
      delta: avgScore === "—" ? "No scores yet" : "Overall average",
      up: null as boolean | null,
      icon: TrendingUp,
      color: "var(--accent-green)",
    },
    {
      label: "Day Streak",
      value: loading ? "…" : String(streak),
      delta: streak > 0 ? `${streak}-day streak 🔥` : "Start today!",
      up: streak > 0,
      icon: Flame,
      color: "var(--accent-amber)",
    },
    {
      label: "Best Score",
      value: loading ? "…" : bestScore,
      delta: bestScore === "—" ? "No scores yet" : "Personal best",
      up: null as boolean | null,
      icon: Trophy,
      color: "#a78bfa",
    },
  ];

  const achievements = [
    {
      icon: "🔥",
      title: "On Fire",
      desc: `${streak}-day streak`,
      earned: streak >= 3,
    },
    {
      icon: "⭐",
      title: "High Scorer",
      desc: "Score 9+ once",
      earned: (stats?.best_score ?? 0) >= 9,
    },
    {
      icon: "🎯",
      title: "Consistent",
      desc: "10 interviews",
      earned: totalInterviews >= 10,
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      <Sidebar />

      <main className="ml-0 md:ml-[220px] p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 animate-fade-up">
          <div>
            <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
              {getDynamicDate()}
            </p>
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
            >
              {getTimeGreeting()}, {userName}{" "}
              <span className="font-serif italic" style={{ color: "var(--accent-cyan)" }}>
                👋
              </span>
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {streak > 0 ? (
                <>
                  Ready to ace your next interview? You&apos;re on a{" "}
                  <span style={{ color: "var(--accent-amber)" }} className="font-semibold">
                    {streak}-day streak
                  </span>{" "}
                  🔥
                </>
              ) : (
                "Ready to ace your next interview? Start your streak today! 🚀"
              )}
            </p>
          </div>

          <Link
            href="/interview"
            className="btn-primary flex items-center gap-2"
            style={{ textDecoration: "none" }}
          >
            <Play size={15} />
            New Interview
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => (
            <div
              key={s.label}
              className="card p-5 animate-fade-up"
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: `${s.color}18` }}
                >
                  <s.icon size={17} style={{ color: s.color }} />
                </div>
                {s.up !== null && (
                  <span
                    className="text-xs font-semibold flex items-center gap-0.5"
                    style={{
                      color: s.up ? "var(--accent-green)" : "var(--accent-red)",
                      fontFamily: "'Syne', sans-serif",
                    }}
                  >
                    <ArrowUpRight size={12} />
                  </span>
                )}
              </div>
              <div
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
              >
                {s.value}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {s.label}
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: s.up ? "var(--accent-green)" : "var(--text-muted)" }}
              >
                {s.delta}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Choose Role */}
            <div className="animate-fade-up delay-200">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-base font-bold"
                  style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
                >
                  Pick a Role to Practice
                </h2>
                <Link
                  href="/interview"
                  className="text-xs flex items-center gap-1 transition-colors"
                  style={{ color: "var(--accent-cyan)", textDecoration: "none" }}
                >
                  View all <ChevronRight size={13} />
                </Link>
              </div>

              {loading ? (
                <div className="card p-6 flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
                  <Loader2 size={16} className="animate-spin mr-2" /> Loading roles…
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {roleList.slice(0, 6).map((role) => (
                    <Link
                      key={role.id}
                      href="/interview"
                      className="card p-4 group hover:border-[var(--border-bright)] transition-all hover:-translate-y-0.5 cursor-pointer"
                      style={{ textDecoration: "none" }}
                    >
                      <div className="text-xl mb-2">{roleEmojis[role.category] || roleEmojis.Default}</div>
                      <div
                        className="text-sm font-semibold mb-1 group-hover:text-[var(--accent-cyan)] transition-colors"
                        style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
                      >
                        {role.title}
                      </div>
                      <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                        {role.category}
                      </div>
                      <span
                        className="badge"
                        style={{
                          background: `${difficultyColors[role.difficulty]}18`,
                          color: difficultyColors[role.difficulty],
                        }}
                      >
                        {role.difficulty}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Interviews */}
            <div className="animate-fade-up delay-300">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-base font-bold"
                  style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
                >
                  Recent Interviews
                </h2>
                <Link
                  href="/results"
                  className="text-xs flex items-center gap-1 transition-colors"
                  style={{ color: "var(--accent-cyan)", textDecoration: "none" }}
                >
                  View all <ChevronRight size={13} />
                </Link>
              </div>

              <div className="card overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-8" style={{ color: "var(--text-muted)" }}>
                    <Loader2 size={16} className="animate-spin mr-2" /> Loading…
                  </div>
                ) : recentInterviews.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                    No completed interviews yet.{" "}
                    <Link href="/interview" style={{ color: "var(--accent-cyan)", textDecoration: "none" }}>
                      Start your first one!
                    </Link>
                  </div>
                ) : (
                  recentInterviews.map((iv, i) => (
                    <Link
                      key={iv.interview_id}
                      href={`/results?id=${iv.interview_id}`}
                      className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                      style={{
                        textDecoration: "none",
                        borderBottom:
                          i < recentInterviews.length - 1
                            ? "1px solid var(--border)"
                            : "none",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-sm"
                          style={{ background: "var(--bg-surface)" }}
                        >
                          <Mic2 size={15} style={{ color: "var(--accent-cyan)" }} />
                        </div>
                        <div>
                          <div
                            className="text-sm font-semibold"
                            style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
                          >
                            {iv.role}
                          </div>
                          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {iv.total_questions} questions • {formatRelativeTime(iv.completed_at)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div
                          className="text-lg font-bold"
                          style={{
                            fontFamily: "'Syne', sans-serif",
                            color:
                              iv.overall_score == null
                                ? "var(--text-muted)"
                                : iv.overall_score >= 8
                                ? "var(--accent-green)"
                                : iv.overall_score >= 6
                                ? "var(--accent-amber)"
                                : "var(--accent-red)",
                          }}
                        >
                          {iv.overall_score != null ? iv.overall_score : "—"}
                          <span className="text-xs ml-0.5" style={{ color: "var(--text-muted)" }}>
                            /10
                          </span>
                        </div>
                        <ChevronRight size={15} style={{ color: "var(--text-muted)" }} />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Weekly Goal */}
            <div
              className="card p-5 animate-fade-up delay-100"
              style={{
                background: "linear-gradient(135deg, rgba(0,212,255,0.06) 0%, var(--bg-card) 60%)",
                borderColor: "rgba(0,212,255,0.2)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Target size={15} style={{ color: "var(--accent-cyan)" }} />
                <span
                  className="text-sm font-bold"
                  style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
                >
                  Weekly Goal
                </span>
              </div>

              <div className="text-center py-4">
                <div
                  className="text-4xl font-bold"
                  style={{ fontFamily: "'Syne', sans-serif", color: "var(--accent-cyan)" }}
                >
                  {weeklyCount}
                  <span className="text-xl" style={{ color: "var(--text-muted)" }}>
                    /{weeklyGoal}
                  </span>
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  interviews this week
                </div>
              </div>

              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ background: "var(--bg-surface)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${weeklyProgress * 100}%`,
                    background: "linear-gradient(90deg, var(--accent-cyan), #4fc3f7)",
                    boxShadow: "0 0 12px rgba(0,212,255,0.4)",
                  }}
                />
              </div>

              <div className="text-xs mt-2 text-right" style={{ color: "var(--text-muted)" }}>
                {weeklyCount >= weeklyGoal
                  ? "Goal reached! 🎉"
                  : `${weeklyGoal - weeklyCount} more to hit your goal`}
              </div>
            </div>

            {/* Achievements */}
            <div className="card p-5 animate-fade-up delay-200">
              <div className="flex items-center gap-2 mb-4">
                <Star size={15} style={{ color: "var(--accent-amber)" }} />
                <span
                  className="text-sm font-bold"
                  style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
                >
                  Achievements
                </span>
              </div>

              {achievements.map((ach) => (
                <div
                  key={ach.title}
                  className="flex items-center gap-3 py-2.5"
                  style={{ opacity: ach.earned ? 1 : 0.4 }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    style={{ background: "var(--bg-surface)" }}
                  >
                    {ach.icon}
                  </div>
                  <div>
                    <div
                      className="text-xs font-semibold"
                      style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}
                    >
                      {ach.title}
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {ach.desc}
                    </div>
                  </div>
                  {ach.earned && (
                    <div className="ml-auto">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: "var(--accent-green)" }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Tip */}
            <div
              className="rounded-xl p-4 animate-fade-up delay-300"
              style={{
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              <div className="flex gap-2">
                <Flame size={15} style={{ color: "var(--accent-amber)", flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div
                    className="text-xs font-bold mb-1"
                    style={{ fontFamily: "'Syne', sans-serif", color: "var(--accent-amber)" }}
                  >
                    Pro Tip
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    Use the STAR method — Situation, Task, Action, Result — for behavioral questions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}




