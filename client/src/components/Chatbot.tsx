// client/src/components/Chatbot.tsx
import { useState, useRef, useEffect } from "react";
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
import type { ChatMessage } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

export function Chatbot() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { isChatOpen, setChatOpen, chatMessages, addChatMessage, locale } =
    useAppStore();

  // autoscroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // cleanup على الإزالة
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

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

    // رسالة مؤقتة للمساعد (البث)
    const assistantMessageId = (Date.now() + 1).toString();
    const tempAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    addChatMessage(tempAssistantMessage);

    // إلغاء أي طلب سابق
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: ac.signal,
      });

      if (!response.ok) throw new Error("Failed to get response");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // SSE lines
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;
          if (data === "[DONE]") {
            // خلصنا
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
            // تجاهل الأسطر غير المكتملة
          }
        }
      }

      // تأكيد الحفظ النهائي
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
      // خطأ: استبدل الرسالة المؤقتة برسالة خطأ ودية
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

  return (
    <>
      {/* زر عائم لفتح الشات */}
      <AnimatePresence>
        {!isChatOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
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
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                  {chatMessages.filter((m) => m.role === "assistant").length}
                </span>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* لوحة الشات */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ x: locale === "ar" ? -400 : 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: locale === "ar" ? -400 : 400, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "fixed top-0 bottom-0 z-50 w-full sm:w-[420px] shadow-[0_30px_70px_-40px_rgba(0,0,0,0.55)]",
              locale === "ar" ? "left-0" : "right-0"
            )}
            style={{ direction: locale === "ar" ? "rtl" : "ltr" }}
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setChatOpen(false)}
                  className="hover-elevate active-elevate-2"
                  data-testid="button-close-chat"
                >
                  <X className="h-5 w-5" />
                </Button>
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
                      const isErrorMessage =
                        msg.role === "assistant" &&
                        /عذرًا|sorry/i.test(msg.content);
                      const isSuccessMessage =
                        msg.role === "assistant" && !isErrorMessage;

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "flex",
                            msg.role === "user" ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[85%] rounded-3xl px-4 py-3 shadow-sm backdrop-blur",
                              msg.role === "user"
                                ? "bg-gradient-to-br from-[#FF7A00] via-[#FF5400] to-[#FF3C00] text-white"
                                : "bg-white/80 text-foreground dark:bg-white/10",
                              isErrorMessage && "animate-[wiggle_0.45s]",
                              isSuccessMessage && "animate-[successPulse_0.9s]"
                            )}
                            data-testid={`chat-message-${msg.role}`}
                          >
                            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                              {msg.content}
                            </p>
                            <span className="mt-2 block text-xs opacity-70">
                              {new Date(msg.timestamp).toLocaleTimeString(
                                locale === "ar" ? "ar-JO" : "en-US",
                                { hour: "2-digit", minute: "2-digit" }
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

              <CardFooter className="flex-col gap-4 border-t border-white/40 p-5 dark:border-white/10">
                {/* Quick Replies */}
                {chatMessages.length === 0 && (
                  <div className="w-full">
                    <p className="text-xs text-muted-foreground mb-2">
                      {t("quickReplies", locale)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {quickReplies.map((reply) => (
                        <Badge
                          key={reply.id}
                          variant="secondary"
                          className="cursor-pointer rounded-full bg-white/80 px-3 py-2 text-xs font-medium text-foreground shadow-sm backdrop-blur transition hover:-translate-y-1 dark:bg-white/10"
                          onClick={() => handleQuickReply(reply.text[locale])}
                          data-testid={`quick-reply-${reply.id}`}
                        >
                          {reply.text[locale]}
                        </Badge>
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
                  className="flex w-full gap-3"
                >
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t("chatPlaceholder", locale)}
                    disabled={isLoading}
                    className="flex-1"
                    data-testid="input-chat-message"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!message.trim() || isLoading}
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
