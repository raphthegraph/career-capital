import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Landing } from "@/components/Landing";
import { AnalysisRunner } from "@/components/AnalysisRunner";
import { VerdictReveal } from "@/components/VerdictReveal";
import { AnalysisDashboard } from "@/components/AnalysisDashboard";
import { Recommendations } from "@/components/Recommendations";
import type { Analysis, Decision } from "@/lib/job-types";
import { toast } from "sonner";
import {
  clearStoredAnalysisSession,
  loadStoredAnalysisSession,
  saveStoredAnalysisSession,
} from "@/lib/analysis-session";

type Phase = "landing" | "analyzing" | "verdict" | "dashboard" | "decision";

const MOTION_STORAGE_KEY = "$job-motion-enabled-v2";
const MIN_ANALYSIS_VISIBLE_MS = 5800;

function loadMotionPreference() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(MOTION_STORAGE_KEY) !== "false";
}

export default function Index() {
  const restoredSession = useMemo(() => loadStoredAnalysisSession(), []);
  const [phase, setPhase] = useState<Phase>(restoredSession?.phase ?? "landing");
  const [company, setCompany] = useState(restoredSession?.company ?? "");
  const [role, setRole] = useState(restoredSession?.role ?? "");
  const [analysis, setAnalysis] = useState<Analysis | null>(restoredSession?.analysis ?? null);
  const [networkDone, setNetworkDone] = useState(Boolean(restoredSession?.analysis));
  const [decision, setDecision] = useState<Decision | null>(restoredSession?.decision ?? null);
  const [animationsEnabled, setAnimationsEnabled] = useState(loadMotionPreference);
  const [verdictCanContinue, setVerdictCanContinue] = useState(
    restoredSession?.phase === "dashboard" || restoredSession?.phase === "decision",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("motion-off", !animationsEnabled);
    window.localStorage.setItem(MOTION_STORAGE_KEY, String(animationsEnabled));
  }, [animationsEnabled]);

  useEffect(() => {
    if (!analysis || !company || !role) return;
    if (phase !== "verdict" && phase !== "dashboard" && phase !== "decision") return;

    saveStoredAnalysisSession({
      phase,
      company,
      role,
      analysis,
      decision,
    });
  }, [phase, company, role, analysis, decision]);

  const start = async (c: string, r: string) => {
    const startedAt = Date.now();
    clearStoredAnalysisSession();
    setCompany(c);
    setRole(r);
    setAnalysis(null);
    setNetworkDone(false);
    setVerdictCanContinue(false);
    setPhase("analyzing");
    try {
      const { data, error } = await supabase.functions.invoke("analyze-job", {
        body: { company: c, role: r },
      });
      if (error) {
        console.error(error);
        toast.error("Analysis failed", { description: "Showing baseline data." });
      }
      // Even on error, function returns fallback data. Defensive guard:
      if (data && data.ticker) {
        setAnalysis(data as Analysis);
      } else {
        toast.error("Could not analyze. Try again.");
        setPhase("landing");
        return;
      }
      if (animationsEnabled) {
        const elapsed = Date.now() - startedAt;
        const remaining = MIN_ANALYSIS_VISIBLE_MS - elapsed;
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }
      }
      setNetworkDone(true);
    } catch (e) {
      console.error(e);
      toast.error("Network error");
      setPhase("landing");
    }
  };

  const onAnimDone = () => {
    if (analysis) {
      setVerdictCanContinue(false);
      setPhase("verdict");
    }
  };

  const goBack = () => {
    if (phase === "decision") {
      setPhase("dashboard");
      return;
    }
    if (phase === "dashboard") {
      setPhase("verdict");
      return;
    }
    if (phase === "verdict" || phase === "analyzing") {
      clearStoredAnalysisSession();
      setPhase("landing");
      setAnalysis(null);
      setDecision(null);
      setNetworkDone(false);
      setVerdictCanContinue(false);
    }
  };

  const goForward = () => {
    if (phase === "verdict" && verdictCanContinue) {
      setPhase("dashboard");
      return;
    }
    if (phase === "dashboard" && decision) {
      setPhase("decision");
    }
  };

  return (
    <AppShell
      canGoBack={phase !== "landing"}
      canGoForward={(phase === "verdict" && verdictCanContinue) || (phase === "dashboard" && Boolean(decision))}
      animationsEnabled={animationsEnabled}
      onBack={goBack}
      onForward={goForward}
      onToggleAnimations={() => setAnimationsEnabled((enabled) => !enabled)}
    >
      {phase === "landing" && <Landing onSubmit={start} />}

      {phase === "analyzing" && (
        <AnalysisRunner
          company={company}
          role={role}
          done={networkDone}
          animationsEnabled={animationsEnabled}
          onComplete={onAnimDone}
        />
      )}

      {phase === "verdict" && analysis && (
        <VerdictReveal
          company={company}
          role={role}
          analysis={analysis}
          animationsEnabled={animationsEnabled}
          onReadyChange={(ready) => {
            if (ready) setVerdictCanContinue(true);
          }}
          onContinue={() => {
            setVerdictCanContinue(true);
            setPhase("dashboard");
          }}
        />
      )}

      {phase === "dashboard" && analysis && (
        <AnalysisDashboard
          company={company}
          role={role}
          analysis={analysis}
          animationsEnabled={animationsEnabled}
          onDecision={(d) => {
            setDecision(d);
            setPhase("decision");
          }}
        />
      )}

      {phase === "decision" && analysis && decision && (
        <Recommendations
          company={company}
          role={role}
          analysis={analysis}
          decision={decision}
          animationsEnabled={animationsEnabled}
          onRestart={() => {
            clearStoredAnalysisSession();
            setPhase("landing");
            setAnalysis(null);
            setDecision(null);
            setCompany("");
            setRole("");
            setVerdictCanContinue(false);
          }}
        />
      )}
    </AppShell>
  );
}
