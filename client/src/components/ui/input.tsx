import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    // h-9 to match icon buttons and default buttons.
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-input/60 bg-white/70 px-4 py-2 text-base font-medium text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] transition-all ring-offset-transparent placeholder:text-muted-foreground backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:shadow-[0_24px_54px_-28px_rgba(255,90,0,0.55)] dark:bg-white/5 dark:border-white/10 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
