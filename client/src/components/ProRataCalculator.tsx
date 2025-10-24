import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { proRataInputSchema, type ProRataInput, type ProRataResults } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Volume2, RotateCcw, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { calculateProRata } from "@/lib/proRata";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { CopyButton } from "./CopyButton";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export function ProRataCalculator() {
  const [results, setResults] = useState<ProRataResults | null>(null);
  const { locale } = useAppStore();
  const { toast } = useToast();

  const form = useForm<ProRataInput>({
    resolver: zodResolver(proRataInputSchema),
    defaultValues: {
      is15DayCycle: true,
    },
  });

  const onSubmit = (data: ProRataInput) => {
    try {
      const calculated = calculateProRata(data);
      setResults(calculated);
    } catch (err) {
      console.error("Calculation error:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to calculate. Please check your inputs.",
      });
    }
  };

  const handleReset = () => {
    form.reset();
    setResults(null);
  };

  const generateExplanationText = (): string => {
    if (!results) return "";

    const explanation = t("proRataExplanation", locale);
    const fullInvoiceText = results.fullInvoiceAmount 
      ? t("fullInvoice", locale).replace("{amount}", formatCurrency(results.fullInvoiceAmount, locale))
      : "";

    return explanation
      .replace("{activationDate}", formatDate(results.activationDate, locale))
      .replace("{invoiceDate}", formatDate(results.invoiceIssueDate, locale))
      .replace("{endDate}", formatDate(results.endDate || results.invoiceIssueDate, locale))
      .replace("{cycleDays}", results.cycleDays.toString())
      .replace("{daysUsed}", results.daysUsed.toString())
      .replace("{percentage}", results.percentageUsed.toFixed(2))
      .replace("{monthlyValue}", formatCurrency(results.monthlyValue, locale))
      .replace("{proratedAmount}", formatCurrency(results.proratedAmount, locale))
      .replace("{fullInvoiceText}", fullInvoiceText);
  };

  const handleTextToSpeech = () => {
    const text = generateExplanationText();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = locale === "ar" ? "ar-SA" : "en-US";
      window.speechSynthesis.speak(utterance);
      toast({
        description: "Reading aloud...",
        duration: 2000,
      });
    } else {
      toast({
        variant: "destructive",
        description: "Text-to-speech is not supported in your browser",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-primary-foreground">
          <Receipt className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-prorata-title">
            {t("proRataTitle", locale)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("proRataSubtitle", locale)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t("proRataTitle", locale)}</CardTitle>
            <CardDescription>
              {t("fifteenDayCycle", locale)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Activation Date */}
              <div className="space-y-2">
                <Label htmlFor="activation-date">
                  {t("activationDate", locale)}
                  <Badge variant="destructive" className="ml-2 text-xs">{t("required", locale)}</Badge>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal hover-elevate active-elevate-2",
                        !form.watch("activationDate") && "text-muted-foreground"
                      )}
                      data-testid="button-activation-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("activationDate") ? (
                        format(form.watch("activationDate"), "PPP")
                      ) : (
                        <span>{t("activationDate", locale)}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.watch("activationDate")}
                      onSelect={(date) => date && form.setValue("activationDate", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {form.formState.errors.activationDate && (
                  <p className="text-sm text-destructive">{form.formState.errors.activationDate.message}</p>
                )}
              </div>

              {/* Invoice Issue Date */}
              <div className="space-y-2">
                <Label htmlFor="invoice-date">
                  {t("invoiceIssueDate", locale)}
                  <Badge variant="destructive" className="ml-2 text-xs">{t("required", locale)}</Badge>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal hover-elevate active-elevate-2",
                        !form.watch("invoiceIssueDate") && "text-muted-foreground"
                      )}
                      data-testid="button-invoice-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("invoiceIssueDate") ? (
                        format(form.watch("invoiceIssueDate"), "PPP")
                      ) : (
                        <span>{t("invoiceIssueDate", locale)}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.watch("invoiceIssueDate")}
                      onSelect={(date) => date && form.setValue("invoiceIssueDate", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {form.formState.errors.invoiceIssueDate && (
                  <p className="text-sm text-destructive">{form.formState.errors.invoiceIssueDate.message}</p>
                )}
              </div>

              {/* Monthly Subscription Value */}
              <div className="space-y-2">
                <Label htmlFor="monthly-value">
                  {t("monthlySubscription", locale)}
                  <Badge variant="destructive" className="ml-2 text-xs">{t("required", locale)}</Badge>
                </Label>
                <Input
                  id="monthly-value"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("monthlySubscriptionValue", { valueAsNumber: true })}
                  placeholder="0.00"
                  data-testid="input-monthly-value"
                />
                {form.formState.errors.monthlySubscriptionValue && (
                  <p className="text-sm text-destructive">{form.formState.errors.monthlySubscriptionValue.message}</p>
                )}
              </div>

              {/* Full Invoice Amount (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="full-invoice">
                  {t("fullInvoiceAmount", locale)}
                  <Badge variant="secondary" className="ml-2 text-xs">{t("optional", locale)}</Badge>
                </Label>
                <Input
                  id="full-invoice"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("fullInvoiceAmount", { valueAsNumber: true })}
                  placeholder="0.00"
                  data-testid="input-full-invoice"
                />
              </div>

              {/* End Date Until (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="end-date">
                  {t("endDateUntil", locale)}
                  <Badge variant="secondary" className="ml-2 text-xs">{t("optional", locale)}</Badge>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal hover-elevate active-elevate-2",
                        !form.watch("endDate") && "text-muted-foreground"
                      )}
                      data-testid="button-end-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("endDate") ? (
                        format(form.watch("endDate"), "PPP")
                      ) : (
                        <span>{t("endDateUntil", locale)}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.watch("endDate")}
                      onSelect={(date) => form.setValue("endDate", date || undefined)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* 15-day Cycle Toggle */}
              <div className="flex items-center justify-between space-x-2 p-4 rounded-lg bg-muted">
                <Label htmlFor="cycle-toggle" className="cursor-pointer">
                  {t("fifteenDayCycle", locale)}
                </Label>
                <Switch
                  id="cycle-toggle"
                  checked={form.watch("is15DayCycle")}
                  onCheckedChange={(checked) => form.setValue("is15DayCycle", checked)}
                  data-testid="switch-15day-cycle"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  className="flex-1"
                  data-testid="button-calculate-prorata"
                >
                  {t("calculate", locale)}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="hover-elevate active-elevate-2"
                  data-testid="button-reset-prorata"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="space-y-4">
          {results ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Percentage Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    {t("percentageUsed", locale)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-bold text-primary mb-4" data-testid="text-percentage-used">
                    {results.percentageUsed.toFixed(2)}%
                  </div>
                  <Progress value={results.percentageUsed} className="h-4" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {results.daysUsed} {locale === "ar" ? "من" : "of"} {results.cycleDays} {t("daysUsed", locale).toLowerCase()}
                  </p>
                </CardContent>
              </Card>

              {/* Prorated Amount Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    {t("proratedAmount", locale)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-mono" data-testid="text-prorated-amount">
                    {formatCurrency(results.proratedAmount, locale)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t("monthlySubscription", locale)}: {formatCurrency(results.monthlyValue, locale)}
                  </p>
                </CardContent>
              </Card>

              {/* Explanation Text */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    {t("summary", locale)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div 
                    className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg"
                    data-testid="text-explanation"
                  >
                    {generateExplanationText()}
                  </div>
                  <div className="flex gap-2">
                    <CopyButton 
                      text={generateExplanationText()} 
                      label={t("copyText", locale)}
                      variant="outline"
                      size="default"
                      className="flex-1 hover-elevate active-elevate-2"
                    />
                    <Button
                      variant="outline"
                      onClick={handleTextToSpeech}
                      className="flex-1 hover-elevate active-elevate-2"
                      data-testid="button-text-to-speech"
                    >
                      <Volume2 className="h-4 w-4 mr-2" />
                      {t("textToSpeech", locale)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <CardContent className="text-center">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {t("noResults", locale)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
