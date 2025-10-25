import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/lib/store";
import { t, quickReplies } from "@/lib/i18n";
import { MessageSquare, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ChatMessage, DocEntry } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { SmartLinkPill } from "@/components/SmartLinkPill";
import { CopyButton } from "@/components/CopyButton";
import { useToast } from "@/hooks/use-toast";
import { DocsNavigator } from "@/components/DocsNavigator";
import {
  getSmartLinkCandidates,
  listSmartLinks,
  type SmartLinkId,
} from "@/lib/smartLinks";

export function Chatbot() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [docs, setDocs] = useState<DocEntry[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const handledNavigatePayloads = useRef<Set<string>>(new Set());
  const handledDocsUpdates = useRef<Set<string>>(new Set());
  const hasSeededNavigate = useRef(false);

  const { isChatOpen, setChatOpen, chatMessages, addChatMessage, locale } =
    useAppStore();

  const { toast } = useToast();
  const isArabic = locale === "ar";

  // Smart links recommendations
  const recommendedSmartLinks = useMemo(() => {
    const latestInput = message.trim()
      ? message
      : [...chatMessages]
          .reverse()
          .find((msg) => msg.role === "user" && msg.content.trim())?.content ??
        "";

    const matches = latestInput
      ? getSmartLinkCandidates(latestInput).map((link) => link.id)
      : [];

    if (matches.length > 0) {
      return Array.from(new Set(matches)).slice(0, 3);
    }

    return listSmartLinks()
      .map((link) => link.id)
      .slice(0, 3);
  }, [chatMessages, message]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Cleanup any in-flight requests on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // Fetch docs list
  const fetchDocs = useCallback(async () => {
    try {
      const response = await fetch("/api/docs");
      if (!response.ok) throw new Error("Failed to load docs");
      const data: { docs?: DocEntry[] } = await response.json();
      if (Array.isArray(data.docs)) {
        setDocs(data.docs);
      }
    } catch {
      toast({
        title: locale === "ar" ? "تعذر تحميل المستندات" : "Docs unavailable",
        description:
          locale === "ar"
            ? "حدث خطأ أثناء تحميل قائمة المستندات."
            : "We couldn't load the docs list just now.",
      });
    }
  }, [toast, locale]);

  // Open a selected doc
  const handleDocSelect = useCallback(
    (doc: DocEntry) => {
      if (doc.url) {
        window.open(doc.url, "_blank", "noopener,noreferrer");
      } else {
        toast({
          title:
            locale === "ar" ? "أضف رابطًا للمستند" : "Add a link to this doc",
          description:
            locale === "ar"
              ? `أضف الرابط في docs.json: ${doc.title}`
              : `Fill the URL inside docs.json for: ${doc.title}`,
        });
      }
    },
    [toast, locale]
  );

  // Load docs when chat opens
  useEffect(() => {
    if (isChatOpen) {
      fetchDocs();
    }
  }, [isChatOpen, fetchDocs]);

  // Refresh docs on docs-update payloads
  useEffect(() => {
    const latestUpdate = [...chatMessages]
      .reverse()
      .find((msg) => msg.payload?.kind === "docs-update");
    if (latestUpdate && !handledDocsUpdates.current.has(latestUpdate.id)) {
      handledDocsUpdates.current.add(latestUpdate.id);
      fetchDocs();
    }
  }, [chatMessages, fetchDocs]);

  // Handle navigate-doc payloads
  useEffect(() => {
    if (!hasSeededNavigate.current) {
      chatMessages.forEach((msg) => {
        if (msg.payload?.kind === "navigate-doc") {
          handledNavigatePayloads.current.add(msg.id);
        }
      });
      hasSeededNavigate.current = true;
      return;
    }

    chatMessages.forEach((msg) => {
      if (msg.payload?.kind !== "navigate-doc") return;
      if (handledNavigatePayloads.current.has(msg.id)) return;
      handledNavigatePayloads.current.add(msg.id);
      handleDocSelect(msg.payload.doc);
    });
  }, [chatMessages, handleDocSelect]);

  // Send message (supports JSON or SSE streaming)
  const handleSend = async (text?: string) => {
    const messageText = text ?? message;
    if (!messageText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: Date.now(),
    };

    addChatMessage(userMessage);
    setMessage("");
    setIsLoading(true);

    // Temp assistant message for streaming updates
    const assistantMessageId = (Date.now() + 1).toString();
    const tempAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    addChatMessage(tempAssistantMessage);

    // Abort any previous request
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, userMessage].map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          })),
          locale,
        }),
        signal: ac.signal,
      });

      if (!response.ok) throw new Error("Failed to get response");

      const contentType = response.headers.get("content-type") ?? "";

      // JSON response (non-streaming)
      if (contentType.includes("application/json")) {
        const data = await response.json();
        if (data?.message) {
          const assistantMessage = data.message as ChatMessage;
          useAppStore.setState((state) => ({
            chatMessages: state.chatMessages.map((msg) =>
              msg.id === assistantMessageId
                ? { ...assistantMessage, id: assistantMessageId }
                : msg
            ),
          }));
        }
        return;
      }

      // SSE streaming
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;
          if (data === "[DONE]") {
            break;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed?.content) {
              accumulated += parsed.content as string;
              useAppStore.setState((state) => ({
                chatMessages: state.chatMessages.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: accumulated }
                    : msg
                ),
              }));
            }
            if (parsed?.error) {
              throw new Error(parsed.error as string);
            }
          } catch {
            // ignore partial lines
          }
        }
      }

      if (accumulated) {
        useAppStore.setState((state) => ({
          chatMessages: state.chatMessages.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: accumulated }
              : msg
          ),
        }));
      }
    } catch {
      // Replace temp message with friendly error
      useAppStore.setState((state) => ({
        chatMessages: state.chatMessages.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content:
                  locale === "ar"
                    ? "عذرًا، حدث خطأ أثناء المعالجة. حاول مرة أخرى."
                    : "Sorry, I encountered an error. Please try again.",
              }
            : msg
        ),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickReply = (replyText: string) => {
    handleSend(replyText);
  };

  const closeChat = () => {
    setChatOpen(false);
    abortRef.current?.abort();
  };

  return (
    <>
      {/* Floating button to open chat */}
      <AnimatePresence>
        {!isChatOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-40"
            style={{ direction: "ltr" }}
          >
            <Button
              size="icon"
              onClick={() => setChatOpen(true)}
              className="h-16 w-16 rounded-full bg-gradient-to-br from-[#FF7A00] via-[#FF5400] to-[#FF3C00] shadow-[0_28px_60px_-28px_rgba(255,90,0,0.75)] hover:-translate-y-1"
              data-testid="button-open-chat"
              aria-label={t("help", locale)}
            >
              <MessageSquare className="h-6 w-6" />
              {chatMessages.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs">
                  {chatMessages.filter((m) => m.role === "assistant").length}
                </span>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ x: isArabic ? -400 : 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isArabic ? -400 : 400, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "fixed top-0 bottom-0 z-50 w-full sm:w-[420px] shadow-[0_30px_70px_-40px_rgba(0,0,0,0.55)]",
              isArabic ? "left-0" : "right-0"
            )}
            style={{ direction: isArabic ? "rtl" : "ltr" }}
            data-testid="chat-panel"
          >
            <Card className="flex h-full flex-col rounded-none border-0 bg-white/75 backdrop-blur-2xl sm:rounded-l-[2.5rem] sm:border sm:border-white/40 dark:bg-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-white/50 pb-4 dark:border-white/10">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF7A00] via-[#FF5400] to-[#FF3C00] text-white">
                    <MessageSquare className="h-5 w-5" />
                  </span>
                  {t("chatTitle", locale)}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <DocsNavigator
                    docs={docs}
                    locale={locale}
                    onSelect={handleDocSelect}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeChat}
                    className="hover-elevate active-elevate-2"
                    data-testid="button-close-chat"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-5" ref={scrollRef}>
                  <div className="space-y-4">
                    {chatMessages.length === 0 && (
                      <div className="rounded-3xl border border-dashed border-white/50 bg-white/60 py-10 text-center text-muted-foreground backdrop-blur dark:bg-white/5">
                        <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-70" />
                        <p className="text-sm">
                          {t("chatPlaceholder", locale)}
                        </p>
                      </div>
                    )}

                    {chatMessages.map((msg) => {
                      const isUser = msg.role === "user";
                      const isErrorMessage =
                        msg.role === "assistant" &&
                        /عذرًا|sorry/i.test(msg.content);

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className={cn(
                            "flex w-full",
                            isUser ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[80%] space-y-3 rounded-[1.9rem] px-5 py-4 shadow-[0_18px_44px_-32px_rgba(0,0,0,0.25)]",
                              isUser
                                ? "bg-gradient-to-br from-[#FF7A00] via-[#FF5400] to-[#FF3C00] text-white"
                                : "bg-white/90 text-foreground backdrop-blur",
                              isErrorMessage && "ring-2 ring-destructive/60"
                            )}
                            data-testid={`chat-message-${msg.role}`}
                          >
                            <div className="space-y-2 text-sm leading-7">
                              {parseMessageSegments(msg.content).map(
                                (segment, index) =>
                                  segment.type === "link" ? (
                                    <SmartLinkPill
                                      key={`${msg.id}-link-${index}`}
                                      linkId={segment.linkId}
                                      className={cn(
                                        "inline-flex",
                                        isUser && "bg-white/90 text-foreground"
                                      )}
                                    />
                                  ) : (
                                    <span
                                      key={`${msg.id}-text-${index}`}
                                      className="block whitespace-pre-wrap break-words"
                                    >
                                      {segment.content}
                                    </span>
                                  )
                              )}
                            </div>

                            {msg.payload?.kind === "prorata" && (
                              <ProrataSummaryCard
                                data={msg.payload.data}
                                locale={msg.payload.locale}
                              />
                            )}
                          </div>

                          <span className="mt-2 block text-xs opacity-70">
                            {new Date(msg.timestamp).toLocaleTimeString(
                              isArabic ? "ar-JO" : "en-US",
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </span>
                        </motion.div>
                      );
                    })}

                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div className="flex items-center gap-3 rounded-3xl bg-white/80 px-4 py-3 text-foreground backdrop-blur dark:bg-white/10">
                          <span className="loading-ring" />
                          <span className="text-sm">
                            {t("thinking", locale)}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>

              <CardFooter className="flex flex-col gap-5 border-t border-white/70 bg-white/80 px-5 py-4 backdrop-blur">
                {/* Quick Replies */}
                {quickReplies.length > 0 && (
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {t("quickReplies", locale)}
                    </span>
                    {quickReplies.map((reply) => (
                      <Badge
                        key={reply.id}
                        variant="secondary"
                        className="cursor-pointer rounded-full bg-white px-3 py-2 text-xs font-medium text-foreground shadow-sm transition hover:-translate-y-1"
                        onClick={() => handleQuickReply(reply.text[locale])}
                        data-testid={`quick-reply-${reply.id}`}
                      >
                        {reply.text[locale]}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Recommended Smart Links */}
                {recommendedSmartLinks.length > 0 && (
                  <div className="w-full">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                      {locale === "ar"
                        ? "روابط أورنج"
                        : "Official Orange links"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {recommendedSmartLinks.map((linkId) => (
                        <SmartLinkPill key={linkId} linkId={linkId} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex w-full items-center gap-3 rounded-full border border-white/70 bg-white px-4 py-2 shadow-[0_18px_40px_-30px_rgba(255,90,0,0.35)]"
                >
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t("chatPlaceholder", locale)}
                    disabled={isLoading}
                    className="h-12 flex-1 border-0 bg-transparent px-1 text-sm focus-visible:ring-0"
                    data-testid="input-chat-message"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!message.trim() || isLoading}
                    className="h-11 w-11 rounded-full bg-gradient-to-br from-[#FF7A00] via-[#FF5400] to-[#FF3C00] text-white shadow-[0_20px_50px_-30px_rgba(255,90,0,0.65)] hover:from-[#FF6A00] hover:to-[#FF3C00]"
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ===== Helpers =====

type MessageSegment =
  | { type: "text"; content: string }
  | { type: "link"; linkId: SmartLinkId };

function parseMessageSegments(content: string): MessageSegment[] {
  const regex = /\[\[link:([a-z0-9-]+)\]\]/gi;
  const segments: MessageSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: content.slice(lastIndex, match.index),
      });
    }
    const linkId = match[1]?.toLowerCase() as SmartLinkId;
    segments.push({ type: "link", linkId });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", content: content.slice(lastIndex) });
  }

  if (segments.length === 0) {
    return [{ type: "text", content }];
  }

  return segments;
}

// ===== Prorata widgets =====

type ProrataPayload = Extract<
  NonNullable<ChatMessage["payload"]>,
  { kind: "prorata" }
>;

function ProrataSummaryCard({
  data,
  locale,
}: {
  data: ProrataPayload["data"];
  locale: "en" | "ar";
}) {
  const isArabic = locale === "ar";
  const label = (en: string, ar: string) => (isArabic ? ar : en);

  return (
    <div className="space-y-4 rounded-[1.8rem] border border-white/70 bg-gradient-to-br from-[#FFECD9]/80 via-[#FFE6CE]/85 to-[#FFD9B7]/85 p-5 text-sm text-foreground shadow-inner backdrop-blur">
      <div className="grid gap-3 md:grid-cols-2">
        <ProrataMetric label={label("Period", "الفترة")} value={data.period} />
        <ProrataMetric
          label={label("Pro-days", "أيام البروراتا")}
          value={`${data.proDays} · ${data.percent}`}
        />
        <ProrataMetric
          label={label("Monthly (net)", "الاشتراك الشهري")}
          value={data.monthlyNet}
        />
        <ProrataMetric
          label={label("Pro-rata (net)", "قيمة البروراتا")}
          value={data.prorataNet}
        />
        <ProrataMetric
          label={label("Invoice date", "تاريخ الفاتورة")}
          value={data.invoiceDate}
        />
        <ProrataMetric
          label={label("Coverage until", "تغطية حتى")}
          value={data.coverageUntil}
        />
      </div>
      {typeof data.fullInvoiceGross === "number" && (
        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-xs font-medium">
          {label("Full invoice (gross)", "الفاتورة الإجمالية")}: JD{" "}
          {data.fullInvoiceGross.toFixed(3)}
        </div>
      )}
      <div className="space-y-3 rounded-[1.6rem] border border-white/70 bg-white/85 px-4 py-3 text-sm shadow-inner">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          {label("Copy-ready script", "النص الجاهز للنسخ")}
        </p>
        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap text-xs leading-6 text-foreground">
          {data.script}
        </pre>
        <div className="flex justify-end">
          <CopyButton
            text={data.script}
            label={label("Copy", "نسخ")}
            variant="secondary"
            className="rounded-full bg-gradient-to-r from-[#FF7A00] via-[#FF5400] to-[#FF3C00] px-4 py-2 text-white shadow-[0_18px_42px_-28px_rgba(255,90,0,0.65)] hover:from-[#FF6A00] hover:to-[#FF3C00]"
          />
        </div>
      </div>
    </div>
  );
}

function ProrataMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.6rem] border border-white/70 bg-white/85 px-4 py-3 shadow-[0_16px_36px_-28px_rgba(0,0,0,0.18)]">
      <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-semibold text-foreground">{value}</p>
    </div>
  );
}
