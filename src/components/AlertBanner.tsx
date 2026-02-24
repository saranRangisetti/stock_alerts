"use client";

import { useEffect, useRef } from "react";
import { Bell, X } from "lucide-react";

interface Alert {
  id: string;
  name: string;
  source: string;
  url: string;
}

const SOURCE_LABELS: Record<string, string> = {
  pokemontcg: "Pokemon TCG",
  optcg: "One Piece TCG",
  pokemoncenter: "Pokemon Center",
  target: "Target",
  walmart: "Walmart",
  bestbuy: "Best Buy",
  samsclub: "Sam's Club",
  ebay: "eBay",
  tcgplayer: "TCGPlayer",
  amazon: "Amazon",
};

export default function AlertBanner({
  alerts,
  onDismiss,
}: {
  alerts: Alert[];
  onDismiss: (id: string) => void;
}) {
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    if (alerts.length > 0 && !hasPlayedRef.current) {
      playAlertSound();
      hasPlayedRef.current = true;
    }
    if (alerts.length === 0) {
      hasPlayedRef.current = false;
    }
  }, [alerts.length]);

  const playAlertSound = () => {
    try {
      // Create a notification sound using Web Audio API
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(1200, ctx.currentTime + 0.3);

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);

      // Close AudioContext after sound finishes to prevent memory leak
      setTimeout(() => ctx.close(), 600);
    } catch {
      // Audio not available
    }
  };

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-green-500 text-black px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Bell size={20} className="animate-bounce" />
            <div>
              <span className="font-bold">RESTOCK ALERT!</span>{" "}
              <span className="font-medium">{alert.name}</span> is back in stock
              on{" "}
              <span className="font-semibold">
                {SOURCE_LABELS[alert.source] || alert.source.toUpperCase()}
              </span>
              !
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={alert.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-black text-green-400 rounded-lg text-sm font-bold hover:bg-zinc-800 transition-colors"
            >
              BUY NOW
            </a>
            <button
              onClick={() => onDismiss(alert.id)}
              className="p-1 hover:bg-green-600 rounded transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
