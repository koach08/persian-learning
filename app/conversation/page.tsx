"use client";

import { useState, useRef, useEffect } from "react";
import PersianText from "@/components/PersianText";
import AudioPlayer from "@/components/AudioPlayer";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const THEMES = [
  { label: "自由会話", prompt: "سلام! بیا فارسی حرف بزنیم." },
  { label: "食事", prompt: "بیا درباره غذا حرف بزنیم. غذای مورد علاقه‌ات چیه؟" },
  { label: "家族紹介", prompt: "از خانواده‌ات بگو." },
  { label: "天気", prompt: "هوا امروز چطوره؟" },
  { label: "買い物", prompt: "بریم خرید! چی می‌خوای بخری؟" },
  { label: "日常会話", prompt: "امروز چه کار کردی؟" },
];

export default function ConversationPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [correctionMode, setCorrectionMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          mode: correctionMode ? "correction" : "conversation",
        }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.content }]);
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "エラーが発生しました。もう一度お試しください。" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startTheme = (prompt: string) => {
    setMessages([]);
    sendMessage(prompt);
  };

  const hasPersian = (text: string) => /[\u0600-\u06FF]/.test(text);

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900">AIフリートーク</h1>
          <label className="flex items-center gap-2 text-sm">
            <span className={correctionMode ? "text-purple-600 font-medium" : "text-gray-500"}>
              添削
            </span>
            <button
              onClick={() => setCorrectionMode(!correctionMode)}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                correctionMode ? "bg-purple-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  correctionMode ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        </div>

        {messages.length === 0 && (
          <div>
            <p className="text-sm text-gray-500 mb-3">テーマを選んで会話を始めよう</p>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((theme) => (
                <button
                  key={theme.label}
                  onClick={() => startTheme(theme.prompt)}
                  className="p-3 bg-white rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:border-purple-200 transition-colors"
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-slide-in`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.role === "user"
                  ? "bg-purple-500 text-white rounded-br-sm"
                  : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
              }`}
            >
              {hasPersian(msg.content) ? (
                <div>
                  <PersianText size="md" className={msg.role === "user" ? "text-white" : "text-gray-800"}>
                    {msg.content}
                  </PersianText>
                  {msg.role === "assistant" && (
                    <div className="mt-2 flex justify-end">
                      <AudioPlayer text={msg.content} className="!w-8 !h-8" />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && sendMessage(input)}
            placeholder="ペルシア語で話してみよう..."
            className="flex-1 p-3 rounded-xl border border-gray-200 bg-gray-50 text-sm"
            dir="auto"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="px-4 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
