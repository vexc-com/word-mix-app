import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely load and JSON-parse a value from localStorage.
 * - SSR-safe: returns fallback when window/localStorage is unavailable.
 * - Error-tolerant: returns fallback on missing key or parse errors.
 */
export function loadLocal<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined" || !("localStorage" in window)) return fallback;
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  } catch {
    return fallback;
  }
}

/**
 * Safely JSON-stringify and save a value to localStorage.
 * - SSR-safe: no-op when window/localStorage is unavailable.
 * - Error-tolerant: swallows stringify/setItem errors.
 */
export function saveLocal<T>(key: string, value: T): void {
  try {
    if (typeof window === "undefined" || !("localStorage" in window)) return;
    try {
      const raw = JSON.stringify(value);
      window.localStorage.setItem(key, raw);
    } catch {
      // swallow
    }
  } catch {
    // swallow
  }
}
