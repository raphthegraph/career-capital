import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  canGoBack: boolean;
  canGoForward?: boolean;
  animationsEnabled: boolean;
  mobileControlsPlacement?: "bottom" | "top";
  onBack: () => void;
  onForward?: () => void;
  onToggleAnimations: () => void;
  children: React.ReactNode;
}

function ControlButton({
  label,
  title,
  disabled,
  onClick,
  children,
  active = false,
  mobile = false,
}: {
  label: string;
  title: string;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  active?: boolean;
  mobile?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={label}
      className={cn(
        "flex items-center justify-center rounded-full border border-border/[0.04] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97]",
        mobile ? "h-12 w-12" : "h-10 w-10",
        active
          ? "bg-primary text-primary-foreground hover:bg-primary-hover"
          : "bg-white/45 text-muted-foreground hover:bg-white/80 hover:text-foreground hover:shadow-soft md:hover:-translate-y-0.5",
        disabled && "pointer-events-none opacity-35",
      )}
    >
      {children}
    </button>
  );
}

export function AppShell({
  canGoBack,
  canGoForward = false,
  animationsEnabled,
  mobileControlsPlacement = "bottom",
  onBack,
  onForward,
  onToggleAnimations,
  children,
}: AppShellProps) {
  const mobilePosition =
    mobileControlsPlacement === "top"
      ? "right-3 top-[calc(env(safe-area-inset-top)+0.75rem)]"
      : "inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] flex justify-center px-4";

  return (
    <div className="relative min-h-[100svh] overflow-x-hidden">
      <header className="pointer-events-none fixed right-5 top-5 z-50 hidden md:block">
        <nav
          aria-label="Flow controls"
          className="surface-floating pointer-events-auto flex items-center gap-1.5 rounded-full p-1.5"
        >
          <ControlButton
            onClick={onBack}
            disabled={!canGoBack}
            title="Go back one step"
            label="Go back one step"
          >
            <ArrowLeft className="h-4 w-4" />
          </ControlButton>
          <ControlButton
            onClick={onForward}
            disabled={!canGoForward}
            title="Go forward one step"
            label="Go forward one step"
          >
            <ArrowRight className="h-4 w-4" />
          </ControlButton>
          <ControlButton
            onClick={onToggleAnimations}
            title={animationsEnabled ? "Pause animations" : "Resume animations"}
            label={animationsEnabled ? "Pause animations" : "Resume animations"}
            active={!animationsEnabled}
          >
            {animationsEnabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </ControlButton>
        </nav>
      </header>

      <header className={cn("pointer-events-none fixed z-50 md:hidden", mobilePosition)}>
        <nav
          aria-label="Flow controls"
          className="surface-floating pointer-events-auto flex items-center gap-1.5 rounded-full p-1.5"
        >
          <ControlButton
            mobile
            onClick={onBack}
            disabled={!canGoBack}
            title="Go back one step"
            label="Go back one step"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </ControlButton>
          <ControlButton
            mobile
            onClick={onForward}
            disabled={!canGoForward}
            title="Go forward one step"
            label="Go forward one step"
          >
            <ArrowRight className="h-[18px] w-[18px]" />
          </ControlButton>
          <ControlButton
            mobile
            onClick={onToggleAnimations}
            title={animationsEnabled ? "Pause animations" : "Resume animations"}
            label={animationsEnabled ? "Pause animations" : "Resume animations"}
            active={!animationsEnabled}
          >
            {animationsEnabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </ControlButton>
        </nav>
      </header>
      {children}
    </div>
  );
}
