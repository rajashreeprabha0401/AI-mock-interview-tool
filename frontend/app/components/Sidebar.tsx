"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Mic2, BarChart3, Settings, LogOut,
  Shield, Zap, UserRound, Briefcase,
} from "lucide-react";
import { getUser, clearSession, UserOut } from "../../lib/api";
import { getHRSession, clearHRSession } from "../../lib/hr-auth";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserOut | null>(null);
  const [hrName, setHrName] = useState<string | null>(null);

  useEffect(() => {
    setUser(getUser());
    const hr = getHRSession();
    if (hr) setHrName(hr.name);
  }, []);

  const handleLogout = () => {
    clearSession();
    clearHRSession();
    router.push("/login");
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/interview", label: "Interview", icon: Mic2 },
    { href: "/results", label: "Results", icon: BarChart3 },
    { href: "/hr-login", label: "HR Portal", icon: Briefcase },
    ...(user?.role === "admin" || user?.role === "hr"
      ? [{ href: "/hr-dashboard", label: "HR Dashboard", icon: UserRound }]
      : []),
    ...(user?.role === "admin"
      ? [{ href: "/admin", label: "Admin", icon: Shield }]
      : []),
  ];

  const displayName = user?.full_name || hrName || "Guest";
  const displayRole = user?.role || (hrName ? "hr" : "—");
  const initials = displayName !== "Guest"
    ? displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <aside className="fixed left-0 top-0 h-full w-[220px] flex flex-col z-40"
      style={{ background: "var(--bg-card)", borderRight: "1px solid var(--border)" }}>
      <div className="p-6 mb-2">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent-cyan)", boxShadow: "var(--glow-cyan)" }}>
            <Zap size={16} color="var(--bg-deep)" strokeWidth={2.5} />
          </div>
          <span className="text-base font-bold"
            style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
            InterviewAI
          </span>
        </Link>
      </div>

      <div className="px-5 mb-3">
        <span className="text-[10px] font-bold tracking-widest uppercase"
          style={{ color: "var(--text-muted)" }}>Navigation</span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? "nav-active" : "hover:bg-white/5"}`}
              style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 600,
                color: active ? "var(--accent-cyan)" : "var(--text-secondary)",
              }}>
              <Icon size={16} strokeWidth={active ? 2 : 1.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 space-y-1" style={{ borderTop: "1px solid var(--border)" }}>
        <Link href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full hover:bg-white/5 transition-all ${pathname === "/settings" ? "nav-active" : ""}`}
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, color: pathname === "/settings" ? "var(--accent-cyan)" : "var(--text-secondary)", textDecoration: "none" }}>
          <Settings size={16} strokeWidth={pathname === "/settings" ? 2 : 1.5} />
          Settings
        </Link>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full hover:bg-red-500/10 transition-all"
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, color: "var(--text-muted)" }}>
          <LogOut size={16} strokeWidth={1.5} />
          Sign out
        </button>
        <div className="mt-3 flex items-center gap-2.5 px-2 py-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "rgba(0,212,255,0.15)", color: "var(--accent-cyan)" }}>
            {initials}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-semibold truncate"
              style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
              {displayName}
            </div>
            <div className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
              {displayRole}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
