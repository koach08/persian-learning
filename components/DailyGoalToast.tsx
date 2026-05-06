"use client";

import { useState, useEffect } from "react";
import { consumeGoalMetFlag } from "@/lib/xp";
import Confetti from "./Confetti";

export default function DailyGoalToast() {
  const [show, setShow] = useState(false);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    // Check every 2 seconds for goal completion
    const interval = setInterval(() => {
      if (consumeGoalMetFlag()) {
        setShow(true);
        setConfetti(true);
        setTimeout(() => setShow(false), 4000);
        setTimeout(() => setConfetti(false), 3000);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!show && !confetti) return null;

  return (
    <>
      {confetti && <Confetti show={confetti} />}
      {show && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] animate-bounce-in">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-bold text-sm">デイリーゴール達成！</p>
              <p className="text-xs text-emerald-100">今日もよく頑張りました</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
