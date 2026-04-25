import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <header className="container py-7 flex items-center justify-between">
        <div className="font-semibold tracking-tight text-base">$JOB</div>
        <span className="text-xs text-muted-foreground">career asset engine</span>
      </header>

      <main className="flex-1 container flex items-center justify-center py-12 md:py-20">
        <div className="w-full max-w-[480px] space-y-12 animate-fade-in-up">
          <div className="space-y-5 text-center">
            <h1 className="font-display text-[44px] md:text-[56px] font-semibold leading-[1.05] tracking-[-0.03em]">
              Your job is your<br />biggest asset.
            </h1>
            <p className="text-[15px] md:text-base text-muted-foreground leading-relaxed max-w-[400px] mx-auto">
              You invest most of your time, energy, and upside into it. $JOB prices that asset and
              helps you decide what to do next.
            </p>
          </div>

          <form
            onSubmit={submit}
            className="surface rounded-2xl p-6 md:p-7 space-y-4 text-left animate-fade-in-up"
            style={{ animationDelay: "150ms" }}
          >
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Company</label>
              <Input
                placeholder="N26"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="h-12 bg-background/40 border-border/60 rounded-xl text-[15px] focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <Input
                placeholder="Product Manager"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-12 bg-background/40 border-border/60 rounded-xl text-[15px] focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-[15px] font-medium gap-2 rounded-xl bg-primary text-primary-foreground hover:opacity-95 transition-opacity mt-2"
            >
              Price my job <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div
            className="space-y-3 animate-fade-in-up"
            style={{ animationDelay: "300ms" }}
          >
            <div className="text-center text-xs text-muted-foreground">Try one</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {examples.map((ex) => (
                <button
                  key={ex.company}
                  type="button"
                  onClick={() => {
                    setCompany(ex.company);
                    setRole(ex.role);
                  }}
                  className="px-3.5 py-2 rounded-full border border-border/60 bg-card/30 text-xs text-foreground/80 hover:text-foreground hover:border-foreground/30 hover:bg-card/50 transition-all"
                >
                  {ex.company} · {ex.role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="container py-7 text-xs text-muted-foreground text-center">
        Not financial advice. Definitely career advice.
      </footer>
    </div>
  );
}
