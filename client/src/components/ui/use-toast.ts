// client/src/components/ui/use-toast.ts
// Lightweight toast helper compatible with <Toaster /> that uses "sonner".
// If you already have "sonner" in package.json (common in shadcn setups),
// this will plug in directly.

import { toast as sonner } from "sonner";

export type ToastVariant = "default" | "destructive";

export function toast(opts: {
  title?: string;
  description?: string;
  variant?: ToastVariant;
}) {
  const { title = "", description = "", variant = "default" } = opts;

  if (variant === "destructive") {
    // error-style toast
    sonner.error(title || "Error", { description });
  } else {
    // success/info-style toast
    sonner.success(title || "Done", { description });
  }
}
