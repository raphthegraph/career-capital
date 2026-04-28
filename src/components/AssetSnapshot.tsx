import type { Analysis } from "@/lib/job-types";
import { RatingPill } from "@/components/RatingPill";
import { cn } from "@/lib/utils";

interface AssetSnapshotProps {
  company: string;
  role: string;
  analysis: Analysis;
  className?: string;
}

const metrics = [
  { key: "confidence", label: "Confidence" },
  { key: "careerAssetScore", label: "Asset score" },
] as const;

export function AssetSnapshot({ company, role, analysis, className }: AssetSnapshotProps) {
  return (
    <aside className={cn("surface-floating rounded-[34px] p-4 md:p-5", className)}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="eyebrow">Asset snapshot</div>
            <h3 className="mt-2 truncate text-[18px] font-semibold text-foreground">{company}</h3>
            <p className="truncate text-[13px] text-muted-foreground">{role}</p>
          </div>
          <RatingPill rating={analysis.rating} size="sm" />
        </div>

        <div className="rounded-[28px] border border-primary/10 bg-primary-tint/60 p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary-strong/70">
            Synthetic ticker
          </div>
          <div className="mt-1 font-mono text-[25px] font-semibold tracking-[0.08em] text-primary-strong">
            {analysis.ticker}
          </div>
          <p className="mt-3 text-[13px] leading-[1.5] text-foreground/70">
            {analysis.wouldBuy} to buy, with a {analysis.confidence}% confidence read.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric) => {
            const value = analysis[metric.key];
            return (
              <div key={metric.key} className="rounded-[24px] border border-border/[0.035] bg-white/45 p-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {metric.label}
                </div>
                <div className="mt-1 text-[24px] font-semibold text-foreground">{value}</div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2.5">
          {Object.entries(analysis.dimensions).slice(0, 3).map(([key, dimension]) => (
            <div key={key} className="space-y-1.5">
              <div className="flex justify-between gap-3 text-[12px]">
                <span className="capitalize text-muted-foreground">
                  {key.replace(/([A-Z])/g, " $1")}
                </span>
                <span className="font-semibold text-foreground">{dimension.score}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-primary-tint">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(8, Math.min(100, dimension.score))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
