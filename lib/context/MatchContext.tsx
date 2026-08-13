"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { MatchResponse, UserProfile } from "@/lib/types";

interface StoredSession {
  profile: UserProfile;
  result: MatchResponse;
}

interface MatchContextValue {
  profile: UserProfile | null;
  result: MatchResponse | null;
  isHydrated: boolean;
  setMatchResult: (profile: UserProfile, result: MatchResponse) => void;
  clear: () => void;
}

const MatchContext = createContext<MatchContextValue | null>(null);
const STORAGE_KEY = "ulsan-career-radar:match-session";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((listener) => listener());
}

function readSession(): StoredSession | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function getServerSnapshot(): StoredSession | null {
  return null;
}

export function MatchProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(subscribe, readSession, getServerSnapshot);
  const isHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const value = useMemo<MatchContextValue>(
    () => ({
      profile: session?.profile ?? null,
      result: session?.result ?? null,
      isHydrated,
      setMatchResult(nextProfile, nextResult) {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: nextProfile, result: nextResult }));
        notify();
      },
      clear() {
        window.sessionStorage.removeItem(STORAGE_KEY);
        notify();
      },
    }),
    [session, isHydrated],
  );

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}

export function useMatch() {
  const context = useContext(MatchContext);
  if (!context) throw new Error("useMatch must be used within a MatchProvider");
  return context;
}
