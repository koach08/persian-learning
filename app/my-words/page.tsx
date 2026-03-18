"use client";

import { useState, useEffect, useRef } from "react";
import { getCustomVocab, addCustomWord, deleteCustomWord, exportCustomVocab, importCustomVocab } from "@/lib/custom-vocab";
import type { VocabularyItem } from "@/lib/data-loader";
import type { CEFRLevel } from "@/lib/level-manager";
import { CEFR_LEVELS } from "@/lib/level-manager";
import PersianText from "@/components/PersianText";

export default function MyWordsPage() {
  const [words, setWords] = useState<VocabularyItem[]>([]);
  const [persian, setPersian] = useState("");
  const [roman, setRoman] = useState("");
  const [japanese, setJapanese] = useState("");
  const [english, setEnglish] = useState("");
  const [wordLevel, setWordLevel] = useState<CEFRLevel>("A1");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWords(getCustomVocab());
  }, []);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAdd = () => {
    if (!persian.trim() || !japanese.trim()) {
      showMessage("ペルシア語と日本語は必須です", "error");
      return;
    }
    const exists = words.some((w) => w.ペルシア語 === persian.trim());
    if (exists) {
      showMessage("この単語は既に登録されています", "error");
      return;
    }
    addCustomWord({
      ペルシア語: persian.trim(),
      ローマ字: roman.trim(),
      日本語: japanese.trim(),
      英語: english.trim(),
      レベル: wordLevel,
    });
    setWords(getCustomVocab());
    setPersian("");
    setRoman("");
    setJapanese("");
    setEnglish("");
    showMessage("単語を追加しました", "success");
  };

  const handleDelete = (persianWord: string) => {
    deleteCustomWord(persianWord);
    setWords(getCustomVocab());
    showMessage("削除しました", "success");
  };

  const handleExport = () => {
    const csv = exportCustomVocab();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-persian-words.csv";
    a.click();
    URL.revokeObjectURL(url);
    showMessage("CSVをエクスポートしました", "success");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const count = importCustomVocab(text);
      setWords(getCustomVocab());
      showMessage(`${count}件の単語をインポートしました`, "success");
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-xl font-bold text-gray-900 mb-4">マイ単語帳</h1>

      {message && (
        <div className={`rounded-lg p-3 mb-4 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      )}

      {/* Add word form */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 mb-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">新しい単語を追加</p>
        <div className="space-y-2">
          <input type="text" value={persian} onChange={(e) => setPersian(e.target.value)}
            placeholder="ペルシア語 *" dir="rtl"
            className="w-full p-2.5 rounded-lg border border-gray-200 text-base persian-text" />
          <input type="text" value={roman} onChange={(e) => setRoman(e.target.value)}
            placeholder="ローマ字"
            className="w-full p-2.5 rounded-lg border border-gray-200 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={japanese} onChange={(e) => setJapanese(e.target.value)}
              placeholder="日本語 *"
              className="w-full p-2.5 rounded-lg border border-gray-200 text-sm" />
            <input type="text" value={english} onChange={(e) => setEnglish(e.target.value)}
              placeholder="English"
              className="w-full p-2.5 rounded-lg border border-gray-200 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <select value={wordLevel} onChange={(e) => setWordLevel(e.target.value as CEFRLevel)}
              className="p-2.5 rounded-lg border border-gray-200 text-sm">
              {CEFR_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <button onClick={handleAdd}
              className="flex-1 py-2.5 rounded-lg bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 transition-colors">
              追加
            </button>
          </div>
        </div>
      </div>

      {/* Import/Export */}
      <div className="flex gap-2 mb-4">
        <button onClick={handleExport} disabled={words.length === 0}
          className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50">
          CSVエクスポート
        </button>
        <button onClick={() => fileRef.current?.click()}
          className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">
          CSVインポート
        </button>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
      </div>

      {/* Word list */}
      <div className="space-y-2">
        <p className="text-sm text-gray-500">{words.length}件の単語</p>
        {words.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            まだ単語が登録されていません
          </div>
        )}
        {words.map((word) => (
          <div key={word.ペルシア語} className="bg-white rounded-xl p-3 border border-gray-100 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <PersianText size="md" className="text-gray-900">{word.ペルシア語}</PersianText>
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{word.レベル}</span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {word.ローマ字 && <span className="text-emerald-600">{word.ローマ字}</span>}
                {word.ローマ字 && " — "}
                {word.日本語}
                {word.英語 && ` / ${word.英語}`}
              </p>
            </div>
            <button onClick={() => handleDelete(word.ペルシア語)}
              className="ml-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
