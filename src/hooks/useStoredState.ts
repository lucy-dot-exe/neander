import { useEffect, useState } from 'react';

/** useState that remembers its value in localStorage. Falls back to the initial value when storage is unavailable or holds something invalid. */
export function useStoredState<T>(key: string, initial: T | (() => T), isValid: (v: unknown) => v is T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (isValid(parsed)) return parsed;
      }
    } catch {
      // storage blocked or corrupt: use the default
    }
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage unavailable: the value just isn't remembered
    }
  }, [key, value]);
  return [value, setValue] as const;
}

export const isString = (v: unknown): v is string => typeof v === 'string';
export const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
export const oneOf =
  <T extends string>(...options: T[]) =>
  (v: unknown): v is T =>
    typeof v === 'string' && (options as string[]).includes(v);
