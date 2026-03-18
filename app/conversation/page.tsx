"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getCEFRProgress, CEFR_LEVELS } from "@/lib/level-manager";
import type { CEFRLevel } from "@/lib/level-manager";
import { useAudioRecorder } from "@/lib/use-audio-recorder";
import { useTTS } from "@/lib/use-tts";
import { recordActivity, getStreak } from "@/lib/streak";
import {
  createSession,
  addMessageToSession,
  extractVocab,
  saveSession,
  getLastSession,
  addVocabToSRS,
  type ConversationSession,
} from "@/lib/conversation-session";
import PersianText from "@/components/PersianText";
import { apiUrl } from "@/lib/api-config";

interface Message {
  role: "user" | "assistant";
  content: string;
  displayContent?: string;
}

interface SuggestedReply {
  persian: string;
  romanization: string;
  japanese: string;
}

interface ReviewData {
  praise: string;
  improvements: { wrong: string; correct: string; explanation: string }[];
  newExpressions: { persian: string; romanization: string; japanese: string }[];
}

type ConversationState =
  | "idle"
  | "ai-speaking"
  | "user-turn"
  | "recording"
  | "transcribing"
  | "ai-thinking"
  | "summary";

interface ScenarioTheme {
  label: string;
  emoji: string;
  instruction: string;
  roleDescription?: string;
}

const THEMES_BY_LEVEL: Record<CEFRLevel, ScenarioTheme[]> = {
  A1: [
    {
      label: "カフェでチャイを注文",
      emoji: "☕",
      instruction: "You are a cafe staff in Tehran. Greet the customer warmly and ask what they'd like to drink. Use very simple Persian.",
      roleDescription: "あなた＝客、ミーナ＝カフェ店員",
    },
    {
      label: "ホテルへの道を聞く",
      emoji: "🗺️",
      instruction: "You are a friendly passerby in Tehran. The student will ask for directions to a hotel. Give simple directions using very basic Persian.",
      roleDescription: "あなた＝旅行者、ミーナ＝通行人",
    },
    {
      label: "自己紹介する",
      emoji: "👋",
      instruction: "You are the student's Iranian mother-in-law meeting them for the first time. Greet them warmly and ask about themselves in very simple Persian.",
      roleDescription: "あなた＝本人、ミーナ＝義母",
    },
    {
      label: "バザールで果物を買う",
      emoji: "🛒",
      instruction: "You are a fruit seller at a bazaar in Tehran. Greet the customer, show your fruits, and ask what they want to buy. Use very simple Persian with prices.",
      roleDescription: "あなた＝客、ミーナ＝売り手",
    },
  ],
  A2: [
    {
      label: "タクシーで目的地を伝える",
      emoji: "🚕",
      instruction: "You are a taxi driver in Tehran. Ask the passenger where they want to go. Discuss the route and fare in simple Persian.",
      roleDescription: "あなた＝乗客、ミーナ＝タクシー運転手",
    },
    {
      label: "薬局で風邪薬を買う",
      emoji: "🏥",
      instruction: "You are a pharmacist. The customer has a cold. Ask about their symptoms and recommend medicine in simple Persian.",
      roleDescription: "あなた＝客、ミーナ＝薬剤師",
    },
    {
      label: "電話でレストランを予約",
      emoji: "📱",
      instruction: "You are a restaurant receptionist answering a phone call. Ask about the date, time, and number of guests in Persian.",
      roleDescription: "あなた＝客、ミーナ＝レストラン受付",
    },
    {
      label: "レストランで料理について聞く",
      emoji: "🍽️",
      instruction: "You are a waiter at a traditional Iranian restaurant. Present the menu and explain dishes. Ask what the customer would like to order.",
      roleDescription: "あなた＝客、ミーナ＝ウェイター",
    },
  ],
  B1: [
    {
      label: "旅行計画を話し合う",
      emoji: "✈️",
      instruction: "Start by asking the student about travel plans or a dream destination in Iran. Share your own recommendations.",
      roleDescription: "あなた＝旅行計画中、ミーナ＝友人",
    },
    {
      label: "イラン文化について語る",
      emoji: "🏛️",
      instruction: "Start by introducing Nowruz or an Iranian cultural tradition. Ask the student about their experience with Iranian culture.",
      roleDescription: "あなた＝外国人、ミーナ＝イラン人の友人",
    },
    {
      label: "仕事について話す",
      emoji: "💼",
      instruction: "Start by asking about the student's job or career. Share opinions about work-life balance in Iran.",
      roleDescription: "あなた＝本人、ミーナ＝同僚",
    },
    {
      label: "家族との食事会で雑談",
      emoji: "🍕",
      instruction: "You are at a family dinner. Make small talk about food, weekend plans, and family news in natural conversational Farsi.",
      roleDescription: "あなた＝本人、ミーナ＝義姉",
    },
  ],
  B2: [
    {
      label: "社会問題について議論",
      emoji: "📰",
      instruction: "Start a discussion about online education or a social topic in Iran. Share nuanced opinions.",
      roleDescription: "あなた＝ディスカッション参加者、ミーナ＝大学の友人",
    },
    {
      label: "ディベート",
      emoji: "⚖️",
      instruction: "Propose a debatable topic about modern life and share your opinion first. Challenge the student to argue.",
      roleDescription: "あなた＝対論者、ミーナ＝ディベート相手",
    },
    {
      label: "映画・本について語る",
      emoji: "🎬",
      instruction: "Recommend a Persian movie or book and ask the student about their favorites. Discuss themes and characters.",
      roleDescription: "あなた＝映画好き、ミーナ＝友人",
    },
    {
      label: "将来の夢を語り合う",
      emoji: "🌟",
      instruction: "Share a dream about the future and ask the student about theirs. Discuss ambitions and life goals.",
      roleDescription: "あなた＝本人、ミーナ＝親友",
    },
  ],
  C1: [
    {
      label: "学術論文について議論",
      emoji: "🎓",
      instruction: "Discuss a research paper or academic topic. Use formal academic Persian, complex sentence structures, and specialized vocabulary. Challenge the student with nuanced questions.",
      roleDescription: "あなた＝研究者、ミーナ＝同僚研究者",
    },
    {
      label: "政治と人権を議論",
      emoji: "🏛️",
      instruction: "Engage in a sophisticated discussion about democracy, human rights, or political philosophy. Use formal register with complex arguments and counterarguments in Persian.",
      roleDescription: "あなた＝政治学者、ミーナ＝ジャーナリスト",
    },
    {
      label: "文学作品を批評する",
      emoji: "📖",
      instruction: "Discuss Persian literature — Hafez, Rumi, or modern Iranian novels. Analyze themes, symbolism, and cultural significance using literary Persian.",
      roleDescription: "あなた＝文学愛好家、ミーナ＝文学教授",
    },
    {
      label: "ビジネス戦略を提案",
      emoji: "📊",
      instruction: "Present and discuss a business strategy for the Iranian market. Use formal business Persian with economic terminology and strategic analysis.",
      roleDescription: "あなた＝コンサルタント、ミーナ＝CEO",
    },
  ],
  C2: [
    {
      label: "ハーフェズの詩を解釈する",
      emoji: "🌹",
      instruction: "Engage in deep literary analysis of Hafez's ghazals. Use highly poetic Persian with classical references, metaphors (تمثیل), and mystical vocabulary (عرفان). Quote actual verses when possible.",
      roleDescription: "あなた＝詩の愛好家、ミーナ＝文学研究者",
    },
    {
      label: "風刺とユーモアで社会を語る",
      emoji: "🎭",
      instruction: "Use sophisticated Persian satire and humor to discuss social issues. Employ wordplay (جناس), irony, and cultural references that only a near-native speaker would catch.",
      roleDescription: "あなた＝コメディアン、ミーナ＝知識人",
    },
    {
      label: "哲学的対話：存在と自由",
      emoji: "💎",
      instruction: "Engage in an existential philosophical dialogue about freedom, identity, and meaning. Use the highest register of Persian with abstract concepts and rhetorical sophistication.",
      roleDescription: "あなた＝哲学者、ミーナ＝思想家",
    },
  ],
};

// Scenario keys for URL-based navigation from home page
const SCENARIO_MAP: Record<string, { level: CEFRLevel; index: number }> = {
  "cafe-order": { level: "A1", index: 0 },
  "ask-directions": { level: "A1", index: 1 },
  "self-intro": { level: "A1", index: 2 },
  "bazaar-shopping": { level: "A1", index: 3 },
  "taxi": { level: "A2", index: 0 },
  "pharmacy": { level: "A2", index: 1 },
  "restaurant-reservation": { level: "A2", index: 2 },
  "restaurant-order": { level: "A2", index: 3 },
};

import { Suspense } from "react";

function ConversationPageInner() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [level, setLevel] = useState<CEFRLevel>("A1");
  const [suggestions, setSuggestions] = useState<SuggestedReply[]>([]);
  const [conversationState, setConversationState] = useState<ConversationState>("idle");
  const [showTextInput, setShowTextInput] = useState(false);
  const [session, setSession] = useState<ConversationSession | null>(null);
  const [currentTheme, setCurrentTheme] = useState("");
  const [srsAddedCount, setSrsAddedCount] = useState(0);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [streakCount, setStreakCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendMessageRef = useRef<(text: string) => Promise<void>>(undefined);
  const sessionRef = useRef<ConversationSession | null>(null);
  const autoStartDone = useRef(false);

  const { isRecording, isTranscribing, transcribedText, startRecording, stopRecording, clearText } =
    useAudioRecorder();
  const tts = useTTS();

  // Keep sessionRef in sync
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const progress = getCEFRProgress();
    setLevel(progress.currentLevel);
    setStreakCount(getStreak());
  }, []);

  // Auto-start scenario from URL param
  useEffect(() => {
    if (autoStartDone.current) return;
    const scenario = searchParams.get("scenario");
    if (scenario && SCENARIO_MAP[scenario]) {
      autoStartDone.current = true;
      const { level: sLevel, index } = SCENARIO_MAP[scenario];
      const theme = THEMES_BY_LEVEL[sLevel][index];
      if (theme) {
        setLevel(sLevel);
        // Small delay to ensure component is mounted
        setTimeout(() => {
          startThemeDirect(theme, sLevel);
        }, 100);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sync recording/transcribing states
  useEffect(() => {
    if (isRecording) setConversationState("recording");
    else if (isTranscribing) setConversationState("transcribing");
  }, [isRecording, isTranscribing]);

  // Auto-send when transcription completes
  useEffect(() => {
    if (transcribedText && !isTranscribing) {
      setInput(transcribedText);
      sendMessageRef.current?.(transcribedText);
      clearText();
    }
  }, [transcribedText, isTranscribing, clearText]);

  const themes = THEMES_BY_LEVEL[level];

  const parseSuggestions = (text: string): SuggestedReply[] => {
    const replies: SuggestedReply[] = [];
    const lines = text.split("\n");
    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+?)\s*\(([^)]+)\)\s*[—\-–]\s*(.+)$/);
      if (match) {
        replies.push({
          persian: match[1].trim(),
          romanization: match[2].trim(),
          japanese: match[3].trim(),
        });
      }
    }
    return replies;
  };

  const getDisplayContent = (text: string): string => {
    return text.replace(/💬\s*返答例[:：][\s\S]*$/, "").trim();
  };

  const extractPersianOnly = (text: string): string => {
    return text
      .replace(/💬\s*返答例[:：][\s\S]*$/, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/📝.*/g, "")
      .replace(/[a-zA-Z0-9âêîôûāēīōūáéíóú]+/g, "")
      .replace(/[^\u0600-\u06FF\u200c\s!?؟،.۰-۹]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  /** Process AI response: extract vocab, update session, set suggestions */
  const processAIResponse = useCallback(
    (rawContent: string, currentMessages: Message[], currentSession: ConversationSession | null) => {
      const { displayText, vocab } = extractVocab(rawContent);

      const assistantMsg: Message = {
        role: "assistant",
        content: rawContent,
        displayContent: displayText,
      };
      const updatedMessages = [...currentMessages, assistantMsg];
      setMessages(updatedMessages);
      setSuggestions(parseSuggestions(displayText));

      if (currentSession) {
        const updatedSession = addMessageToSession(
          currentSession,
          { role: "assistant", content: rawContent },
          vocab
        );
        setSession(updatedSession);
        saveSession(updatedSession);
      }

      return { displayText, updatedMessages };
    },
    []
  );

  /** AI speaks first — used when starting a new theme */
  const fetchAIGreeting = useCallback(
    async (themeInstruction: string, newSession: ConversationSession, lvl: CEFRLevel) => {
      setConversationState("ai-thinking");

      try {
        const res = await fetch(apiUrl("/api/chat"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [],
            mode: "conversation",
            level: lvl,
            context: `${themeInstruction} You are starting the conversation — greet the student warmly and begin. The student hasn't said anything yet.`,
          }),
        });
        const data = await res.json();
        const rawContent = data.content || "";

        const { displayText } = processAIResponse(rawContent, [], newSession);

        setConversationState("user-turn");

        return displayText;
      } catch {
        setMessages([
          { role: "assistant", content: "エラーが発生しました。もう一度お試しください。" },
        ]);
        setConversationState("user-turn");
      }
    },
    [processAIResponse]
  );

  /** Send user message and get AI response */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      const userMsg: Message = { role: "user", content: text.trim() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setConversationState("ai-thinking");
      setSuggestions([]);

      const currentSession = sessionRef.current;
      let updatedSession = currentSession;
      if (updatedSession) {
        updatedSession = addMessageToSession(updatedSession, {
          role: "user",
          content: text.trim(),
        });
        setSession(updatedSession);
      }

      try {
        const res = await fetch(apiUrl("/api/chat"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
            mode: "conversation",
            level,
          }),
        });
        const data = await res.json();
        const rawContent = data.content || "";

        processAIResponse(rawContent, newMessages, updatedSession);

        setConversationState("user-turn");
      } catch {
        setMessages([
          ...newMessages,
          { role: "assistant", content: "エラーが発生しました。もう一度お試しください。" },
        ]);
        setConversationState("user-turn");
      }
    },
    [messages, level, processAIResponse]
  );

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  /** Start theme — direct version that accepts level param (for auto-start) */
  const startThemeDirect = (theme: ScenarioTheme, lvl: CEFRLevel) => {
    tts.unlock();
    const newSession = createSession(lvl, theme.label);
    setSession(newSession);
    setCurrentTheme(theme.label);
    setMessages([]);
    setSuggestions([]);
    setShowTextInput(false);
    setReview(null);

    let instruction = theme.instruction;
    if (theme.roleDescription) {
      instruction += ` Role setup: ${theme.roleDescription}`;
    }
    fetchAIGreeting(instruction, newSession, lvl);
  };

  /** Start a new themed conversation — AI greets first */
  const startTheme = (theme: ScenarioTheme) => {
    startThemeDirect(theme, level);
  };

  const resumeLastSession = () => {
    tts.unlock();
    const last = getLastSession();
    if (last) {
      setSession(last);
      setCurrentTheme(last.theme);
      setLevel(last.level);
      setMessages(
        last.messages.map((m) => {
          const { displayText } = extractVocab(m.content);
          return { role: m.role, content: m.content, displayContent: displayText };
        })
      );
      setConversationState("user-turn");
    }
  };

  /** Fetch AI review of the conversation */
  const fetchReview = async (sessionMessages: Message[], lvl: CEFRLevel) => {
    setReviewLoading(true);
    try {
      const res = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: sessionMessages.map((m) => ({ role: m.role, content: m.content })),
          mode: "review",
          level: lvl,
        }),
      });
      const data = await res.json();
      if (data.review) {
        setReview(data.review);
      }
    } catch {
      // Review is optional — don't block session end
    } finally {
      setReviewLoading(false);
    }
  };

  const endSession = () => {
    if (session) saveSession(session);
    tts.stop();
    recordActivity();
    setStreakCount(getStreak());
    setConversationState("summary");
    // Fetch review in background
    if (messages.length >= 2) {
      fetchReview(messages, level);
    }
  };

  const resetToIdle = () => {
    tts.stop();
    setConversationState("idle");
    setMessages([]);
    setSuggestions([]);
    setSession(null);
    setCurrentTheme("");
    setInput("");
    setShowTextInput(false);
    setSrsAddedCount(0);
    setReview(null);
    setReviewLoading(false);
  };

  const handleMicTap = () => {
    tts.unlock();
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handlePlayTTS = (text: string) => {
    tts.unlock();
    tts.play(text);
  };

  const handleAddToSRS = () => {
    if (session && session.vocabLearned.length > 0) {
      const count = addVocabToSRS(session.vocabLearned);
      setSrsAddedCount(count);
    }
  };

  const hasPersian = (text: string) => /[\u0600-\u06FF]/.test(text);

  const lastSession = typeof window !== "undefined" ? getLastSession() : null;

  // ==================== RENDER ====================

  // IDLE — Theme selection
  if (conversationState === "idle") {
    return (
      <div className="flex flex-col h-[calc(100vh-5rem)]">
        <div className="px-4 pt-6 pb-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">ミーナ先生</h1>
              <p className="text-xs text-gray-500">ペルシア語AIチューター</p>
            </div>
            <div className="flex items-center gap-2">
              {streakCount > 0 && (
                <span className="text-sm font-semibold text-orange-500">🔥{streakCount}</span>
              )}
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as CEFRLevel)}
                className="p-1.5 rounded-lg border border-gray-200 text-xs bg-white"
              >
                {CEFR_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tutor avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-4xl shadow-lg mb-3">
              👩‍🏫
            </div>
            <p className="text-sm text-gray-600 text-center">
              سلام! آماده‌ای؟
            </p>
            <p className="text-xs text-gray-400 text-center mt-1">
              準備はいい？シナリオを選んでね
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          <p className="text-xs text-gray-400 mb-2 font-medium">🎭 {level}レベルのシナリオ</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {themes.map((theme) => (
              <button
                key={theme.label}
                onClick={() => startTheme(theme)}
                className="p-3.5 bg-white rounded-xl border border-gray-200 text-left hover:bg-purple-50 hover:border-purple-200 transition-colors active:scale-95"
              >
                <span className="text-xl mb-1 block">{theme.emoji}</span>
                <span className="text-sm font-medium text-gray-700">{theme.label}</span>
                {theme.roleDescription && (
                  <p className="text-[10px] text-gray-400 mt-0.5">{theme.roleDescription}</p>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <button
              onClick={() =>
                startTheme({
                  label: "フリートーク",
                  emoji: "🗣️",
                  instruction: "Start a free conversation. Greet the student and ask what they'd like to talk about.",
                })
              }
              className="w-full p-3.5 bg-purple-50 rounded-xl border border-purple-200 text-left hover:bg-purple-100 transition-colors active:scale-[0.98]"
            >
              <span className="text-sm font-medium text-purple-700">🗣️ フリートーク</span>
              <p className="text-xs text-purple-500 mt-0.5">テーマなしで自由に会話</p>
            </button>

            {lastSession && (
              <button
                onClick={resumeLastSession}
                className="w-full p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-left hover:bg-gray-100 transition-colors active:scale-[0.98]"
              >
                <span className="text-sm font-medium text-gray-700">📂 前回の続き</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {lastSession.theme}（{lastSession.turnCount}ターン）
                </p>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // SUMMARY — Enhanced session end screen with AI review
  if (conversationState === "summary" && session) {
    return (
      <div className="flex flex-col h-[calc(100vh-5rem)]">
        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-20">
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-3xl shadow-lg mx-auto mb-3">
              👩‍🏫
            </div>
            <h2 className="text-xl font-bold text-gray-900">お疲れ様でした！</h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <p className="text-sm text-gray-500">
                {currentTheme} — {session.turnCount}ターン
              </p>
              {streakCount > 0 && (
                <span className="text-sm font-semibold text-orange-500">🔥{streakCount}</span>
              )}
            </div>
          </div>

          {/* AI Review Section */}
          {reviewLoading && (
            <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
                <p className="text-sm text-purple-600">ミーナ先生がフィードバックを準備中...</p>
              </div>
            </div>
          )}

          {review && (
            <>
              {/* Praise */}
              <div className="mb-4 p-4 bg-green-50 rounded-xl border border-green-100">
                <h3 className="font-semibold text-green-800 mb-1 text-sm">✅ 良かった点</h3>
                <p className="text-sm text-green-700">{review.praise}</p>
              </div>

              {/* Improvements */}
              {review.improvements && review.improvements.length > 0 && (
                <div className="mb-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <h3 className="font-semibold text-amber-800 mb-2 text-sm">📝 改善ポイント</h3>
                  <div className="space-y-3">
                    {review.improvements.map((imp, i) => (
                      <div key={i} className="text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-amber-500 font-medium shrink-0">{i + 1}.</span>
                          <div>
                            <p className="text-gray-600">
                              <span className="persian-text text-red-500 line-through" dir="rtl">{imp.wrong}</span>
                              {" → "}
                              <span className="persian-text text-green-600 font-medium" dir="rtl">{imp.correct}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{imp.explanation}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New expressions to learn */}
              {review.newExpressions && review.newExpressions.length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <h3 className="font-semibold text-blue-800 mb-2 text-sm">💡 次回使ってみよう</h3>
                  <div className="space-y-2">
                    {review.newExpressions.map((expr, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <button
                          onClick={() => handlePlayTTS(expr.persian)}
                          disabled={tts.isPlaying}
                          className="w-7 h-7 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center shrink-0 disabled:opacity-50"
                        >
                          <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                          </svg>
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className="persian-text text-blue-900" dir="rtl">{expr.persian}</span>
                          <span className="text-blue-500 text-xs ml-1">({expr.romanization})</span>
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">{expr.japanese}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Vocab learned */}
          {session.vocabLearned.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">
                📚 学んだ語彙（{session.vocabLearned.length}語）
              </h3>
              <div className="space-y-2">
                {session.vocabLearned.map((v, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
                    <button
                      onClick={() => handlePlayTTS(v.persian)}
                      disabled={tts.isPlaying}
                      className="w-8 h-8 rounded-full bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                      </svg>
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="persian-text text-base text-gray-900" dir="rtl">{v.persian}</span>
                      <span className="text-emerald-600 text-sm ml-2">({v.romanization})</span>
                    </div>
                    <span className="text-sm text-gray-500 shrink-0">{v.japanese}</span>
                  </div>
                ))}
              </div>

              {srsAddedCount > 0 ? (
                <p className="text-sm text-green-600 mt-3 text-center">
                  {srsAddedCount}語をフラッシュカードに追加しました！
                </p>
              ) : (
                <button
                  onClick={handleAddToSRS}
                  className="w-full mt-3 py-2.5 bg-emerald-500 text-white rounded-xl font-medium text-sm hover:bg-emerald-600 transition-colors"
                >
                  フラッシュカードに追加
                </button>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={resetToIdle}
              className="flex-1 py-3 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 transition-colors"
            >
              別のテーマ
            </button>
            <button
              onClick={() => {
                resetToIdle();
                window.location.href = "/";
              }}
              className="flex-1 py-3 bg-white border border-purple-300 text-purple-600 font-semibold rounded-xl hover:bg-purple-50 transition-colors"
            >
              ホームへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MAIN CONVERSATION VIEW ====================
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={resetToIdle} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-sm ${
                  conversationState === "ai-speaking" ? "tutor-pulse" : ""
                }`}
              >
                👩‍🏫
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">ミーナ先生</p>
                <p className="text-[10px] text-gray-400">{currentTheme}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
              {level}
            </span>
            <button onClick={endSession} className="text-xs text-gray-400 hover:text-gray-600 p-1" title="終了">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* All previous messages */}
        {messages.slice(0, -1).map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-2`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-purple-500 text-white rounded-br-sm"
                  : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
              }`}
            >
              {msg.role === "assistant" ? (
                <div>
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {getDisplayContent(msg.displayContent || msg.content)}
                  </p>
                  {extractPersianOnly(msg.content) && (
                    <div className="mt-1 flex justify-end">
                      <button
                        onClick={() => handlePlayTTS(extractPersianOnly(msg.content))}
                        disabled={tts.isPlaying}
                        className="w-6 h-6 rounded-full bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center disabled:opacity-50"
                      >
                        <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ) : hasPersian(msg.content) ? (
                <PersianText size="md" className="text-white">{msg.content}</PersianText>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Latest message — prominent */}
        {lastMsg && lastMsg.role === "assistant" && (
          <div className="mb-4 animate-slide-in">
            <div className="bg-white rounded-2xl rounded-bl-sm border border-gray-200 p-4 shadow-sm">
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-800">
                {getDisplayContent(lastMsg.displayContent || lastMsg.content)}
              </p>
              {extractPersianOnly(lastMsg.content) && (
                <button
                  onClick={() => handlePlayTTS(extractPersianOnly(lastMsg.content))}
                  disabled={tts.isPlaying}
                  className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-600 text-xs hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                >
                  {tts.isPlaying ? (
                    <>
                      <span className="flex gap-0.5">
                        <span className="w-1 h-3 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="w-1 h-4 bg-emerald-500 rounded-full animate-pulse [animation-delay:0.15s]" />
                        <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse [animation-delay:0.3s]" />
                      </span>
                      再生中...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                      </svg>
                      タップして聞く
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {lastMsg && lastMsg.role === "user" && (
          <div className="flex justify-end mb-2 animate-slide-in">
            <div className="max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-sm bg-purple-500 text-white">
              {hasPersian(lastMsg.content) ? (
                <PersianText size="md" className="text-white">{lastMsg.content}</PersianText>
              ) : (
                <p className="whitespace-pre-wrap">{lastMsg.content}</p>
              )}
            </div>
          </div>
        )}

        {/* AI thinking */}
        {conversationState === "ai-thinking" && (
          <div className="flex justify-start mb-2">
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

      {/* Suggested replies */}
      {suggestions.length > 0 && conversationState === "user-turn" && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 mb-1.5">タップして返答</p>
          <div className="flex flex-col gap-1.5">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => { tts.unlock(); sendMessage(s.persian); }}
                className="text-left p-2.5 bg-white rounded-xl border border-purple-100 hover:border-purple-300 hover:bg-purple-50 transition-colors active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  <span className="persian-text text-base text-gray-900" dir="rtl">{s.persian}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePlayTTS(s.persian); }}
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 hover:bg-emerald-200 shrink-0"
                  >
                    <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  <span className="text-emerald-600">{s.romanization}</span> — {s.japanese}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area — Voice-first */}
      <div className="px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex flex-col items-center gap-2">
          {/* Main mic button */}
          <button
            onClick={handleMicTap}
            disabled={conversationState === "ai-thinking" || isTranscribing}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
              isRecording
                ? "bg-red-500 text-white scale-110 mic-recording"
                : conversationState === "user-turn"
                  ? "bg-purple-500 text-white hover:bg-purple-600 mic-breathing"
                  : "bg-purple-500 text-white hover:bg-purple-600"
            } disabled:opacity-50 disabled:scale-100`}
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </button>
          <p className="text-xs text-gray-400">
            {isRecording
              ? "聞いています...タップで停止"
              : isTranscribing
                ? "認識中..."
                : conversationState === "ai-thinking"
                  ? "ミーナ先生が考えています..."
                  : "タップして話す"}
          </p>

          {/* Bottom actions */}
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setShowTextInput(!showTextInput)}
              className="flex-1 py-2 text-xs text-gray-500 hover:text-gray-700 bg-gray-50 rounded-lg"
            >
              ⌨️ テキスト
            </button>
            <button
              onClick={endSession}
              className="flex-1 py-2 text-xs text-gray-500 hover:text-gray-700 bg-gray-50 rounded-lg"
            >
              📊 終了
            </button>
          </div>

          {showTextInput && (
            <div className="flex gap-2 w-full">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.nativeEvent.isComposing && sendMessage(input)
                }
                placeholder="ペルシア語で入力..."
                className="flex-1 p-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm"
                dir="auto"
                disabled={conversationState === "ai-thinking"}
              />
              <button
                onClick={() => { tts.unlock(); sendMessage(input); }}
                disabled={conversationState === "ai-thinking" || !input.trim()}
                className="px-4 py-2.5 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors"
              >
                送信
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConversationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><p className="text-gray-400">読み込み中...</p></div>}>
      <ConversationPageInner />
    </Suspense>
  );
}
