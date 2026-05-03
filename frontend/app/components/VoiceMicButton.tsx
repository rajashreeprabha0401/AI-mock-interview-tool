"use client";
import { Mic, MicOff, Square } from "lucide-react";

interface Props {
  status: "idle" | "listening" | "error";
  onToggle: () => void;
  supported: boolean;
}

export default function VoiceMicButton({ status, onToggle, supported }: Props) {
  if (!supported) return null;

  const isListening = status === "listening";

  return (
    <button
      type="button"
      onClick={onToggle}
      title={isListening ? "Stop recording" : "Start voice input"}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{
        fontFamily: "'Syne', sans-serif",
        background: isListening
          ? "rgba(239,68,68,0.12)"
          : "rgba(0,212,255,0.08)",
        border: isListening
          ? "1px solid rgba(239,68,68,0.4)"
          : "1px solid rgba(0,212,255,0.25)",
        color: isListening ? "var(--accent-red)" : "var(--accent-cyan)",
        boxShadow: isListening ? "0 0 10px rgba(239,68,68,0.2)" : "none",
      }}
    >
      {isListening ? (
        <>
          {/* Pulse dot */}
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: "var(--accent-red)" }}
          />
          <Square size={12} fill="currentColor" />
          Stop
        </>
      ) : (
        <>
          <Mic size={12} />
          Voice
        </>
      )}
    </button>
  );
}
