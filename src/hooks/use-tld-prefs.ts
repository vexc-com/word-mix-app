import { useState, useCallback, useEffect } from "react";
import { loadLocal, saveLocal } from "@/lib/utils";
import { normalizeTld } from "@/lib/tlds";

const FAVORITES_KEY = "favoriteTlds";
const RECENTS_KEY = "recentTlds";
const RECENT_CAP = 10;

export function useTldPrefs() {
  const [favoriteTlds, setFavoriteTlds] = useState<string[]>([]);
  const [recentTlds, setRecentTlds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const fav = loadLocal<string[]>(FAVORITES_KEY, []);
      if (Array.isArray(fav)) setFavoriteTlds(fav);
    } catch {}
    try {
      const rec = loadLocal<string[]>(RECENTS_KEY, []);
      if (Array.isArray(rec)) setRecentTlds(rec);
    } catch {}
  }, []);

  const addFavorite = useCallback((tld: string) => {
    const norm = normalizeTld(tld);
    setFavoriteTlds((prev) => {
      if (prev.includes(norm)) return prev;
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