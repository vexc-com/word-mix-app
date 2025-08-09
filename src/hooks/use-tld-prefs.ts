import { useCallback, useEffect, useState } from "react";
import { normalizeTld } from "@/lib/tlds";

const FAVORITES_KEY = "favoriteTlds";
const RECENTS_KEY = "recentTlds";
const RECENT_CAP = 10;

// Safe localStorage helpers
function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function saveLocal<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function useTldPrefs() {
  const [favoriteTlds, setFavoriteTlds] = useState<string[]>([]);
  const [recentTlds, setRecentTlds] = useState<string[]>([]);

  useEffect(() => {
    setFavoriteTlds(loadLocal<string[]>(FAVORITES_KEY, []));
    setRecentTlds(loadLocal<string[]>(RECENTS_KEY, []));
  }, []);

  const addFavorite = useCallback((tld: string) => {
    const norm = normalizeTld(tld);
    setFavoriteTlds((prev) => {
      if (!norm || prev.includes(norm)) return prev;
      const next = [...prev, norm];
      saveLocal(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((tld: string) => {
    const norm = normalizeTld(tld);
    setFavoriteTlds((prev) => {
      const next = prev.filter((x) => x !== norm);
      saveLocal(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const touchRecent = useCallback((tld: string) => {
    const norm = normalizeTld(tld);
    setRecentTlds((prev) => {
      if (!norm) return prev;
      const without = prev.filter((x) => x !== norm);
      const next = [norm, ...without].slice(0, RECENT_CAP);
      saveLocal(RECENTS_KEY, next);
      return next;
    });
  }, []);

  return {
    favoriteTlds,
    recentTlds,
    addFavorite,
    removeFavorite,
    touchRecent,
  };
}