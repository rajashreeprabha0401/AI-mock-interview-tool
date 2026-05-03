// ── HR Portal session utilities ────────────────────────────────
export const HR_SESSION_KEY = "hr_session";
export const HR_PASSWORD_KEY = "hr_password";
export const DEFAULT_HR_PASSWORD = "hr2024";

export interface HRSession {
  name: string;
  role: "hr";
  loginAt: string;
}

export function saveHRSession(name: string): void {
  if (typeof window === "undefined") return;
  const session: HRSession = { name, role: "hr", loginAt: new Date().toISOString() };
  localStorage.setItem(HR_SESSION_KEY, JSON.stringify(session));
}

export function getHRSession(): HRSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(HR_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearHRSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HR_SESSION_KEY);
}

export function getHRPassword(): string {
  if (typeof window === "undefined") return DEFAULT_HR_PASSWORD;
  return localStorage.getItem(HR_PASSWORD_KEY) || DEFAULT_HR_PASSWORD;
}

export function setHRPassword(password: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HR_PASSWORD_KEY, password);
}
