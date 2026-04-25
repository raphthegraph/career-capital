import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles } from "lucide-react";

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
    <div className="min-h-screen flex flex-col">
      <header className="container py-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
          </div>
          <span className="font-semibold tracking-tight text-[15px]">$JOB</span>
        </div>
        <span className="text-[11px] text-muted-foreground tracking-wide uppercase">
          career asset engine
        </span>
      </header>

      <main className="flex-1 container flex items-center justify-center py-16 md:py-24">
        <div className="w-full max-w-[520px] space-y-14">
          {/* Hero */}
          <div className="space-y-6 text-center animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full surface text-[11px] text-muted-foreground tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-breathe" />
              AI career advisor · live
            </div>
            <h1 className="font-display text-[48px] md:text-[64px] font-semibold leading-[1.02] tracking-[-0.035em] text-elegant">
              Your job is your<br />
              <span className="text-foreground/90">biggest asset.</span>
            </h1>
            <p className="text-[16px] md:text-[17px] text-muted-foreground leading-[1.55] max-w-[440px] mx-auto">
              $JOB helps you price that asset, understand the risks,
              and decide what to do next.
            </p>
          </div>

          {/* Form panel */}
          <form
            onSubmit={submit}
            className="surface-elevated rounded-[20px] p-6 md:p-7 space-y-5 text-left animate-fade-in-up"
            style={{ animationDelay: "180ms" }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Company
                </label>
                <Input
                  placeholder="N26"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-12 input-surface border-border/60 rounded-xl text-[15px] focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0 focus-visible:border-primary/40 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Role
                </label>
                <Input
                  placeholder="Product Manager"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="h-12 input-surface border-border/60 rounded-xl text-[15px] focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0 focus-visible:border-primary/40 transition-colors"
                />
              </div>
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-[15px] font-medium gap-2 rounded-xl bg-primary text-primary-foreground hover:opacity-95 hover:shadow-lg transition-all glow-primary"
            >
              Price my job <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Example pills */}
          <div
            className="space-y-4 animate-fade-in-up"
            style={{ animationDelay: "340ms" }}
          >
            <div className="text-center text-[11px] text-muted-foreground uppercase tracking-wider">
              Or try one
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {examples.map((ex) => (
                <button
                  key={ex.company}
                  type="button"
                  onClick={() => {
                    setCompany(ex.company);
                    setRole(ex.role);
                  }}
                  className="px-4 py-2 rounded-full surface text-[12.5px] text-foreground/75 hover:text-foreground hover:border-foreground/25 transition-all"
                >
                  <span className="font-medium text-foreground/90">{ex.company}</span>
                  <span className="mx-1.5 text-muted-foreground/60">·</span>
                  {ex.role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="container py-8 text-[11px] text-muted-foreground/70 text-center tracking-wide">
        Not financial advice. Definitely career advice.
      </footer>
    </div>
  );
}
