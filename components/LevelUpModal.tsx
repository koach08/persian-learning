"use client";

import { useEffect, useState } from "react";
import type { CEFRLevel } from "@/lib/level-manager";
import { CEFR_LABELS } from "@/lib/level-manager";
import Confetti from "./Confetti";

interface LevelUpModalProps {
  level: CEFRLevel | null;
  onClose: () => void;
}

export default function LevelUpModal({ level, onClose }: LevelUpModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (level) {
      setShow(true);
    }
  }, [level]);

  if (!level || !show) return null;

  return (
    <>
      <Confetti show={true} duration={4000} />
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 px-6">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full animate-slide-in shadow-2xl">
          <div className="text-6xl mb-4">🎊</div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">レベルアップ！</h2>
          <p className="text-lg text-gray-600 mb-1">
            <span className="font-bold text-emerald-600">{level}</span> — {CEFR_LABELS[level]}
          </p>
          <p className="text-sm text-gray-400 mb-6">新しいコンテンツがアンロックされました</p>
          <button
            onClick={() => { setShow(false); onClose(); }}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-lg active:scale-95 transition-transform"
          >
            続ける
          </button>
        </div>
      </div>
    </>
  );
}
