import type { Analysis, Decision } from "@/lib/job-types";

export type StablePhase = "verdict" | "dashboard" | "decision";

export interface StoredAnalysisSession {
  phase: StablePhase;
  company: string;
  role: string;
  analysis: Analysis;
  decision: Decision | null;
}

const STORAGE_KEY = "career-capital-session-v1";

function isStablePhase(value: unknown): value is StablePhase {
  return value === "verdict" || value === "dashboard" || value === "decision";
}

export function loadStoredAnalysisSession(): StoredAnalysisSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredAnalysisSession> | null;
    if (
      !parsed ||
      !isStablePhase(parsed.phase) ||
      typeof parsed.company !== "string" ||
      typeof parsed.role !== "string" ||
      !parsed.analysis ||
      typeof parsed.analysis !== "object"
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      phase: parsed.phase === "decision" && !parsed.decision ? "dashboard" : parsed.phase,
      company: parsed.company,
      role: parsed.role,
      analysis: parsed.analysis as Analysis,
      decision: parsed.decision ?? null,
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveStoredAnalysisSession(session: StoredAnalysisSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredAnalysisSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
