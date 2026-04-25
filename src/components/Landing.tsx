import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";

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
      <header className="container py-6 flex items-center justify-between">
        <div className="font-mono text-sm font-semibold tracking-wider">$JOB</div>
        <span className="font-mono text-[11px] text-muted-foreground">career asset engine</span>
      </header>

      <main className="flex-1 container flex items-center justify-center py-16">
        <div className="w-full max-w-xl space-y-10 text-center animate-fade-in-up">
          <div className="space-y-5">
            <h1 className="font-display text-4xl md:text-6xl font-semibold leading-[1.1] tracking-tight">
              Your job is your biggest asset.
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
              You invest most of your time, energy, and upside into it. $JOB prices that asset and
              helps you decide what to do next.
            </p>
          </div>

          <form
            onSubmit={submit}
            className="rounded-xl border border-border bg-card/40 backdrop-blur p-6 space-y-4 text-left animate-fade-in-up"
            style={{ animationDelay: "200ms" }}
          >
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Company
              </Label>
              <Input
                placeholder="N26"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="h-11 bg-background/40 border-border/70"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Role
              </Label>
              <Input
                placeholder="Product Manager"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-11 bg-background/40 border-border/70"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-base font-medium gap-2 bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Price my job <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div
            className="flex flex-col gap-1.5 items-center text-sm text-muted-foreground animate-fade-in-up"
            style={{ animationDelay: "400ms" }}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] mb-1">try</span>
            {examples.map((ex) => (
              <button
                key={ex.company}
                type="button"
                onClick={() => {
                  setCompany(ex.company);
                  setRole(ex.role);
                }}
                className="font-mono text-xs hover:text-foreground transition-colors"
              >
                {ex.company} · {ex.role}
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer className="container py-6 font-mono text-[11px] text-muted-foreground text-center">
        Not financial advice. Definitely career advice.
      </footer>
    </div>
  );
}
