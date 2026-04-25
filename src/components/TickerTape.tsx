import { useEffect, useState } from "react";

export function TickerTape() {
  const [ts, setTs] = useState(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setTs(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const items = [
    { t: "STRP-PM", p: "+2.4%", up: true },
    { t: "TSLA-ENG", p: "-1.8%", up: false },
    { t: "OAI-RES", p: "+5.1%", up: true },
    { t: "N26-PM", p: "+0.6%", up: true },
    { t: "TR-DSGN", p: "-0.3%", up: false },
    { t: "LMRK-DEV", p: "+3.2%", up: true },
    { t: "META-ML", p: "-2.1%", up: false },
    { t: "ANTH-RES", p: "+4.7%", up: true },
    { t: "FIGM-PM", p: "+1.2%", up: true },
    { t: "SHOP-ENG", p: "-0.9%", up: false },
  ];
  const repeated = [...items, ...items];

  return (
    <div className="border-y border-border bg-card/40 backdrop-blur overflow-hidden relative">
      <div className="flex items-center">
        <div className="px-4 py-2 bg-primary text-primary-foreground font-mono text-xs font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
          $JOB ⬢ LIVE · {ts.toUTCString().slice(17, 25)} UTC
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex gap-8 ticker-tape whitespace-nowrap py-2 font-mono text-xs">
            {repeated.map((x, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="text-muted-foreground">{x.t}</span>
                <span className={x.up ? "text-buy" : "text-short"}>
                  {x.up ? "▲" : "▼"} {x.p}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
