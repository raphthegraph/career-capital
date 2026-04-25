import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TickerTape } from "@/components/TickerTape";
import { ArrowRight, TrendingUp } from "lucide-react";

interface Props {
  onSubmit: (company: string, role: string) => void;
}

const examples = [
  { company: "N26", role: "Product Manager" },
  { company: "Trade Republic", role: "Software Engineer" },
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
      <TickerTape />

      <header className="container py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono font-bold tracking-wider">
          <div className="w-7 h-7 rounded bg-primary grid place-items-center text-primary-foreground">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span>$JOB</span>
          <span className="text-muted-foreground hidden sm:inline">/ career asset terminal</span>
        </div>
        <span className="font-mono text-xs text-muted-foreground hidden sm:inline">v1.0 · live</span>
      </header>

      <main className="flex-1 container grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center py-12 lg:py-20">
        <div className="space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/50 font-mono text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-primary blink" />
            ASSET ANALYSIS · POWERED BY AI + REAL SIGNALS
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
            Would you{" "}
            <span className="bg-buy bg-clip-text text-primary">buy</span> your
            <br />
            own job?
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
            $JOB evaluates your employer like a career asset — using real-world signals and AI
            reasoning. We price your role. Then we tell you whether to buy, hold, sell, or short it.
          </p>

          <form onSubmit={submit} className="card-terminal rounded-lg p-6 space-y-4 max-w-2xl">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Company</Label>
                <Input
                  placeholder="N26, Tesla, OpenAI…"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-12 bg-background/60 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Role</Label>
                <Input
                  placeholder="Product Manager…"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="h-12 bg-background/60 font-mono"
                />
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full h-14 text-base font-semibold gap-2 bg-buy text-background hover:opacity-90">
              Analyze my job <ArrowRight className="w-5 h-5" />
            </Button>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-xs text-muted-foreground font-mono pt-1">try:</span>
              {examples.map((ex) => (
                <button
                  key={ex.company}
                  type="button"
                  onClick={() => {
                    setCompany(ex.company);
                    setRole(ex.role);
                  }}
                  className="text-xs font-mono px-2 py-1 rounded border border-border hover:border-primary/60 hover:text-primary transition-colors"
                >
                  {ex.company} · {ex.role}
                </button>
              ))}
            </div>
          </form>
        </div>

        <aside className="card-terminal rounded-lg p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
            <span>SAMPLE TICKER</span>
            <span>N26-PM · LIVE</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-5xl font-bold">68.4</span>
            <span className="text-buy font-mono text-sm">▲ +2.1 (3.2%)</span>
          </div>
          <SampleSparkline />
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { l: "Dividend", v: "72", c: "text-buy" },
              { l: "Volatility", v: "55", c: "text-hold" },
              { l: "Liquidity", v: "78", c: "text-buy" },
            ].map((x) => (
              <div key={x.l} className="border border-border rounded p-3">
                <div className={`font-mono text-2xl font-bold ${x.c}`}>{x.v}</div>
                <div className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">{x.l}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 font-mono text-xs text-muted-foreground">
            <div>VERDICT: <span className="text-hold font-bold">HOLD</span></div>
            <div className="mt-1 italic text-foreground/80">"Steady yield, contested promotion path."</div>
          </div>
        </aside>
      </main>

      <footer className="border-t border-border py-4">
        <div className="container flex flex-col sm:flex-row gap-2 sm:gap-6 items-center justify-between font-mono text-xs text-muted-foreground">
          <span>Not financial advice. Definitely career advice.</span>
          <span>$JOB · synthetic career asset terminal</span>
        </div>
      </footer>
    </div>
  );
}

function SampleSparkline() {
  const points = [40, 42, 38, 45, 50, 48, 55, 53, 60, 58, 65, 68];
  const w = 320, h = 80;
  const max = Math.max(...points), min = Math.min(...points);
  const dx = w / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * dx;
      const y = h - ((p - min) / (max - min)) * h;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20">
      <defs>
        <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--buy))" stopOpacity="0.4" />
          <stop offset="100%" stopColor="hsl(var(--buy))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L ${w} ${h} L 0 ${h} Z`} fill="url(#g1)" />
      <path d={path} stroke="hsl(var(--buy))" strokeWidth="2" fill="none" />
    </svg>
  );
}
