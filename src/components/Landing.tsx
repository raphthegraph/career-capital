import { useEffect, useState } from "react";
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
];

const pitchLines = [
  "Your career is your largest position.",
  "You invest ~90% of your time into it.",
  "But you've never priced it.",
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

      <main className="flex-1 container grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-20 items-center py-16 lg:py-24">
        {/* LEFT */}
        <div className="space-y-10 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/50 font-mono text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-primary blink" />
            REAL-TIME AI · CAREER ASSET ENGINE
          </div>

          <div className="space-y-3">
            {pitchLines.map((line, i) => (
              <p
                key={line}
                className="font-display text-xl md:text-2xl font-medium text-foreground/70 leading-relaxed animate-fade-in-up"
                style={{ animationDelay: `${i * 220}ms` }}
              >
                {line}
              </p>
            ))}
          </div>

          <h1
            className="font-display text-4xl md:text-6xl font-bold leading-[1.1] tracking-tight animate-fade-in-up"
            style={{ animationDelay: "740ms" }}
          >
            $JOB turns your job into an{" "}
            <span className="relative inline-block text-foreground">
              asset
              <span className="absolute left-0 right-0 -bottom-1 h-[6px] bg-gradient-to-r from-buy/0 via-buy/80 to-buy/0 blur-[2px]" />
              <span className="absolute left-0 right-0 -bottom-1 h-[2px] bg-gradient-to-r from-transparent via-buy to-transparent" />
            </span>
            <br />
            and tells you what to do with it.
          </h1>

          <form
            onSubmit={submit}
            className="card-terminal rounded-lg p-6 space-y-5 animate-fade-in-up"
            style={{ animationDelay: "920ms" }}
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Company
                </Label>
                <Input
                  placeholder="N26, Tesla, OpenAI…"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-12 bg-background/60 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Role
                </Label>
                <Input
                  placeholder="Product Manager…"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="h-12 bg-background/60 font-mono"
                />
              </div>
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full h-14 text-base font-semibold gap-2 bg-buy text-background hover:opacity-90 transition-all hover:shadow-[0_0_30px_hsl(var(--buy)/0.4)]"
            >
              Price my job <ArrowRight className="w-5 h-5" />
            </Button>
            <div className="flex flex-wrap gap-2 pt-1">
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

        {/* RIGHT — animated career asset card */}
        <div className="lg:pl-4 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <LiveAssetCard />
        </div>
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

/* -------------------- Animated sample asset card -------------------- */

function LiveAssetCard() {
  const base = [40, 42, 38, 45, 50, 48, 55, 53, 60, 58, 65, 68];
  const [points, setPoints] = useState(base);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPoints((p) => {
        const last = p[p.length - 1];
        const drift = (Math.random() - 0.45) * 3;
        const next = Math.max(20, Math.min(95, last + drift));
        return [...p.slice(1), +next.toFixed(2)];
      });
      setTick((t) => t + 1);
    }, 1400);
    return () => clearInterval(id);
  }, []);

  const last = points[points.length - 1];
  const first = points[0];
  const delta = last - first;
  const pct = ((delta / first) * 100).toFixed(1);
  const up = delta >= 0;

  return (
    <div className="card-terminal rounded-lg p-6 space-y-5 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-buy/10 blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between font-mono text-xs">
        <span className="text-muted-foreground">SAMPLE TICKER</span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-buy blink" />
          <span className="text-muted-foreground">N26-PM · LIVE</span>
        </span>
      </div>

      <div className="flex items-baseline gap-3">
        <span className="font-mono text-5xl font-bold tabular-nums transition-all">
          {last.toFixed(1)}
        </span>
        <span className={`font-mono text-sm ${up ? "text-buy" : "text-short"}`}>
          {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)} ({up ? "+" : ""}{pct}%)
        </span>
      </div>

      <Sparkline points={points} key={tick % 2} />

      <div className="grid grid-cols-3 gap-2">
        {[
          { l: "Promotion", v: "Strong", c: "text-buy" },
          { l: "Risk", v: "Moderate", c: "text-hold" },
          { l: "Exit", v: "Strong", c: "text-buy" },
        ].map((x) => (
          <div key={x.l} className="border border-border rounded p-3">
            <div className={`font-mono text-sm font-bold ${x.c}`}>{x.v}</div>
            <div className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">
              {x.l}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-4 font-mono text-xs text-muted-foreground space-y-1">
        <div>VERDICT: <span className="text-hold font-bold">HOLD</span></div>
        <div className="italic text-foreground/80">"Steady yield, contested promotion path."</div>
      </div>
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const w = 320, h = 80;
  const max = Math.max(...points), min = Math.min(...points);
  const range = max - min || 1;
  const dx = w / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * dx;
      const y = h - ((p - min) / range) * h * 0.85 - 5;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const last = points[points.length - 1];
  const lastX = (points.length - 1) * dx;
  const lastY = h - ((last - min) / range) * h * 0.85 - 5;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20 transition-all duration-700 ease-out">
      <defs>
        <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--buy))" stopOpacity="0.45" />
          <stop offset="100%" stopColor="hsl(var(--buy))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L ${w} ${h} L 0 ${h} Z`} fill="url(#g1)" className="transition-all duration-700" />
      <path d={path} stroke="hsl(var(--buy))" strokeWidth="2" fill="none" className="transition-all duration-700" />
      <circle cx={lastX} cy={lastY} r="3.5" fill="hsl(var(--buy))" className="animate-price-pulse" />
    </svg>
  );
}
