import type { AnalysisSource } from "@/lib/job-types";

interface SourceChipsProps {
  urls?: string[];
  sources?: AnalysisSource[];
  compact?: boolean;
  emptyLabel?: string;
}

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Source";
  }
}

function sourceLabel(source: AnalysisSource | undefined, url: string) {
  if (!source) return hostLabel(url);
  const type = source.sourceType?.toLowerCase();
  if (type === "careers") return "Careers";
  if (type === "risk") return "Risk";
  if (type === "market") return "Market";
  if (type === "fund") return "Portfolio";
  if (type === "news") return "Recent news";
  if (type === "company") return "Company";
  return source.title?.slice(0, 34) || hostLabel(url);
}

export function SourceChips({
  urls = [],
  sources = [],
  compact = false,
  emptyLabel = "AI inference",
}: SourceChipsProps) {
  const uniqueUrls = urls.filter(Boolean).filter((url, index, array) => array.indexOf(url) === index).slice(0, 4);

  if (uniqueUrls.length === 0) {
    return (
      <div className="inline-flex rounded-full border border-border/[0.035] bg-white/35 px-3 py-1 text-[11px] font-semibold text-muted-foreground backdrop-blur-xl">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {uniqueUrls.map((url) => {
        const source = sources.find((item) => item.url === url);
        return (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noreferrer"
            className={`rounded-full border border-primary/10 bg-white/45 font-semibold text-primary-strong shadow-soft backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white/80 ${
              compact ? "px-2.5 py-1 text-[10.5px]" : "px-3 py-1.5 text-[11px]"
            }`}
          >
            {sourceLabel(source, url)}
          </a>
        );
      })}
    </div>
  );
}
