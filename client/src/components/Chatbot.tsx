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
import {
  MessageSquare,
  Send,
  X,
  Trash2,
  Maximize2,
  Minimize2,
} from "lucide-react";
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

/**
 * Chatbot.tsx — Orange style (no attachments) + Maximize/Restore
 * Production-ready: clean code, RTL, SSE/JSON, deep-link smart links, docs navigator,
 * single-message delete + full chat clear with confirmation, lazy effects, robust abort.
 */

export function Chatbot() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const handledNavigatePayloads = useRef<Set<string>>(new Set());
  const handledDocsUpdates = useRef<Set<string>>(new Set());
  const hasSeededNavigate = useRef(false);

  const { isChatOpen, setChatOpen, chatMessages, addChatMessage, locale } =
    useAppStore();

  const { toast } = useToast();
  const isArabic = locale === "ar";

  // ===== Smart links recommendations (top-3 based on latest input) =====
  const recommendedSmartLinks = useMemo(() => {
    const latestInput = message.trim()
      ? message
      : [...chatMessages]
          .reverse()
          .find((msg) => msg.role === "user" && msg.content.trim())?.content ??
        "";
    const matches = latestInput
      ? getSmartLinkCandidates(latestInput).map((l) => l.id)
      : [];
    if (matches.length > 0) return Array.from(new Set(matches)).slice(0, 3);
    return listSmartLinks()
      .map((l) => l.id)
      .slice(0, 3);
  }, [chatMessages, message]);

  // ===== Auto-scroll on new messages =====
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isLoading]);

  // ===== Cleanup in-flight requests on unmount =====
  useEffect(() => () => abortRef.current?.abort(), []);

  // ===== Fetch docs list =====
  const fetchDocs = useCallback(async () => {
    try {
      const response = await fetch("/api/docs");
      if (!response.ok) throw new Error("Failed to load docs");
      const data: { docs?: DocEntry[] } = await response.json();
      if (Array.isArray(data.docs)) setDocs(data.docs);
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

  // ===== Open a selected doc =====
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

  // ===== Load docs when chat opens =====
  useEffect(() => {
    if (isChatOpen) fetchDocs();
  }, [isChatOpen, fetchDocs]);

  // ===== Refresh docs on docs-update payloads =====
  useEffect(() => {
    const latestUpdate = [...chatMessages]
      .reverse()
      .find((m) => m.payload?.kind === "docs-update");
    if (latestUpdate && !handledDocsUpdates.current.has(latestUpdate.id)) {
      handledDocsUpdates.current.add(latestUpdate.id);
      fetchDocs();
    }
  }, [chatMessages, fetchDocs]);

  // ===== Handle navigate-doc payloads =====
  useEffect(() => {
    if (!hasSeededNavigate.current) {
      chatMessages.forEach((m) => {
        if (m.payload?.kind === "navigate-doc") {
          handledNavigatePayloads.current.add(m.id);
        }
      });
      hasSeededNavigate.current = true;
      return;
    }
    chatMessages.forEach((m) => {
      if (m.payload?.kind !== "navigate-doc") return;
      if (handledNavigatePayloads.current.has(m.id)) return;
      handledNavigatePayloads.current.add(m.id);
      handleDocSelect(m.payload.doc);
    });
  }, [chatMessages, handleDocSelect]);

  // ===== Deletion helpers =====
  const deleteMessage = useCallback((id: string) => {
    useAppStore.setState((state) => ({
      chatMessages: state.chatMessages.filter((m) => m.id !== id),
    }));
  }, []);

  const clearChat = useCallback(() => {
    useAppStore.setState({ chatMessages: [] });
  }, []);

  // ===== Send message (JSON or SSE) =====
  const handleSend = useCallback(
    async (text?: string) => {
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

      // Temp assistant message for streaming
      const assistantMessageId = (Date.now() + 1).toString();
      const tempAssistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };
      addChatMessage(tempAssistantMessage);

      // Abort previous
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
            if (data === "[DONE]") break;
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
              if (parsed?.error) throw new Error(parsed.error as string);
            } catch {
              /* ignore partial lines */
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
    },
    [message, isLoading, addChatMessage, chatMessages, locale]
  );

  const handleQuickReply = useCallback(
    (replyText: string) => handleSend(replyText),
    [handleSend]
  );

  const openChat = useCallback(
    (max = false) => {
      setChatOpen(true);
      setIsMaximized(!!max);
    },
    [setChatOpen]
  );

  const closeChat = useCallback(() => {
    setChatOpen(false);
    setIsMaximized(false);
    abortRef.current?.abort();
  }, [setChatOpen]);

  // Labels
  const lblMax = isArabic ? "تكبير" : "Maximize";
  const lblRestore = isArabic ? "استعادة" : "Restore";
  const lblOpenMax = isArabic ? "فتح مكبّر" : "Open Maximize";

  return (
    <>
      {/* Floating actions */}
      <AnimatePresence>
        {!isChatOpen && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-3"
            style={{ direction: "ltr" }}
          >
            {/* Open Maximize pill */}
            <Button
              onClick={() => openChat(true)}
              className="hidden sm:inline-flex h-10 rounded-full bg-white/90 px-4 text-sm font-medium text-foreground shadow-[0_16px_36px_-24px_rgba(0,0,0,0.25)] hover:bg-white"
              aria-label={lblOpenMax}
            >
              <Maximize2 className="mr-2 h-4 w-4" />
              {lblOpenMax}
            </Button>

            {/* Regular round button */}
            <Button
              size="icon"
              onClick={() => openChat(false)}
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
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ type: "spring", damping: 28, stiffness: 210 }}
            className={cn(
              "fixed inset-0 z-50 flex",
              isMaximized
                ? "items-center justify-center p-2 sm:p-6"
                : isArabic
                ? "items-stretch justify-start"
                : "items-stretch justify-end"
            )}
            style={{ direction: isArabic ? "rtl" : "ltr" }}
            data-testid="chat-panel"
          >
            <Card
              className={cn(
                "flex h-full flex-col border-0 bg-white/75 backdrop-blur-2xl dark:bg-white/10 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.55)]",
                isMaximized
                  ? "w-[min(1200px,96vw)] h-[min(90vh,96vh)] rounded-[2rem] border border-white/40"
                  : "w-full sm:w-[520px] md:w-[560px] sm:rounded-l-[2.5rem] sm:border sm:border-white/40"
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-white/50 pb-4 dark:border-white/10">
                <CardTitle className="flex items-center gap-2 text-[1.05rem]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF7A00] via-[#FF5400] to-[#FF3C00] text-white">
                    <MessageSquare className="h-5 w-5" />
                  </span>
                  {t("chatTitle", locale)}
                </CardTitle>

                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Toggle Maximize/Restore */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMaximized((v) => !v)}
                    className="rounded-full px-3 hover:bg-white/70"
                    aria-label={isMaximized ? lblRestore : lblMax}
                    data-testid="button-toggle-maximize"
                  >
                    {isMaximized ? (
                      <>
                        <Minimize2 className="h-4 w-4" />
                        <span className="ml-2 hidden sm:inline">
                          {lblRestore}
                        </span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="h-4 w-4" />
                        <span className="ml-2 hidden sm:inline">{lblMax}</span>
                      </>
                    )}
                  </Button>

                  {/* Docs navigator */}
                  <DocsNavigator
                    docs={docs}
                    locale={locale}
                    onSelect={handleDocSelect}
                  />

                  {/* Close */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeChat}
                    className="hover-elevate active-elevate-2"
                    data-testid="button-close-chat"
                    aria-label={isArabic ? "إغلاق" : "Close"}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea
                  className={cn("h-full", isMaximized ? "p-6" : "p-5")}
                  ref={scrollRef}
                >
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
                            "flex w/full",
                            isUser ? "justify-end" : "justify-start"
                          )}
                        >
                          <div className="relative group">
                            <div
                              className={cn(
                                "max-w-[82%] space-y-3 rounded-[1.9rem] px-5 py-4 shadow-[0_18px_44px_-32px_rgba(0,0,0,0.25)]",
                                isUser
                                  ? "bg-gradient-to-br from-[#FF7A00] via-[#FF5400] to-[#FF3C00] text-white"
                                  : "bg-white/90 text-foreground backdrop-blur",
                                isErrorMessage && "ring-2 ring-destructive/60"
                              )}
                              data-testid={`chat-message-${msg.role}`}
                            >
                              {/* Delete single message */}
                              <button
                                onClick={() => deleteMessage(msg.id)}
                                className={cn(
                                  "absolute top-2 hidden rounded-full bg-white/80 p-1 text-foreground shadow-sm group-hover:block",
                                  isUser ? "left-2" : "right-2"
                                )}
                                title={
                                  isArabic ? "حذف الرسالة" : "Delete message"
                                }
                                aria-label={
                                  isArabic ? "حذف الرسالة" : "Delete message"
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>

                              {/* Content + SmartLink pills parsing */}
                              <div className="space-y-2 text-[0.95rem] leading-7">
                                {parseMessageSegments(msg.content).map(
                                  (segment, index) =>
                                    segment.type === "link" ? (
                                      <SmartLinkPill
                                        key={`${msg.id}-link-${index}`}
                                        linkId={segment.linkId}
                                        className={cn(
                                          "inline-flex",
                                          isUser &&
                                            "bg-white/90 text-foreground"
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
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>
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

              <CardFooter
                className={cn(
                  "flex flex-col gap-5 border-t border-white/70 bg-white/80 px-5 py-4 backdrop-blur",
                  isMaximized && "px-6"
                )}
              >
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

                {/* Input row */}
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
                    aria-label={t("send", locale)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>

                {/* Danger zone: clear chat */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="secondary"
                    className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                    onClick={() => setShowConfirm(true)}
                    data-testid="button-open-clear"
                  >
                    <Trash2 className="h-4 w-4" />
                    {locale === "ar" ? "حذف المحادثة" : "Clear chat"}
                  </Button>

                  {isLoading ? (
                    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="loading-ring" /> {t("thinking", locale)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                     🧡 Ready
                    </span>
                  )}
                </div>
              </CardFooter>
            </Card>

            {/* Clear confirmation modal */}
            <AnimatePresence>
              {showConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[60] bg-black/40"
                  onClick={() => setShowConfirm(false)}
                >
                  <div
                    className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <motion.div
                      initial={{ y: 40 }}
                      animate={{ y: 0 }}
                      exit={{ y: 40 }}
                      className="mx-auto w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
                      role="dialog"
                      aria-modal="true"
                    >
                      <h3 className="mb-2 text-base font-semibold">
                        {locale === "ar" ? "تأكيد الحذف" : "Confirm deletion"}
                      </h3>
                      <p className="mb-4 text-sm text-muted-foreground">
                        {locale === "ar"
                          ? "هل أنت متأكد من حذف جميع الرسائل؟ لا يمكن التراجع."
                          : "Are you sure you want to delete all messages? This cannot be undone."}
                      </p>
                      <div
                        className={cn(
                          "flex gap-2",
                          isArabic ? "flex-row-reverse" : ""
                        )}
                      >
                        <Button
                          onClick={() => {
                            clearChat();
                            setShowConfirm(false);
                          }}
                          className="flex-1 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white"
                          data-testid="button-confirm-clear"
                        >
                          {locale === "ar" ? "تأكيد" : "Confirm"}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => setShowConfirm(false)}
                          className="flex-1 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium"
                          data-testid="button-cancel-clear"
                        >
                          {locale === "ar" ? "إلغاء" : "Cancel"}
                        </Button>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ===== Helpers (link parsing) ===== */

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

  return segments.length === 0 ? [{ type: "text", content }] : segments;
}

/* ===== Prorata widgets ===== */

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
        <p
          dir={isArabic ? "rtl" : "ltr"}
          className="max-h-48 overflow-y-auto text-xs leading-6 whitespace-normal text-foreground"
        >
          {data.script}
        </p>
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
