import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transition-all duration-300",
  {
    variants: {
      variant: {
        default:
          "text-primary-foreground bg-gradient-to-br from-[#FF7A00] via-[#FF5400] to-[#FF3C00] shadow-[0_18px_38px_-20px_rgba(255,72,0,0.75)]",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive-border shadow-[0_18px_38px_-20px_rgba(255,72,0,0.75)]",
        outline:
          "border border-transparent bg-white/70 dark:bg-white/5 text-foreground shadow-[0_12px_28px_-22px_rgba(10,12,15,0.55)]",
        secondary:
          "border border-secondary-border bg-secondary text-secondary-foreground shadow-[0_12px_28px_-22px_rgba(10,12,15,0.45)]",
        ghost:
          "border border-transparent bg-transparent text-foreground hover:bg-white/10",
      },
      size: {
        default: "min-h-11 px-5 py-2",
        sm: "min-h-9 rounded-full px-4 text-xs",
        lg: "min-h-12 rounded-full px-7 text-base",
        icon: "h-11 w-11 rounded-full",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const [ripples, setRipples] = React.useState<
      { id: number; x: number; y: number; size: number }[]
    >([]);
    const rippleId = React.useRef(0);

    const handleRipple = (event: React.MouseEvent<HTMLElement>) => {
      const target = event.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.25;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const id = rippleId.current++;
      setRipples((current) => [...current, { id, x, y, size }]);
      window.setTimeout(() => {
        setRipples((current) => current.filter((ripple) => ripple.id !== id));
      }, 550);
    };

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
      if (!props.disabled) {
        handleRipple(event);
      }
      onClick?.(event as React.MouseEvent<HTMLButtonElement>);
    };

    return (
      <Comp
        className={cn(
          "relative overflow-hidden hover-lift press orange-glow",
          "before:absolute before:inset-0 before:bg-gradient-to-tr before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500",
          buttonVariants({ variant, size, className })
        )}
        ref={ref}
        onClick={handleClick}
        {...props}
      >
        <span className="ripple-container" aria-hidden="true">
          {ripples.map((ripple) => (
            <span
              key={ripple.id}
              className="ripple-span"
              style={{
                width: ripple.size,
                height: ripple.size,
                left: ripple.x,
                top: ripple.y,
              }}
            />
          ))}
        </span>
        <span className="relative z-10 flex items-center gap-2">
          {props.children}
        </span>
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
