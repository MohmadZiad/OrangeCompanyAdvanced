// client/src/components/ProgressRing.tsx
import React from "react";

export default function ProgressRing({
  p = 0,
  label,
  size = 112,
}: {
  p?: number;
  label?: string;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(100, p));
  const style: React.CSSProperties = {
    // @ts-ignore custom CSS var
    "--p": clamped,
    width: size,
    height: size,
  };

  return (
    <div
      className="relative rounded-full shadow-[0_24px_45px_-32px_rgba(255,72,0,0.6)]"
      style={style}
      aria-label={label || `${clamped}%`}
    >
      <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_180deg_at_50%_50%,rgba(255,122,0,0.9)_calc(var(--p)*1%),rgba(255,122,0,0.12)_0%)]" />
      <div className="absolute inset-[14%] rounded-full bg-white/85 dark:bg-white/10 backdrop-blur">
        <div className="flex h-full w-full items-center justify-center text-xl font-bold text-foreground">
          {clamped}%
        </div>
      </div>
    </div>
  );
}
