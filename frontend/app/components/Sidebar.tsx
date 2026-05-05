"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Mic2, BarChart3, Settings, LogOut,
  Shield, Zap, UserRound, Briefcase, Menu, X,
} from "lucide-react";
import { getUser, clearSession, UserOut } from "../../lib/api";
import { getHRSession, clearHRSession } from "../../lib/hr-auth";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserOut | null>(null);
  const [hrName, setHrName] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setUser(getUser());
    const hr = getHRSession();
    if (hr) setHrName(hr.name);
  }, []);

  // Close sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

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

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 mb-2 flex items-center justify-between">
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
        {/* Close button - mobile only */}
        <button className="lg:hidden p-1 rounded-lg" onClick={() => setMobileOpen(false)}
          style={{ color: "var(--text-muted)" }}>
          <X size={20} />
        </button>
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

      {/* Settings + Logout */}
      <div className="px-3 pb-3 space-y-1">
        <Link href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${pathname === "/settings" ? "nav-active" : "hover:bg-white/5"}`}
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, color: pathname === "/settings" ? "var(--accent-cyan)" : "var(--text-secondary)" }}>
          <Settings size={16} />
          Settings
        </Link>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full hover:bg-white/5 transition-all"
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, color: "var(--text-secondary)" }}>
          <LogOut size={16} />
          Sign out
        </button>
      </div>

      {/* User chip */}
      <div className="p-4 mx-3 mb-4 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "rgba(0,212,255,0.12)", color: "var(--accent-cyan)", fontFamily: "'Syne', sans-serif" }}>
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-primary)" }}>
              {displayName}
            </div>
            <div className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
              {displayRole}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile hamburger button ── */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={20} />
      </button>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile sidebar (slide in) ── */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-full w-[260px] z-50 transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "var(--bg-card)", borderRight: "1px solid var(--border)" }}
      >
        <SidebarContent />
      </aside>

      {/* ── Desktop sidebar (always visible) ── */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 h-full w-[220px] flex-col z-40"
        style={{ background: "var(--bg-card)", borderRight: "1px solid var(--border)" }}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
