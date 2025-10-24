import { memo, useMemo } from "react";

interface SparkConfig {
  id: number;
  top: string;
  left: string;
  duration: number;
  delay: number;
  scale: number;
}

const createSparks = (count: number) =>
  Array.from({ length: count }, (_, idx): SparkConfig => {
    const top = Math.random() * 100;
    const left = Math.random() * 100;
    const duration = 18 + Math.random() * 14;
    const delay = Math.random() * 8;
    const scale = 0.6 + Math.random() * 1.2;
    return {
      id: idx,
      top: `${top}%`,
      left: `${left}%`,
      duration,
      delay,
      scale,
    };
  });

function AmbientBackdropComponent() {
  const sparks = useMemo(() => createSparks(28), []);

  return (
    <div className="ambient-backdrop" aria-hidden={true}>
      <div className="ambient-gradient" />
      <div className="spark-layer">
        {sparks.map((spark) => (
          <span
            key={spark.id}
            className="spark"
            style={{
              top: spark.top,
              left: spark.left,
              animationDuration: `${spark.duration}s, ${spark.duration / 2}s`,
              animationDelay: `${spark.delay}s, ${spark.delay / 2}s`,
              transform: `scale(${spark.scale})`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export const AmbientBackdrop = memo(AmbientBackdropComponent);
