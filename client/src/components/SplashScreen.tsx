import { AnimatePresence, motion } from "framer-motion";

interface SplashScreenProps {
  visible: boolean;
}

export function SplashScreen({ visible }: SplashScreenProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(255,244,234,0.92)] backdrop-blur-xl dark:bg-[rgba(15,10,6,0.88)]"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
            className="relative flex h-32 w-32 items-center justify-center rounded-[2.5rem] bg-gradient-to-br from-[#FF7A00] via-[#FF5A00] to-[#FF3C00] shadow-[0_32px_80px_-30px_rgba(255,90,0,0.7)]"
          >
            <motion.span
              className="text-4xl font-bold text-white"
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.5 }}
            >
              O
            </motion.span>
            <motion.span
              className="absolute -bottom-8 text-lg font-semibold text-[#FF7A00]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.4 }}
            >
              Orange Tools
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
