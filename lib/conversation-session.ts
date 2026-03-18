import type { CEFRLevel } from "./level-manager";
import { createNewCard, getAllCards, saveAllCards } from "./srs";

export interface VocabItem {
  persian: string;
  romanization: string;
  japanese: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ConversationSession {
  id: string;
  startedAt: string;
  level: CEFRLevel;
  theme: string;
  messages: ConversationMessage[];
  vocabLearned: VocabItem[];
  turnCount: number;
}

const STORAGE_KEY = "conversation-sessions";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function createSession(level: CEFRLevel, theme: string): ConversationSession {
  return {
    id: generateId(),
    startedAt: new Date().toISOString(),
    level,
    theme,
    messages: [],
    vocabLearned: [],
    turnCount: 0,
  };
}

/**
 * Extract vocab items from the hidden ---VOCAB--- block in AI responses.
 * Returns the display content (with vocab block removed) and extracted vocab.
 */
export function extractVocab(text: string): { displayText: string; vocab: VocabItem[] } {
  const vocabMatch = text.match(/---VOCAB---([\s\S]*?)---END_VOCAB---/);
  const displayText = text.replace(/\n?---VOCAB---[\s\S]*?---END_VOCAB---\n?/, "").trim();

  if (!vocabMatch) {
    return { displayText, vocab: [] };
  }

  const vocab: VocabItem[] = [];
  const lines = vocabMatch[1].trim().split("\n");
  for (const line of lines) {
    const parts = line.split("|").map((s) => s.trim());
    if (parts.length >= 3 && parts[0]) {
      vocab.push({
        persian: parts[0],
        romanization: parts[1],
        japanese: parts[2],
      });
    }
  }

  return { displayText, vocab };
}

export function addMessageToSession(
  session: ConversationSession,
  message: ConversationMessage,
  newVocab?: VocabItem[]
): ConversationSession {
  const updated = { ...session };
  updated.messages = [...session.messages, message];
  if (message.role === "user") {
    updated.turnCount = session.turnCount + 1;
  }
  if (newVocab && newVocab.length > 0) {
    // Deduplicate by persian text
    const existing = new Set(session.vocabLearned.map((v) => v.persian));
    const unique = newVocab.filter((v) => !existing.has(v.persian));
    updated.vocabLearned = [...session.vocabLearned, ...unique];
  }
  return updated;
}

export function saveSession(session: ConversationSession): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(STORAGE_KEY);
  const sessions: ConversationSession[] = raw ? JSON.parse(raw) : [];
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }
  // Keep only the last 20 sessions
  if (sessions.length > 20) {
    sessions.splice(0, sessions.length - 20);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function getLastSession(): ConversationSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const sessions: ConversationSession[] = JSON.parse(raw);
  return sessions.length > 0 ? sessions[sessions.length - 1] : null;
}

/**
 * Add vocab items to SRS as new flashcards.
 */
export function addVocabToSRS(vocab: VocabItem[]): number {
  const cards = getAllCards();
  let added = 0;
  for (const v of vocab) {
    const key = v.persian;
    if (!cards[key]) {
      cards[key] = createNewCard(key);
      added++;
    }
  }
  if (added > 0) {
    saveAllCards(cards);
  }
  return added;
}
