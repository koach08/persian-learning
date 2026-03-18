"use client";

import { useEffect, useState } from "react";

interface ConfettiProps {
  show: boolean;
  duration?: number; // ms, default 3000
}

const COLORS = [
  "#22c55e", "#3b82f6", "#a855f7", "#f59e0b",
  "#ef4444", "#ec4899", "#14b8a6", "#f97316",
];

export default function Confetti({ show, duration = 3000 }: ConfettiProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 30 }).map((_, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            "--x": `${Math.random() * 100}vw`,
            "--delay": `${Math.random() * 0.5}s`,
            "--rotate": `${Math.random() * 360}deg`,
            "--color": COLORS[i % COLORS.length],
            "--size": `${6 + Math.random() * 6}px`,
            "--drift": `${(Math.random() - 0.5) * 100}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
