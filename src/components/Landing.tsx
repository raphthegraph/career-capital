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

      <main className="relative z-10 flex flex-1 items-center px-4 pb-4 pt-[calc(1.75rem+env(safe-area-inset-top))] sm:px-6 sm:py-12 md:py-16">
        <div className="mx-auto w-full max-w-[920px] space-y-5 text-center animate-fade-in-up sm:space-y-8">
          <div className="mx-auto max-w-[780px] space-y-3.5 sm:space-y-5">
            <h1 className="font-display text-[34px] font-[800] leading-[1.03] text-foreground text-elegant min-[390px]:text-[38px] sm:text-[64px] sm:leading-[0.98] lg:text-[78px]">
              Price your job like a career asset.
            </h1>
            <p className="mx-auto max-w-[340px] text-[14.5px] leading-[1.6] text-muted-foreground sm:max-w-[600px] sm:text-[18px] sm:leading-[1.7]">
              Enter your company and role. $JOB reads public signals, prices the opportunity, and helps you decide what to do next.
            </p>
          </div>

          <form
            onSubmit={submit}
            className="surface-floating mx-auto grid w-full max-w-[360px] gap-1.5 rounded-[28px] p-2 text-left shadow-floating sm:max-w-[820px] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:gap-2 sm:rounded-full"
          >
            <label className="rounded-[22px] bg-white/45 px-4 py-2.5 transition-all focus-within:bg-white/70 sm:rounded-full sm:py-3.5">
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Company
              </span>
              <Input
                placeholder="N26"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="mt-0.5 h-7 border-0 bg-transparent px-0 text-[16px] font-semibold text-foreground shadow-none outline-none placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 sm:h-8"
              />
            </label>
            <label className="rounded-[22px] bg-white/45 px-4 py-2.5 transition-all focus-within:bg-white/70 sm:rounded-full sm:py-3.5">
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Role
              </span>
              <Input
                placeholder="Product Manager"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-0.5 h-7 border-0 bg-transparent px-0 text-[16px] font-semibold text-foreground shadow-none outline-none placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 sm:h-8"
              />
            </label>
            <Button
              type="submit"
              size="lg"
              className="h-[52px] rounded-[22px] bg-primary px-6 text-[15px] font-bold text-primary-foreground hover:bg-primary-hover active:scale-[0.99] md:lift-on-hover glow-primary sm:h-full sm:rounded-full"
            >
              Price it <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </form>

          <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-auto md:max-w-[720px] md:overflow-visible md:px-0">
            <div className="flex w-max gap-2 md:w-auto md:flex-wrap md:justify-center">
              {examples.map((ex) => (
                <button
                  key={ex.company}
                  type="button"
                  onClick={() => {
                    setCompany(ex.company);
                    setRole(ex.role);
                  }}
                  className="min-h-9 shrink-0 rounded-full border border-border/[0.04] bg-white/40 px-3 py-1.5 text-[12.5px] text-foreground/70 transition-all active:scale-[0.98] hover:border-primary/15 hover:bg-white/75 hover:text-foreground hover:shadow-soft md:hover:-translate-y-0.5"
                >
                  <span className="font-bold text-foreground/85">{ex.company}</span>
                  <span className="mx-1.5 text-muted-foreground/50">·</span>
                  {ex.role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-6 pb-[calc(5.75rem+env(safe-area-inset-bottom))] text-center text-[11px] tracking-wide text-muted-foreground/70 md:pb-5">
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
