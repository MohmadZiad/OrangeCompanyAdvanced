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
import { MessageSquare, Send, X, Trash2, RotateCcw, LifeBuoy, Clock3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ChatMessage, DocEntry, QuickReply, Locale } from "@shared/schema";
import { SmartLinkPill } from "@/components/SmartLinkPill";
import { CopyButton } from "@/components/CopyButton";
import { useToast } from "@/hooks/use-toast";
import { DocsNavigator } from "@/components/DocsNavigator";

const SUPPORT_CONTACT = "mailto:support@orange.jo";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const handledNavigatePayloads = useRef<Set<string>>(new Set());
  const handledDocsUpdates = useRef<Set<string>>(new Set());
  const hasSeededNavigate = useRef(false);

  const {
    isChatOpen,
    setChatOpen,
    chatMessages,
    addChatMessage,
    locale,
    clearChatMessages,
  } = useAppStore();

  const { toast } = useToast();
  const isArabic = locale === "ar";

  const latestUserMessage = useMemo(
    () =>
      [...chatMessages]
        .reverse()
        .find((msg) => msg.role === "user" && msg.content.trim()),
    [chatMessages]
  );

  const contextualReplies = useMemo(
    () => getContextualSuggestions(locale, latestUserMessage?.content ?? ""),
    [locale, latestUserMessage]
  );

  const displayedQuickReplies = useMemo<QuickReply[]>(() => {
    if (contextualReplies.length > 0) {
      return contextualReplies.slice(0, 4);
    }
    return quickReplies.slice(0, 4);
  }, [contextualReplies]);

  const idleSuggestions = useMemo(
    () => [
      t("chatIdleOption1", locale),
      t("chatIdleOption2", locale),
      t("chatIdleOption3", locale),
    ],
    [locale]
  );

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
  const handleSend = useCallback(async (text?: string) => {
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
    } catch (error) {
      const errorReason =
        error instanceof Error && error.message
          ? error.message
          : locale === "ar"
          ? "خطأ غير متوقع"
          : "Unexpected error";
      const messageCopy = t("chatErrorMessage", locale);
      useAppStore.setState((state) => ({
        chatMessages: state.chatMessages.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: `${messageCopy}\n${errorReason}`,
                payload: {
                  kind: "chat-error" as const,
                  locale,
                  data: {
                    reason: errorReason,
                    hint: t("supportPrompt", locale),
                    retryLabel: t("retry", locale),
                    supportLabel: t("contactSupport", locale),
                    retryMessage: messageText,
                    supportUrl: SUPPORT_CONTACT,
                  },
                },
              }
            : msg
        ),
      }));
    } finally {
      setIsLoading(false);
    }
  }, [message, isLoading, addChatMessage, chatMessages, locale]);

  const handleQuickReply = useCallback(
    (replyText: string) => {
      handleSend(replyText);
    },
    [handleSend]
  );

  const handleRetryFromError = useCallback(
    (text?: string) => {
      if (!text) return;
      handleSend(text);
    },
    [handleSend]
  );

  const handleContactSupport = useCallback(() => {
    window.open(SUPPORT_CONTACT, "_blank", "noopener,noreferrer");
  }, []);

  const handleDeleteConversation = useCallback(() => {
    const confirmation = window.confirm(t("clearChatConfirm", locale));
    if (!confirmation) return;
    clearChatMessages();
    setMessage("");
    toast({
      title: locale === "ar" ? "تم حذف المحادثة" : "Conversation cleared",
    });
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [clearChatMessages, locale, toast]);

  const handleNewConversation = useCallback(() => {
    clearChatMessages();
    setMessage("");
    toast({
      title:
        locale === "ar"
          ? "بدأت محادثة جديدة"
          : "Started a fresh conversation",
    });
    setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
  }, [clearChatMessages, locale, toast]);

  const handleIdleSuggestion = useCallback(
    (text: string) => {
      handleSend(text);
    },
    [handleSend]
  );

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
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 180 }}
            className={cn(
              "fixed bottom-4 z-50 w-[min(100%,420px)] sm:w-[420px] md:w-[480px]",
              isArabic ? "left-4" : "right-4"
            )}
            style={{ direction: isArabic ? "rtl" : "ltr" }}
            data-testid="chat-panel"
          >
            <Card className="flex h-[min(82vh,640px)] flex-col overflow-hidden rounded-[2.5rem] border border-white/50 bg-white/80 shadow-[0_40px_120px_-48px_rgba(0,0,0,0.6)] backdrop-blur-3xl dark:bg-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-white/50 pb-4 dark:border-white/10">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <span className="flex h-11 w-11 items-center justify-center rounded-3xl bg-gradient-to-br from-[#FF7A00] via-[#FF5400] to-[#FF3C00] text-white shadow-[0_20px_40px_-24px_rgba(255,90,0,0.75)]">
                    <MessageSquare className="h-5 w-5" />
                  </span>
                  <span className="font-semibold tracking-tight">{t("chatTitle", locale)}</span>
                </CardTitle>
                <div className="flex items-center gap-1 sm:gap-2">
                  <DocsNavigator
                    docs={docs}
                    locale={locale}
                    onSelect={handleDocSelect}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleContactSupport}
                    className="hover-elevate"
                    aria-label={t("contactSupport", locale)}
                  >
                    <LifeBuoy className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNewConversation}
                    className="hover-elevate"
                    aria-label={t("newConversation", locale)}
                  >
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDeleteConversation}
                    className="hover-elevate text-destructive"
                    aria-label={t("deleteConversation", locale)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeChat}
                    className="hover-elevate active-elevate-2"
                    data-testid="button-close-chat"
                    aria-label={t("help", locale)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full px-5 py-6" ref={scrollRef}>
                  <div className="space-y-6">
                    {chatMessages.length === 0 && (
                      <div className="rounded-[2rem] border border-dashed border-white/60 bg-white/70 px-6 py-10 text-center text-foreground backdrop-blur dark:bg-white/10">
                        <MessageSquare className="mx-auto mb-5 h-12 w-12 text-primary/80" />
                        <p className="text-lg font-semibold">
                          {t("chatIdleTitle", locale)}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {t("chatIdleSubtitle", locale)}
                        </p>
                        <div
                          className={cn(
                            "mt-6 grid gap-3",
                            isArabic ? "text-right" : "text-left"
                          )}
                        >
                          {idleSuggestions.map((suggestion, index) => (
                            <Button
                              key={`idle-${index}`}
                              type="button"
                              onClick={() => handleIdleSuggestion(suggestion)}
                              variant="outline"
                              className="justify-between rounded-2xl border-white/70 bg-white/95 text-sm font-medium shadow-[0_18px_46px_-36px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:border-white"
                            >
                              <span className="truncate">{suggestion}</span>
                              <Send className="h-4 w-4 opacity-70" />
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {chatMessages.map((msg, index) => {
                      const isUser = msg.role === "user";
                      const isErrorMessage = msg.payload?.kind === "chat-error";
                      const previousMessage = index > 0 ? chatMessages[index - 1] : undefined;
                      const showDivider = shouldShowDivider(previousMessage, msg);
                      const dividerLabel = showDivider
                        ? formatConversationDivider(new Date(msg.timestamp), locale)
                        : null;

                      return (
                        <div key={msg.id} className="space-y-3">
                          {showDivider && dividerLabel && (
                            <div className="flex justify-center">
                              <span className="chat-day-divider">
                                <Clock3 className="h-4 w-4" />
                                {dividerLabel}
                              </span>
                            </div>
                          )}
                          <motion.div
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
                                "max-w-[82%] space-y-3 rounded-[2rem] px-5 py-4 shadow-[0_18px_44px_-32px_rgba(0,0,0,0.25)]",
                                isUser
                                  ? "bg-gradient-to-br from-[#FF7A00] via-[#FF5400] to-[#FF3C00] text-white"
                                  : "bg-white/95 text-foreground backdrop-blur",
                                isErrorMessage && "ring-2 ring-destructive/60"
                              )}
                              data-testid={`chat-message-${msg.role}`}
                            >
                              <div className="space-y-2 text-sm leading-7">
                                {parseMessageSegments(msg.content).map(
                                  (segment, idx) =>
                                    segment.type === "link" ? (
                                      <SmartLinkPill
                                        key={`${msg.id}-link-${idx}`}
                                        linkId={segment.linkId}
                                        className={cn(
                                          "inline-flex",
                                          isUser && "bg-white/90 text-foreground"
                                        )}
                                      />
                                    ) : (
                                      <span
                                        key={`${msg.id}-text-${idx}`}
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

                              {msg.payload?.kind === "chat-error" && (
                                <div className="space-y-2 rounded-2xl bg-white/80 p-4 text-xs font-medium text-foreground shadow-inner">
                                  <p>{msg.payload.data.hint}</p>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="rounded-full bg-gradient-to-r from-[#FF7A00] via-[#FF5400] to-[#FF3C00] text-white shadow-[0_18px_40px_-26px_rgba(255,90,0,0.6)] hover:from-[#FF6A00] hover:to-[#FF3C00]"
                                      onClick={() => handleRetryFromError(msg.payload?.data.retryMessage)}
                                    >
                                      {msg.payload.data.retryLabel}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="rounded-full border-dashed border-primary/40"
                                      onClick={handleContactSupport}
                                    >
                                      {msg.payload.data.supportLabel}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>

                            <span className="mt-2 block text-xs text-muted-foreground">
                              {new Date(msg.timestamp).toLocaleTimeString(
                                isArabic ? "ar-JO" : "en-US",
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </span>
                          </motion.div>
                        </div>
                      );
                    })}

                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div className="flex items-center gap-3 rounded-3xl bg-white/85 px-4 py-3 text-foreground backdrop-blur dark:bg-white/10">
                          <span className="loading-dots" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                          </span>
                          <span className="text-sm">
                            {t("thinking", locale)}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>

              <CardFooter className="flex flex-col gap-5 border-t border-white/70 bg-white/85 px-5 py-4 backdrop-blur">
                {displayedQuickReplies.length > 0 && (
                  <div className="w-full space-y-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      <span>{t("smartSuggestions", locale)}</span>
                      <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground/80">
                        {t("smartSuggestionsHint", locale)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {displayedQuickReplies.map((reply) => (
                        <button
                          key={reply.id}
                          type="button"
                          onClick={() => handleQuickReply(reply.text[locale])}
                          className={cn(
                            "chat-suggestion-card text-start",
                            isArabic && "items-end text-right"
                          )}
                          data-testid={`quick-reply-${reply.id}`}
                        >
                          <span className="text-sm font-semibold leading-5 text-foreground">
                            {reply.text[locale]}
                          </span>
                          <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground/80">
                            {t("quickReplies", locale)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {recommendedSmartLinks.length > 0 && (
                  <div className="w-full">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                      {locale === "ar" ? "روابط أورنج" : "Official Orange links"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {recommendedSmartLinks.map((linkId) => (
                        <SmartLinkPill key={linkId} linkId={linkId} />
                      ))}
                    </div>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex w-full items-center gap-3 rounded-full border border-white/70 bg-white px-4 py-2 shadow-[0_18px_40px_-30px_rgba(255,90,0,0.35)]"
                >
                  <Input
                    ref={inputRef}
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

function shouldShowDivider(
  previous: ChatMessage | undefined,
  current: ChatMessage
): boolean {
  if (!previous) return true;
  const prevDate = new Date(previous.timestamp);
  const currentDate = new Date(current.timestamp);
  return !isSameDay(prevDate, currentDate);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function formatConversationDivider(date: Date, locale: Locale): string {
  const timeFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const midnight = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const today = midnight(new Date());
  const target = midnight(date);
  const diffDays = Math.round((today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return `${t("chatTimestampToday", locale)} – ${timeFormatter.format(date)}`;
  }
  if (diffDays === 1) {
    return `${t("chatTimestampYesterday", locale)} – ${timeFormatter.format(date)}`;
  }
  const dateFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  return `${dateFormatter.format(date)} ${t("chatTimestampAt", locale)} ${timeFormatter.format(date)}`;
}

function getContextualSuggestions(_locale: Locale, raw: string): QuickReply[] {
  const text = raw.trim().toLowerCase();
  if (!text) return [];

  const suggestions: QuickReply[] = [];
  const used = new Set<string>();
  const push = (id: string, en: string, ar: string) => {
    if (used.has(id)) return;
    used.add(id);
    suggestions.push({ id, text: { en, ar } });
  };

  if (/pro.?rata|pro-rata|prorata|بروراتا|تقسيم نسبي/.test(text)) {
    push(
      "pro-example",
      "Calculate a practical pro-rata example",
      "احسب مثال بروراتا عملي"
    );
    push(
      "pro-formula",
      "Explain the pro-rata formula again",
      "اشرح صيغة البروراتا مجددًا"
    );
    push(
      "pro-script",
      "Generate a bilingual billing script",
      "أنشئ نص فوترة ثنائي اللغة"
    );
  }

  if (/invoice|فاتورة|billing|bill/.test(text)) {
    push(
      "invoice-flow",
      "Outline the monthly invoice timeline",
      "لخص مخطط الفاتورة الشهرية"
    );
    push(
      "invoice-vat",
      "Show invoice totals with VAT",
      "أظهر الإجمالي مع الضريبة"
    );
  }

  if (/(?:vat|tax|ضريبة)/.test(text)) {
    push(
      "vat-breakdown",
      "Break down VAT for my total",
      "قسّم الضريبة لقيمتي"
    );
  }

  if (/calculator|حاسبة|price/.test(text)) {
    push(
      "calc-help",
      "Guide me through the price calculator",
      "أرشدني خلال حاسبة الأسعار"
    );
  }

  if (suggestions.length === 0 && text.length > 0) {
    push(
      "follow-up",
      "Suggest another tool I can use",
      "اقترح أداة أخرى أستطيع استخدامها"
    );
  }

  return suggestions;
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
