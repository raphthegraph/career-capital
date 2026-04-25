import { useEffect, useState } from "react";

interface Props {
  /** focus = converge grid to center (used at reveal moments) */
  focus?: boolean;
  /** show pulsing signal dots (used during analysis) */
  pulses?: boolean;
}

const PULSE_POSITIONS = [
  { top: "18%", left: "12%", delay: "0s" },
  { top: "32%", left: "82%", delay: "0.6s" },
  { top: "62%", left: "20%", delay: "1.2s" },
  { top: "76%", left: "70%", delay: "1.8s" },
  { top: "44%", left: "50%", delay: "0.9s" },
  { top: "22%", left: "60%", delay: "1.5s" },
];

export function SignalGrid({ focus = false, pulses = false }: Props) {
  const [pos, setPos] = useState({ x: 50, y: 40 });

  useEffect(() => {
    if (focus) return;
    const onMove = (e: MouseEvent) => {
      setPos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [focus]);

  return (
    <>
      <div
        aria-hidden
        className={`signal-grid ${focus ? "signal-grid--focus" : ""}`}
        style={
          {
            ["--mx" as any]: `${pos.x}%`,
            ["--my" as any]: `${pos.y}%`,
          } as React.CSSProperties
        }
      />
      {pulses && (
        <div aria-hidden className="fixed inset-0 z-0 pointer-events-none">
          {PULSE_POSITIONS.map((p, i) => (
            <span
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary-strong/70 animate-signal-pulse"
              style={{ top: p.top, left: p.left, animationDelay: p.delay }}
            />
          ))}
        </div>
      )}
    </>
  );
}
