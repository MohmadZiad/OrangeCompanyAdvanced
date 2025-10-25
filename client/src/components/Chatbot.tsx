// client/src/components/Chatbot.tsx
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
import { AnimatePresence, motion } from "framer-motion";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { isChatOpen, setChatOpen, chatMessages, addChatMessage, locale } =
    useAppStore();

  const { toast } = useToast();
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const handledNavigatePayloads = useRef<Set<string>>(new Set());
  const hasSeededNavigate = useRef(false);
  const handledDocsUpdates = useRef<Set<string>>(new Set());

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const fetchDocs = useCallback(async () => {
    try {
      const response = await fetch("/api/docs");
      if (!response.ok) throw new Error("Failed to load docs");
      const data: { docs?: DocEntry[] } = await response.json();
      if (Array.isArray(data.docs)) {
        setDocs(data.docs);
      }
    } catch (error) {
      toast({
        title: locale === "ar" ? "تعذر تحميل المستندات" : "Docs unavailable",
        description:
          locale === "ar"
            ? "حدث خطأ أثناء تحميل قائمة المستندات."
            : "We couldn't load the docs list just now.",
      });
    }
  }, [toast, locale]);

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

  useEffect(() => {
    if (isChatOpen) {
      fetchDocs();
    }
  }, [isChatOpen, fetchDocs]);

  useEffect(() => {
    const latestUpdate = [...chatMessages]
      .reverse()
      .find((msg) => msg.payload?.kind === "docs-update");
    if (latestUpdate && !handledDocsUpdates.current.has(latestUpdate.id)) {
      handledDocsUpdates.current.add(latestUpdate.id);
      fetchDocs();
    }
  }, [chatMessages, fetchDocs]);

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

    const assistantMessageId = (Date.now() + 1).toString();
    const tempAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    addChatMessage(tempAssistantMessage);

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

      if (contentType.includes("application/json")) {
        const data = await response.json();
        if (data?.message) {
          const assistantMessage = data.message as ChatMessage;
          useAppStore.setState((state) => ({
            chatMessages: state.chatMessages.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...assistantMessage,
                    id: assistantMessageId,
                  }
                : msg
            ),
          }));
        }
        return;
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;
          if (data === "[DONE]") {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed?.content) {
              accumulated += parsed.content;
              useAppStore.setState((state) => ({
                chatMessages: state.chatMessages.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: accumulated }
                    : msg
                ),
              }));
            }
            if (parsed?.error) {
              throw new Error(parsed.error);
            }
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
    } catch (err) {
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

  const isArabic = locale === "ar";

  return (
    <>
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

      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
          >
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={closeChat}
            />
            <motion.div
              initial={{ y: isArabic ? -40 : 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: isArabic ? -40 : 40, opacity: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 220 }}
              className="relative z-10 w-full max-w-4xl"
            >
              <Card
                dir={isArabic ? "rtl" : "ltr"}
                className="flex max-h-[80vh] flex-col overflow-hidden rounded-[2.5rem] border-white/60 bg-white/85 shadow-[0_42px_120px_-48px_rgba(255,90,0,0.6)] backdrop-blur-xl dark:bg-white/10"
                data-testid="chat-panel"
              >
                <CardHeader className="space-y-4 bg-gradient-to-br from-[#FFE7D6] via-[#FFE0CC] to-[#FFD5BA] px-8 py-6">
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <span className="flex h-12 w-12 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-[#FF7A00] via-[#FF5400] to-[#FF3C00] text-white shadow-[0_24px_60px_-30px_rgba(255,90,0,0.75)]">
                        <MessageSquare className="h-5 w-5" />
                      </span>
                      <span>{t("chatTitle", locale)}</span>
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <DocsNavigator
                        docs={docs}
                        locale={locale}
                        onSelect={handleDocSelect}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={closeChat}
                        className="rounded-full hover:bg-white/60"
                        data-testid="button-close-chat"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isArabic
                      ? "تحدث مباشرة مع المساعد ثنائي اللغة، أو اختر مستندًا لفتحه في تبويب جديد."
                      : "Chat with the bilingual assistant or open a doc instantly in a new tab."}
                  </p>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden px-0">
                  <ScrollArea className="h-full px-8" ref={scrollRef}>
                    <div className="space-y-5 py-6">
                      {chatMessages.length === 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-[2rem] border border-dashed border-white/60 bg-white/75 px-8 py-12 text-center text-muted-foreground shadow-inner backdrop-blur"
                        >
                          <MessageSquare className="mx-auto mb-4 h-12 w-12 text-primary/60" />
                          <p className="text-sm">{t("chatPlaceholder", locale)}</p>
                        </motion.div>
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
                          </motion.div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>

                <CardFooter className="flex flex-col gap-5 border-t border-white/70 bg-white/80 px-8 py-6 backdrop-blur">
                  {quickReplies.length > 0 && chatMessages.length === 0 && (
                    <div className="flex w-full flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {t("quickReplies", locale)}
                      </span>
                      {quickReplies.map((reply) => (
                        <Badge
                          key={reply.id}
                          className="cursor-pointer rounded-full bg-white px-3 py-2 text-xs font-medium text-foreground shadow-sm transition hover:-translate-y-1"
                          onClick={() => handleQuickReply(reply.text[locale])}
                          data-testid={`quick-reply-${reply.id}`}
                        >
                          {reply.text[locale]}
                        </Badge>
                      ))}
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
                    className="flex w-full items-center gap-3 rounded-full border border-white/70 bg-white
