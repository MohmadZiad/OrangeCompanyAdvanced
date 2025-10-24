import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";

interface CopyButtonProps {
  text: string;
  label?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function CopyButton({ 
  text, 
  label, 
  variant = "ghost", 
  size = "sm",
  className = "" 
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { locale } = useAppStore();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        description: t("copied", locale),
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={className}
      data-testid="button-copy"
      aria-label={label || t("copy", locale)}
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {label && <span className={size === "icon" ? "sr-only" : ""}>{label}</span>}
    </Button>
  );
}
