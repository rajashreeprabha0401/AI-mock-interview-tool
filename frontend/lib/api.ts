const BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

// Read the API key the user configured in Settings
function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("api_key") || null;
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const apiKey = getApiKey();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Send the user-configured API key so the backend can use it
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
      ...(opts.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Auth ─────────────────────────────────────────────────────
export interface UserOut {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserOut;
}

export const auth = {
  register: (data: { full_name: string; email: string; password: string }) =>
    req<UserOut>("/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    req<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
};

// ── Roles ─────────────────────────────────────────────────────
export interface Role {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  description?: string;
}

export const roles = {
  list: () => req<Role[]>("/roles/"),
};

// ── Interview ─────────────────────────────────────────────────
export interface StartInterviewResponse {
  interview_id: string;
  role: string;
  difficulty: string;
  total_questions: number;
  status: string;
  started_at: string;
}

export interface QuestionResponse {
  question_id: string;
  question_text: string;
  question_type: string;
  order_index: number;
  interview_id: string;
}

export interface SubmitAnswerResponse {
  answer_id: string;
  message: string;
  questions_answered: number;
  total_questions: number;
  is_complete: boolean;
}

export interface ResultOut {
  id: string;
  answer_id: string;
  score: number | null;
  relevance_score: number | null;
  clarity_score: number | null;
  depth_score: number | null;
  feedback: string | null;
  ideal_answer: string | null;
  strengths: string[] | null;
  improvements: string[] | null;
  question_text: string | null;
  answer_text: string | null;
}

export interface InterviewResultsResponse {
  interview_id: string;
  role: string;
  status: string;
  total_questions: number;
  started_at: string;
  completed_at: string | null;
  overall_score: number | null;
  overall_feedback: string | null;
  hire_recommendation: string | null;
  results: ResultOut[];
}

export const interview = {
  start: (data: { role_id: string; total_questions: number }) =>
    req<StartInterviewResponse>("/interview/start-interview", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  generateQuestion: (data: { interview_id: string; question_number: number }) =>
    req<QuestionResponse>("/interview/generate-question", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  submitAnswer: (data: {
    interview_id: string;
    question_id: string;
    answer_text: string;
    time_taken_sec?: number;
  }) =>
    req<SubmitAnswerResponse>("/interview/submit-answer", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getResults: (interview_id: string) =>
    req<InterviewResultsResponse>(`/interview/get-results/${interview_id}`),

  getUserStats: () => req<UserStats>("/interview/user-stats"),
};

// ── User Stats (dashboard) ────────────────────────────────────
export interface RecentInterview {
  interview_id: string;
  role: string;
  total_questions: number;
  completed_at: string | null;
  overall_score: number | null;
}

export interface UserStats {
  total_interviews: number;
  avg_score: number | null;
  best_score: number | null;
  weekly_count: number;
  streak: number;
  recent_interviews: RecentInterview[];
}

// ── Helpers ───────────────────────────────────────────────────
export function saveSession(token: string, user: UserOut) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function getUser(): UserOut | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function updateUserLocally(patch: Partial<UserOut>) {
  const current = getUser();
  if (!current) return;
  const updated = { ...current, ...patch };
  localStorage.setItem("user", JSON.stringify(updated));
  return updated;
}

// ── Profile ───────────────────────────────────────────────────
export const profile = {
  update: (data: { full_name: string }) =>
    req<UserOut>("/auth/me", { method: "PATCH", body: JSON.stringify(data) }),
};

// ── Admin ─────────────────────────────────────────────────────
export interface HireDistribution {
  strong_yes: number;
  yes: number;
  no: number;
  strong_no: number;
  pending: number;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  total_interviews: number;
  completed_interviews: number;
  pending_interviews: number;
  avg_overall_score: number | null;
  hire_distribution: HireDistribution;
  total_results: number;
}

export interface AdminUserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  interview_count: number;
  completed_count: number;
  avg_score: number | null;
}

export interface ActivityItem {
  interview_id: string;
  user_name: string;
  user_email: string;
  role_title: string;
  status: string;
  overall_score: number | null;
  overall_feedback: string | null;
  hire_recommendation: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface AdminDashboardData {
  stats: AdminStats;
  users: AdminUserRow[];
  recent_activity: ActivityItem[];
}

export const admin = {
  dashboard: () => req<AdminDashboardData>("/admin/dashboard"),
  toggleUserActive: (userId: string) =>
    req<{ id: string; is_active: boolean }>(`/admin/users/${userId}/toggle-active`, {
      method: "PATCH",
    }),
};
