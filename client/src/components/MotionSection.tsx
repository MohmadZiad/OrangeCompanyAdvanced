import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function MotionSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["0.1 1", "0.9 0"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [30, 0]);
  const op = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const rot = useTransform(scrollYProgress, [0, 1], [2, 0]);

  return (
    <motion.section
      ref={ref}
      style={{ y, opacity: op, rotateX: rot }}
      className={className}
    >
      {children}
    </motion.section>
  );
}
