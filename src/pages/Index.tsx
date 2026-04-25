import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Landing } from "@/components/Landing";
import { AnalysisRunner } from "@/components/AnalysisRunner";
import { VerdictReveal } from "@/components/VerdictReveal";
import { AnalysisDashboard } from "@/components/AnalysisDashboard";
import { Recommendations } from "@/components/Recommendations";
import type { Analysis, Decision } from "@/lib/job-types";
import { toast } from "sonner";

type Phase = "landing" | "analyzing" | "verdict" | "dashboard" | "decision";

export default function Index() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [networkDone, setNetworkDone] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);

  const start = async (c: string, r: string) => {
    setCompany(c);
    setRole(r);
    setAnalysis(null);
    setNetworkDone(false);
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
      setNetworkDone(true);
    } catch (e) {
      console.error(e);
      toast.error("Network error");
      setPhase("landing");
    }
  };

  const onAnimDone = () => {
    if (analysis) setPhase("verdict");
  };

  return (
    <>
      {phase === "landing" && <Landing onSubmit={start} />}

      {phase === "analyzing" && (
        <AnalysisRunner
          company={company}
          role={role}
          done={networkDone}
          onComplete={onAnimDone}
        />
      )}

      {phase === "verdict" && analysis && (
        <VerdictReveal
          company={company}
          role={role}
          analysis={analysis}
          onContinue={() => setPhase("dashboard")}
        />
      )}

      {phase === "dashboard" && analysis && (
        <AnalysisDashboard
          company={company}
          role={role}
          analysis={analysis}
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
          onBack={() => setPhase("dashboard")}
          onRestart={() => {
            setPhase("landing");
            setAnalysis(null);
            setDecision(null);
            setCompany("");
            setRole("");
          }}
        />
      )}
    </>
  );
}
