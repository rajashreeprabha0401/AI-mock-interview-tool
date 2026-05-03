"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "listening" | "error";

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
}

export function useVoiceInput({ onTranscript }: UseVoiceInputOptions) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const rec: any = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results)
        .slice(e.resultIndex)
        .filter((r) => r.isFinal)
        .map((r) => r[0].transcript.trim())
        .join(" ");
      if (transcript) onTranscript(transcript + " ");
    };

    rec.onerror = (e: any) => {
      const friendlyMessages: Record<string, string> = {
        "not-allowed": "Mic permission denied — please allow microphone access.",
        "no-speech": "No speech detected. Please try again.",
        "audio-capture": "Microphone not found or unavailable.",
        "network": "Network error during speech recognition.",
        "aborted": "",
      };
      const msg = friendlyMessages[e.error] ?? `Speech error: ${e.error}`;
      if (e.error === "no-speech") {
        setErrorMsg(msg);
        setStatus("idle");
      } else if (e.error === "aborted") {
        setStatus("idle");
      } else {
        setErrorMsg(msg);
        setStatus("error");
      }
    };

    rec.onend = () => {
      setStatus((prev) => {
        if (prev === "listening") {
          try { rec.start(); } catch (_) {}
          return "listening";
        }
        return prev === "error" ? "error" : "idle";
      });
    };

    recognitionRef.current = rec;

    // BUG FIX: cleanup on unmount so speech doesn't keep running after navigation
    return () => {
      try { rec.stop(); } catch (_) {}
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) {
      setErrorMsg("Web Speech API not supported in this browser");
      setStatus("error");
      return;
    }
    if (status === "listening") {
      rec.stop();
      setStatus("idle");
    } else {
      setErrorMsg("");
      setStatus("listening");
      try { rec.start(); } catch (_) {}
    }
  }, [status]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setStatus("idle");
  }, []);

  const supported =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return { status, errorMsg, toggle, stop, supported };
}
