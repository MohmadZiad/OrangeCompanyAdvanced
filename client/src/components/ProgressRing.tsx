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
      className="relative rounded-full bg-[conic-gradient(var(--brand)_calc(var(--p)*1%),theme(colors.slate.200)_0%)]"
      style={style}
      aria-label={label || `${clamped}%`}
    >
      <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center text-xl font-bold text-slate-900">
        {clamped}%
      </div>
    </div>
  );
}
