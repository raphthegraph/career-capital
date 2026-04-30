import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  canGoBack: boolean;
  canGoForward?: boolean;
  animationsEnabled: boolean;
  onBack: () => void;
  onForward?: () => void;
  onToggleAnimations: () => void;
  children: React.ReactNode;
}

export function AppShell({
  canGoBack,
  canGoForward = false,
  animationsEnabled,
  onBack,
  onForward,
  onToggleAnimations,
  children,
}: AppShellProps) {
  return (
    <div className="relative min-h-[100svh] overflow-x-hidden">
      <header className="fixed right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 pointer-events-none sm:right-5 sm:top-5">
        <nav
          aria-label="Flow controls"
          className="surface-floating pointer-events-auto flex items-center gap-1 rounded-full p-1.5 sm:gap-1.5"
        >
            <button
              type="button"
              onClick={onBack}
              disabled={!canGoBack}
              title="Go back one step"
              aria-label="Go back one step"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border border-border/[0.04] bg-white/45 text-muted-foreground transition-all hover:-translate-y-0.5 hover:bg-white/80 hover:text-foreground hover:shadow-soft",
                !canGoBack && "pointer-events-none opacity-35",
              )}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onForward}
              disabled={!canGoForward}
              title="Go forward one step"
              aria-label="Go forward one step"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border border-border/[0.04] bg-white/45 text-muted-foreground transition-all hover:-translate-y-0.5 hover:bg-white/80 hover:text-foreground hover:shadow-soft",
                !canGoForward && "pointer-events-none opacity-35",
              )}
            >
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToggleAnimations}
              title={animationsEnabled ? "Pause animations" : "Resume animations"}
              aria-label={animationsEnabled ? "Pause animations" : "Resume animations"}
              aria-pressed={!animationsEnabled}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border border-border/[0.04] transition-all hover:-translate-y-0.5 hover:shadow-soft",
                animationsEnabled
                  ? "bg-white/45 text-foreground hover:bg-white/80"
                  : "border-primary/10 bg-primary text-primary-foreground hover:bg-primary-hover",
              )}
            >
              {animationsEnabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
        </nav>
      </header>
      {children}
    </div>
  );
}
