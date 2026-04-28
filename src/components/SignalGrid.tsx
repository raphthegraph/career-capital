import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type SignalVariant = "landing" | "analysis" | "reveal" | "dashboard" | "recommendation";
type SignalIntensity = "quiet" | "active" | "focus";

type GridStyle = CSSProperties & {
  "--mx": string;
  "--my": string;
};

type AmbientStyle = CSSProperties & {
  "--x": string;
  "--y": string;
  "--delay": string;
  "--duration": string;
  "--w"?: string;
  "--h"?: string;
  "--scale"?: string;
  "--rotate"?: string;
};

interface Props {
  /** focus = converge grid to center (used at reveal moments) */
  focus?: boolean;
  /** show pulsing signal dots (used during analysis) */
  pulses?: boolean;
  /** ambient copy/layout tuned to the current product phase */
  variant?: SignalVariant;
  /** visual density override */
  intensity?: SignalIntensity;
}

const PULSE_POSITIONS = [
  { top: "18%", left: "12%", delay: "0s" },
  { top: "32%", left: "82%", delay: "0.6s" },
  { top: "62%", left: "20%", delay: "1.2s" },
  { top: "76%", left: "70%", delay: "1.8s" },
  { top: "44%", left: "50%", delay: "0.9s" },
  { top: "22%", left: "60%", delay: "1.5s" },
];

const GLINTS: Record<SignalVariant, Array<{
  x: string;
  y: string;
  w: string;
  delay: string;
  duration: string;
  rotate: string;
  desktopOnly?: boolean;
}>> = {
  landing: [
    { x: "10%", y: "26%", w: "120px", delay: "0s", duration: "15s", rotate: "-12deg" },
    { x: "84%", y: "21%", w: "150px", delay: "1.8s", duration: "18s", rotate: "9deg" },
    { x: "78%", y: "76%", w: "110px", delay: "3.2s", duration: "17s", rotate: "-6deg", desktopOnly: true },
    { x: "20%", y: "78%", w: "135px", delay: "4.4s", duration: "19s", rotate: "11deg", desktopOnly: true },
  ],
  analysis: [
    { x: "13%", y: "31%", w: "132px", delay: "0s", duration: "13s", rotate: "8deg" },
    { x: "82%", y: "28%", w: "112px", delay: "1.6s", duration: "16s", rotate: "-10deg" },
    { x: "84%", y: "70%", w: "150px", delay: "3s", duration: "18s", rotate: "12deg", desktopOnly: true },
    { x: "18%", y: "76%", w: "104px", delay: "4.2s", duration: "17s", rotate: "-7deg", desktopOnly: true },
  ],
  reveal: [
    { x: "14%", y: "25%", w: "122px", delay: "0s", duration: "15s", rotate: "-8deg" },
    { x: "86%", y: "30%", w: "154px", delay: "1.4s", duration: "17s", rotate: "10deg" },
    { x: "80%", y: "78%", w: "118px", delay: "3.4s", duration: "18s", rotate: "-12deg", desktopOnly: true },
    { x: "20%", y: "73%", w: "136px", delay: "4.8s", duration: "20s", rotate: "7deg", desktopOnly: true },
  ],
  dashboard: [
    { x: "10%", y: "24%", w: "115px", delay: "0s", duration: "16s", rotate: "9deg" },
    { x: "87%", y: "25%", w: "142px", delay: "2s", duration: "19s", rotate: "-9deg" },
    { x: "84%", y: "68%", w: "112px", delay: "3.5s", duration: "18s", rotate: "12deg", desktopOnly: true },
    { x: "17%", y: "80%", w: "150px", delay: "5s", duration: "20s", rotate: "-11deg", desktopOnly: true },
  ],
  recommendation: [
    { x: "12%", y: "25%", w: "128px", delay: "0s", duration: "15s", rotate: "-10deg" },
    { x: "86%", y: "26%", w: "148px", delay: "1.6s", duration: "18s", rotate: "8deg" },
    { x: "82%", y: "70%", w: "112px", delay: "3.1s", duration: "19s", rotate: "-12deg", desktopOnly: true },
    { x: "18%", y: "76%", w: "140px", delay: "4.6s", duration: "20s", rotate: "11deg", desktopOnly: true },
  ],
};

const NODES = [
  { x: "18%", y: "18%", delay: "0s", duration: "10s" },
  { x: "72%", y: "16%", delay: "1.8s", duration: "12s" },
  { x: "88%", y: "54%", delay: "3s", duration: "13s" },
  { x: "12%", y: "62%", delay: "4.2s", duration: "11s" },
  { x: "42%", y: "82%", delay: "2.4s", duration: "14s" },
  { x: "57%", y: "34%", delay: "5.2s", duration: "12s" },
];

const BLUE_SHAPES: Record<SignalVariant, Array<{
  x: string;
  y: string;
  w: string;
  h: string;
  scale: string;
  delay: string;
  duration: string;
  rotate: string;
  desktopOnly?: boolean;
}>> = {
  landing: [
    { x: "15%", y: "22%", w: "230px", h: "98px", scale: "1.28", delay: "0s", duration: "15s", rotate: "-14deg" },
    { x: "78%", y: "24%", w: "280px", h: "116px", scale: "1.2", delay: "2.6s", duration: "18s", rotate: "10deg" },
    { x: "70%", y: "78%", w: "220px", h: "88px", scale: "1.24", delay: "4.1s", duration: "17s", rotate: "-8deg", desktopOnly: true },
    { x: "35%", y: "84%", w: "260px", h: "92px", scale: "1.2", delay: "1.4s", duration: "20s", rotate: "8deg", desktopOnly: true },
  ],
  analysis: [
    { x: "12%", y: "30%", w: "250px", h: "104px", scale: "1.24", delay: "0.4s", duration: "14s", rotate: "10deg" },
    { x: "80%", y: "66%", w: "300px", h: "118px", scale: "1.18", delay: "2.2s", duration: "17s", rotate: "-11deg", desktopOnly: true },
    { x: "60%", y: "18%", w: "210px", h: "82px", scale: "1.26", delay: "4s", duration: "16s", rotate: "7deg" },
    { x: "42%", y: "86%", w: "270px", h: "92px", scale: "1.22", delay: "1.5s", duration: "19s", rotate: "6deg", desktopOnly: true },
  ],
  reveal: [
    { x: "18%", y: "18%", w: "250px", h: "100px", scale: "1.2", delay: "0s", duration: "16s", rotate: "-10deg" },
    { x: "76%", y: "28%", w: "310px", h: "126px", scale: "1.22", delay: "2s", duration: "18s", rotate: "12deg" },
    { x: "54%", y: "78%", w: "230px", h: "90px", scale: "1.26", delay: "4.4s", duration: "17s", rotate: "-7deg", desktopOnly: true },
    { x: "16%", y: "72%", w: "260px", h: "92px", scale: "1.18", delay: "1.2s", duration: "20s", rotate: "9deg", desktopOnly: true },
  ],
  dashboard: [
    { x: "13%", y: "26%", w: "245px", h: "96px", scale: "1.22", delay: "0.8s", duration: "17s", rotate: "11deg" },
    { x: "82%", y: "24%", w: "300px", h: "114px", scale: "1.18", delay: "2.8s", duration: "19s", rotate: "-10deg", desktopOnly: true },
    { x: "70%", y: "76%", w: "240px", h: "88px", scale: "1.24", delay: "4.8s", duration: "18s", rotate: "8deg" },
    { x: "32%", y: "84%", w: "280px", h: "96px", scale: "1.2", delay: "1.8s", duration: "21s", rotate: "-7deg", desktopOnly: true },
  ],
  recommendation: [
    { x: "16%", y: "24%", w: "270px", h: "108px", scale: "1.2", delay: "0s", duration: "16s", rotate: "-12deg" },
    { x: "80%", y: "26%", w: "320px", h: "124px", scale: "1.22", delay: "2.4s", duration: "19s", rotate: "9deg" },
    { x: "68%", y: "72%", w: "250px", h: "96px", scale: "1.26", delay: "4.2s", duration: "18s", rotate: "-8deg", desktopOnly: true },
    { x: "36%", y: "84%", w: "290px", h: "98px", scale: "1.2", delay: "1.5s", duration: "21s", rotate: "8deg", desktopOnly: true },
  ],
};

export function SignalGrid({
  focus = false,
  pulses = false,
  variant = "dashboard",
  intensity,
}: Props) {
  const [pos, setPos] = useState({ x: 50, y: 40 });
  const resolvedIntensity = intensity ?? (focus ? "focus" : pulses ? "active" : "quiet");
  const glints = useMemo(() => GLINTS[variant], [variant]);
  const blueShapes = useMemo(() => BLUE_SHAPES[variant], [variant]);

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
        className={cn(
          "signal-grid",
          focus && "signal-grid--focus",
          `signal-grid--${resolvedIntensity}`,
        )}
        style={{ "--mx": `${pos.x}%`, "--my": `${pos.y}%` } as GridStyle}
      />
      <div
        aria-hidden
        className={cn(
          "ambient-field",
          `ambient-field--${variant}`,
          `ambient-field--${resolvedIntensity}`,
        )}
      >
        <span className="ambient-line ambient-line--one" />
        <span className="ambient-line ambient-line--two" />
        <span className="ambient-scan" />
        <span className="ambient-track ambient-track--one" />
        <span className="ambient-track ambient-track--two" />
        {blueShapes.map((shape, index) => (
          <span
            key={`blue-shape-${index}`}
            className={cn(
              "ambient-blue-shape",
              shape.desktopOnly && "ambient-blue-shape--desktop",
            )}
            style={{
              "--x": shape.x,
              "--y": shape.y,
              "--w": shape.w,
              "--h": shape.h,
              "--scale": shape.scale,
              "--delay": shape.delay,
              "--duration": shape.duration,
              "--rotate": shape.rotate,
            } as AmbientStyle}
          />
        ))}
        {NODES.map((node, index) => (
          <span
            key={`node-${index}`}
            className={cn(
              "ambient-node",
              index > 3 && "ambient-node--desktop",
            )}
            style={{
              "--x": node.x,
              "--y": node.y,
              "--delay": node.delay,
              "--duration": node.duration,
            } as AmbientStyle}
          />
        ))}
        {glints.map((glint, index) => (
          <span
            key={`glint-${index}`}
            className={cn(
              "ambient-glint",
              glint.desktopOnly && "ambient-glint--desktop",
            )}
            style={{
              "--x": glint.x,
              "--y": glint.y,
              "--w": glint.w,
              "--delay": glint.delay,
              "--duration": glint.duration,
              "--rotate": glint.rotate,
            } as AmbientStyle}
          />
        ))}
      </div>
      {pulses && (
        <div aria-hidden className="fixed inset-0 z-0 pointer-events-none">
          {PULSE_POSITIONS.map((p, i) => (
            <span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-primary/35 animate-signal-pulse"
              style={{ top: p.top, left: p.left, animationDelay: p.delay }}
            />
          ))}
        </div>
      )}
    </>
  );
}
