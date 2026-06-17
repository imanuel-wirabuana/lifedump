import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Recursively strips all keys whose value is `undefined` from plain objects or arrays.
 * Preserves special object instances like Firestore FieldValues, Timestamps, and Dates.
 */
export function stripUndefined<T>(obj: T): T {
  if (obj === undefined) {
    return null as unknown as T;
  }
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (obj instanceof Date) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => stripUndefined(item)) as unknown as T;
  }

  // Check if it's a plain object (to avoid mutating special class instances like Firestore FieldValue/Timestamp)
  const proto = Object.getPrototypeOf(obj);
  if (proto !== null && proto !== Object.prototype) {
    return obj;
  }

  const clean = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value === undefined) continue;
    clean[key] = stripUndefined(value);
  }
  return clean as T;
}
