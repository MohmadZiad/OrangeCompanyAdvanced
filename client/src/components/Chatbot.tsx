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
import { MessageSquare, Send, X, Loader2 } from "lucide-react";
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
              className="h-14 w-14 rounded-full shadow-lg hover-elevate active-elevate-2"
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
              "fixed top-0 bottom-0 w-full sm:w-[400px] z-50 shadow-2xl",
              locale === "ar" ? "left-0" : "right-0"
            )}
            style={{ direction: locale === "ar" ? "rtl" : "ltr" }}
            data-testid="chat-panel"
          >
            <Card className="h-full flex flex-col rounded-none sm:rounded-l-2xl border-0 sm:border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
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
                <ScrollArea className="h-full p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {chatMessages.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">
                          {t("chatPlaceholder", locale)}
                        </p>
                      </div>
                    )}

                    {chatMessages.map((msg) => (
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
                            "max-w-[85%] rounded-2xl px-4 py-2",
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          )}
                          data-testid={`chat-message-${msg.role}`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                          <span className="text-xs opacity-70 mt-1 block">
                            {new Date(msg.timestamp).toLocaleTimeString(
                              locale === "ar" ? "ar-JO" : "en-US",
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </span>
                        </div>
                      </motion.div>
                    ))}

                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div className="bg-muted text-foreground rounded-2xl px-4 py-2 flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">
                            {t("thinking", locale)}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>

              <CardFooter className="flex-col gap-3 border-t p-4">
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
                          className="cursor-pointer hover-elevate active-elevate-2"
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
                  className="flex w-full gap-2"
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
