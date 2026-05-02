import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Database,
  RefreshCw,
  Server,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SignalGrid } from "@/components/SignalGrid";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StatusState = "operational" | "degraded" | "down";
type CheckGroup = "edge-function" | "storage";

interface StatusService {
  name: string;
  slug: string;
  group: CheckGroup;
  status: StatusState;
  responseTimeMs: number;
  lastCheckedAt: string;
  error?: string;
}

interface StatusResponse {
  status: StatusState;
  checkedAt: string;
  services: StatusService[];
}

const STATUS_COPY: Record<StatusState, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  operational: {
    label: "Operational",
    tone: "text-buy bg-buy/8 border-buy/15",
    icon: CheckCircle2,
  },
  degraded: {
    label: "Degraded",
    tone: "text-hold bg-hold/10 border-hold/18",
    icon: AlertTriangle,
  },
  down: {
    label: "Down",
    tone: "text-sell bg-sell/10 border-sell/18",
    icon: XCircle,
  },
};

function formatTime(value?: string) {
  if (!value) return "Not checked yet";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function groupLabel(group: CheckGroup) {
  return group === "edge-function" ? "Edge Function" : "Storage";
}

function ServiceIcon({ group }: { group: CheckGroup }) {
  return group === "edge-function" ? (
    <Server className="h-5 w-5" />
  ) : (
    <Database className="h-5 w-5" />
  );
}

function StatusBadge({ status }: { status: StatusState }) {
  const config = STATUS_COPY[status];
  const Icon = config.icon;

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold", config.tone)}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="surface h-[178px] animate-pulse rounded-[32px] p-5">
      <div className="h-9 w-9 rounded-full bg-primary/6" />
      <div className="mt-7 h-4 w-36 rounded-full bg-primary/6" />
      <div className="mt-4 h-3 w-full rounded-full bg-primary/5" />
      <div className="mt-2 h-3 w-2/3 rounded-full bg-primary/5" />
    </div>
  );
}

export default function SystemStatus() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);
    setError(null);

    try {
      const { data: response, error: invokeError } = await supabase.functions.invoke("system-status", {
        body: {},
      });

      if (invokeError) throw invokeError;
      setData(response as StatusResponse);
    } catch (caught) {
      console.error(caught);
      setError("Could not load live system status.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchStatus();
    const interval = window.setInterval(() => void fetchStatus("refresh"), 45_000);
    return () => window.clearInterval(interval);
  }, []);

  const summary = useMemo(() => {
    const services = data?.services ?? [];
    return {
      total: services.length,
      operational: services.filter((service) => service.status === "operational").length,
      degraded: services.filter((service) => service.status === "degraded").length,
      down: services.filter((service) => service.status === "down").length,
    };
  }, [data]);

  const overall = loading ? "operational" : data?.status ?? "degraded";
  const overallConfig = STATUS_COPY[overall];
  const OverallIcon = overallConfig.icon;

  return (
    <div className="relative min-h-[100svh] overflow-x-hidden">
      <SignalGrid variant="dashboard" intensity="quiet" />

      <main className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1180px] flex-col px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border/[0.04] bg-white/45 px-3.5 py-2 text-sm font-bold text-foreground/75 shadow-soft transition-all active:scale-[0.98] hover:bg-white/75 hover:text-foreground md:hover:-translate-y-0.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden min-[360px]:inline">Back to $JOB</span>
            <span className="min-[360px]:hidden">Back</span>
          </Link>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void fetchStatus("refresh")}
            disabled={refreshing}
            className="min-h-10 rounded-full bg-white/45 px-3.5 text-foreground/75 hover:bg-white/75 active:scale-[0.98] sm:px-4"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </header>

        <section className="grid flex-1 items-start gap-6 py-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-8 lg:py-16">
          <div className="space-y-5 md:space-y-7">
            <div className="space-y-4 md:space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/8 bg-white/45 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary shadow-soft">
                <Activity className="h-3.5 w-3.5" />
                System status
              </span>
              <div className="space-y-4">
                <h1 className="font-display text-[34px] font-[800] leading-[1.03] text-foreground text-elegant sm:text-[64px] sm:leading-[0.98]">
                  Backend health, in plain sight.
                </h1>
                <p className="max-w-[620px] text-[15px] leading-[1.7] text-muted-foreground sm:text-[18px] sm:leading-[1.75]">
                  Lightweight live checks for the API layer that powers analysis, recommendations, chat, and retrieval. No model calls are made from this page.
                </p>
              </div>
            </div>

            <div className="surface-elevated max-w-[620px] rounded-[28px] p-4 sm:rounded-[36px] sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                <span className={cn("flex h-12 w-12 items-center justify-center rounded-full border sm:h-14 sm:w-14", overallConfig.tone)}>
                    <OverallIcon className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Current state
                    </p>
                    <p className="mt-1 text-xl font-[800] text-foreground sm:text-2xl">
                      {loading ? "Checking systems" : overallConfig.label}
                    </p>
                  </div>
                </div>
                <StatusBadge status={overall} />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 sm:mt-6">
                <div className="rounded-[20px] bg-white/45 p-3 text-center sm:rounded-[24px] sm:p-4">
                  <p className="text-xl font-[800] text-foreground sm:text-2xl">{summary.operational}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Good
                  </p>
                </div>
                <div className="rounded-[20px] bg-white/45 p-3 text-center sm:rounded-[24px] sm:p-4">
                  <p className="text-xl font-[800] text-foreground sm:text-2xl">{summary.degraded}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Watch
                  </p>
                </div>
                <div className="rounded-[20px] bg-white/45 p-3 text-center sm:rounded-[24px] sm:p-4">
                  <p className="text-xl font-[800] text-foreground sm:text-2xl">{summary.down}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Down
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm text-muted-foreground">
                Last updated {formatTime(data?.checkedAt)}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="rounded-[28px] border border-sell/15 bg-sell/8 p-4 text-sm font-semibold text-sell">
                {error}
              </div>
            )}

            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <SkeletonCard key={index} />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {(data?.services ?? []).map((service) => (
                  <article
                    key={service.slug}
                    className="surface group rounded-[26px] p-4 transition-all duration-300 active:scale-[0.99] hover:bg-white/60 hover:shadow-elevated sm:rounded-[32px] sm:p-5 md:hover:-translate-y-1"
                  >
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                      <div className="flex items-start gap-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/6 text-primary">
                          <ServiceIcon group={service.group} />
                        </span>
                        <div>
                          <p className="break-words text-base font-[800] text-foreground sm:text-lg">{service.name}</p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                            {groupLabel(service.group)} · {service.slug}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={service.status} />
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2 sm:gap-3">
                      <div className="rounded-[20px] bg-white/45 p-3 sm:rounded-[22px]">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          Response
                        </p>
                        <p className="mt-1 text-lg font-[800] text-foreground sm:text-xl">
                          {service.responseTimeMs}ms
                        </p>
                      </div>
                      <div className="rounded-[20px] bg-white/45 p-3 sm:rounded-[22px]">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          Checked
                        </p>
                        <p className="mt-1 text-lg font-[800] text-foreground sm:text-xl">
                          {formatTime(service.lastCheckedAt)}
                        </p>
                      </div>
                    </div>

                    {service.error && (
                      <p className="mt-4 rounded-[22px] bg-white/45 p-3 text-sm font-semibold text-muted-foreground">
                        {service.error}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
