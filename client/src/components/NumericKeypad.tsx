import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Delete } from "lucide-react";

interface NumericKeypadProps {
  onNumberClick: (num: string) => void;
  onClear: () => void;
  className?: string;
}

export function NumericKeypad({ onNumberClick, onClear, className = "" }: NumericKeypadProps) {
  const buttons = [
    "7", "8", "9",
    "4", "5", "6",
    "1", "2", "3",
    "0", ".", "⌫"
  ];

  const handleClick = (value: string) => {
    if (value === "⌫") {
      onClear();
    } else {
      onNumberClick(value);
    }
  };

  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`} data-testid="numeric-keypad">
      {buttons.map((btn, idx) => (
        <motion.div
          key={btn}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.02 }}
        >
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleClick(btn)}
            className="w-full h-12 text-lg font-medium hover-elevate active-elevate-2"
            data-testid={`keypad-button-${btn === "⌫" ? "backspace" : btn === "." ? "dot" : btn}`}
            aria-label={btn === "⌫" ? "Delete" : btn}
          >
            {btn === "⌫" ? <Delete className="h-5 w-5" /> : btn}
          </Button>
        </motion.div>
      ))}
    </div>
  );
}
