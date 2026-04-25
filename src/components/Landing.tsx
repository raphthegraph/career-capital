import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import { SignalGrid } from "@/components/SignalGrid";

interface Props {
  onSubmit: (company: string, role: string) => void;
}

const examples = [
  { company: "N26", role: "Product Manager" },
  { company: "Tesla", role: "Mechanical Engineer" },
  { company: "OpenAI", role: "Research Engineer" },
  { company: "lemon.markets", role: "Product Designer" },
];

export function Landing({ onSubmit }: Props) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;
    onSubmit(company.trim(), role.trim());
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <SignalGrid />

      <header className="relative z-10 px-6 md:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[9px] bg-primary flex items-center justify-center">
            <span className="font-mono text-[11px] font-bold text-primary-foreground">$</span>
          </div>
          <span className="font-semibold tracking-tight text-[15px] text-foreground">JOB</span>
        </div>
        <span className="eyebrow">career asset engine</span>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-6 md:py-10">
        <div className="w-full max-w-[600px] space-y-9 md:space-y-11">
          {/* Hero */}
          <div className="space-y-5 text-center animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full surface text-[11px] text-muted-foreground tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-breathe" />
              AI career advisor · live
            </div>
            <h1 className="font-display text-[40px] md:text-[60px] font-[680] leading-[1.02] tracking-[-0.045em] text-foreground text-elegant">
              Your job is your<br />
              biggest asset.
            </h1>
            <p className="text-[15.5px] md:text-[17px] text-muted-foreground leading-[1.55] max-w-[480px] mx-auto">
              $JOB prices your career like an investment — then helps you decide
              whether to stay, explore, or leave.
            </p>
          </div>

          {/* Form panel */}
          <form
            onSubmit={submit}
            className="surface-elevated rounded-[24px] p-5 md:p-6 space-y-4 text-left animate-fade-in-up"
            style={{ animationDelay: "180ms" }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="eyebrow">Company</label>
                <Input
                  placeholder="N26"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-12 input-surface border border-border/[0.08] rounded-[14px] text-[15px] focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0 focus-visible:border-primary/40 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="eyebrow">Role</label>
                <Input
                  placeholder="Product Manager"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="h-12 input-surface border border-border/[0.08] rounded-[14px] text-[15px] focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0 focus-visible:border-primary/40 transition-all"
                />
              </div>
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full h-13 py-3.5 text-[15px] font-semibold gap-2 rounded-[14px] bg-primary text-primary-foreground hover:bg-primary-hover lift-on-hover glow-primary"
            >
              Price my job <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Example pills */}
          <div
            className="space-y-3 animate-fade-in-up"
            style={{ animationDelay: "340ms" }}
          >
            <div className="text-center eyebrow">Or try one</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {examples.map((ex) => (
                <button
                  key={ex.company}
                  type="button"
                  onClick={() => {
                    setCompany(ex.company);
                    setRole(ex.role);
                  }}
                  className="px-3.5 py-1.5 rounded-full surface text-[12.5px] text-foreground/80 hover:bg-primary-tint hover:border-primary/25 hover:text-foreground lift-on-hover"
                >
                  <span className="font-semibold text-foreground/95">{ex.company}</span>
                  <span className="mx-1.5 text-muted-foreground/60">·</span>
                  {ex.role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-6 py-5 text-[11px] text-muted-foreground/70 text-center tracking-wide">
        Not financial advice. Definitely career advice.
      </footer>
    </div>
  );
}
