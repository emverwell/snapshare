"use client";

import { useCallback, useSyncExternalStore } from "react";
import { LOCALES, translations, type Locale } from "./translations";

const STORAGE_KEY = "snapshare:locale";

function isLocale(value: string): value is Locale {
  return (LOCALES as string[]).includes(value);
}

function detectLocale(): Locale {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && isLocale(stored)) return stored;
  return window.navigator.language.toLowerCase().startsWith("es")
    ? "es"
    : "en";
}

// Module-level store, not per-component state: every component calling
// useLocale() shares one locale and re-renders when it changes, and
// useSyncExternalStore is what correctly handles "en" during SSR/the first
// client render, then switching to the real detected/stored locale right
// after hydration — without the hydration-mismatch warning (or the
// cascading-render lint error) that a plain useState+useEffect pair here
// would produce.
let currentLocale: Locale | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): Locale {
  if (currentLocale === null) {
    currentLocale = detectLocale();
  }
  return currentLocale;
}

function getServerSnapshot(): Locale {
  return "en";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setGlobalLocale(next: Locale) {
  currentLocale = next;
  window.localStorage.setItem(STORAGE_KEY, next);
  listeners.forEach((listener) => listener());
}

export function useLocale() {
  const locale = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const setLocale = useCallback((next: Locale) => setGlobalLocale(next), []);
  return { locale, setLocale, t: translations[locale] };
}
