import * as React from "react";
import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";

interface CopyButtonProps {
  text: string;
  label?: string;
  /** يطابق تمامًا أنواع زر shadcn/ui */
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  onCopied?: () => void;
}

export function CopyButton({
  text,
  label,
  variant = "secondary",
  size = "sm",
  className = "",
  onCopied,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { locale } = useAppStore();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopied?.();
      toast({
        description: t("copied", locale),
        duration: 2000,
      });
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={className}
      data-testid="button-copy"
      aria-label={label || t("copy", locale)}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {label && (
        <span className={size === "icon" ? "sr-only" : ""}>{label}</span>
      )}
    </Button>
  );
}
