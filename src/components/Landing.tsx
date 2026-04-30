import { useState } from "react";
import { Link } from "react-router-dom";
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
  { company: "Trade Republic", role: "Product Manager" },
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
    <div className="relative flex min-h-[100svh] flex-col overflow-x-hidden">
      <SignalGrid variant="landing" />

      <main className="relative z-10 flex flex-1 items-center px-4 pb-10 pt-[calc(5.75rem+env(safe-area-inset-top))] sm:px-6 sm:py-12 md:py-16">
        <div className="mx-auto w-full max-w-[920px] space-y-8 text-center animate-fade-in-up">
          <div className="mx-auto max-w-[780px] space-y-5">
            <h1 className="font-display text-[40px] font-[800] leading-[1.02] text-foreground text-elegant sm:text-[64px] sm:leading-[0.98] lg:text-[78px]">
              Price your job like a career asset.
            </h1>
            <p className="mx-auto max-w-[600px] text-[16px] leading-[1.7] text-muted-foreground sm:text-[18px]">
              Enter your company and role. $JOB reads public signals, prices the opportunity, and helps you decide what to do next.
            </p>
          </div>

          <form
            onSubmit={submit}
            className="surface-floating mx-auto grid w-full max-w-[820px] gap-2 rounded-[34px] p-2 text-left shadow-floating sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:rounded-full"
          >
            <label className="rounded-[28px] bg-white/45 px-4 py-3.5 transition-all focus-within:bg-white/70 sm:rounded-full">
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Company
              </span>
              <Input
                placeholder="N26"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="mt-0.5 h-8 border-0 bg-transparent px-0 text-[16px] font-semibold text-foreground shadow-none outline-none placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </label>
            <label className="rounded-[28px] bg-white/45 px-4 py-3.5 transition-all focus-within:bg-white/70 sm:rounded-full">
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Role
              </span>
              <Input
                placeholder="Product Manager"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-0.5 h-8 border-0 bg-transparent px-0 text-[16px] font-semibold text-foreground shadow-none outline-none placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </label>
            <Button
              type="submit"
              size="lg"
              className="h-[56px] rounded-[28px] bg-primary px-6 text-[15px] font-bold text-primary-foreground hover:bg-primary-hover lift-on-hover glow-primary sm:h-full sm:rounded-full"
            >
              Price it <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </form>

          <div className="mx-auto flex max-w-[720px] flex-wrap justify-center gap-2">
            {examples.map((ex) => (
              <button
                key={ex.company}
                type="button"
                onClick={() => {
                  setCompany(ex.company);
                  setRole(ex.role);
                }}
                className="rounded-full border border-border/[0.04] bg-white/40 px-3 py-1.5 text-[12.5px] text-foreground/70 transition-all hover:-translate-y-0.5 hover:border-primary/15 hover:bg-white/75 hover:text-foreground hover:shadow-soft"
              >
                <span className="font-bold text-foreground/85">{ex.company}</span>
                <span className="mx-1.5 text-muted-foreground/50">·</span>
                {ex.role}
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer className="relative z-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-6 pb-5 text-center text-[11px] tracking-wide text-muted-foreground/70">
        <span>Not financial advice. Definitely career advice.</span>
        <span className="hidden text-muted-foreground/35 sm:inline">·</span>
        <Link
          to="/status"
          className="font-bold text-muted-foreground/70 transition-colors hover:text-primary"
        >
          System status
        </Link>
      </footer>
    </div>
  );
}
