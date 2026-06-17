import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { DumpSourceType, DumpStatus, ItemCategory } from "@/types";

// ── Firestore-safe item shape (no undefined allowed) ──────────────────────

interface FirestoreTaskData {
  isCompleted: boolean;
  dueAt?: Date | null;
  priority?: "none" | "low" | "medium" | "high";
  tags?: string[];
  source?: "manual" | "ai";
}

interface FirestoreFinanceData {
  type: "expense" | "income";
  amount: number;
  currency: "IDR";
  occurredAt: Date;
}

interface FirestoreNoteData {
  noteType: "journal" | "general";
}

interface FirestoreItemInput {
  category: ItemCategory;
  title: string;
  content: string;
  task?: FirestoreTaskData;
  finance?: FirestoreFinanceData;
  note?: FirestoreNoteData;
  aiConfidence?: number;
}

const collectionNameMap = {
  task: "tasks",
  finance: "finances",
  note: "notes",
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Recursively strips all keys whose value is `undefined` from an object.
 * Firestore throws on any `undefined` value, even nested ones.
 */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const clean = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      clean[key] = stripUndefined(value as Record<string, unknown>);
    } else {
      clean[key] = value;
    }
  }
  return clean as T;
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function saveDumpAndItems(
  userId: string,
  sourceType: DumpSourceType,
  rawText: string,
  status: DumpStatus,
  items: FirestoreItemInput[]
) {
  const batch = writeBatch(db);

  // 1. Create the Dump document
  const dumpsRef = collection(db, "users", userId, "dumps");
  const dumpDocRef = doc(dumpsRef);

  batch.set(dumpDocRef, {
    userId,
    sourceType,
    rawText,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 2. Create Item documents in their own category-specific subcollections
  if (items.length > 0) {
    for (const item of items) {
      const collectionName = collectionNameMap[item.category];
      const itemDocRef = doc(collection(db, "users", userId, collectionName));

      const base = {
        userId,
        dumpId: dumpDocRef.id,
        category: item.category,
        title: item.title,
        content: item.content,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Build category-specific fields, then merge + strip undefined
      const extra: Record<string, unknown> = {};
      if (item.task) extra.task = item.task;
      if (item.finance) extra.finance = item.finance;
      if (item.note) extra.note = item.note;
      if (item.aiConfidence !== undefined) extra.aiConfidence = item.aiConfidence;

      batch.set(itemDocRef, stripUndefined({ ...base, ...extra }));
    }
  }

  await batch.commit();
  return { dumpId: dumpDocRef.id };
}

export async function confirmDumpAndItems(
  userId: string,
  dumpId: string,
  items: any[]
) {
  const batch = writeBatch(db);

  // 1. Update the Dump document to status = "confirmed" and clear extractedItems
  const dumpDocRef = doc(db, "users", userId, "dumps", dumpId);
  batch.update(dumpDocRef, {
    status: "confirmed",
    extractedItems: null,
    updatedAt: serverTimestamp(),
  });

  // 2. Create Item documents in their own category-specific subcollections
  if (items.length > 0) {
    for (const item of items) {
      const collectionName = collectionNameMap[item.category as ItemCategory];
      const itemDocRef = doc(collection(db, "users", userId, collectionName));

      const base = {
        userId,
        dumpId: dumpId,
        category: item.category,
        title: item.title,
        content: item.content || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const extra: Record<string, unknown> = {};
      if (item.category === "task" && item.task) {
        extra.task = {
          isCompleted: !!item.task.isCompleted,
          dueAt: item.task.dueAt ? new Date(item.task.dueAt) : null,
          priority: item.task.priority || "none",
          tags: item.task.tags || [],
          source: item.task.source || "ai",
        };
      }
      if (item.category === "finance" && item.finance) {
        extra.finance = {
          type: item.finance.type || "expense",
          amount: Number(item.finance.amount) || 0,
          currency: item.finance.currency || "IDR",
          occurredAt: item.finance.occurredAt ? new Date(item.finance.occurredAt) : new Date(),
        };
      }
      if (item.category === "note" && item.note) {
        extra.note = {
          noteType: item.note.noteType || "general",
        };
      }
      if (item.aiConfidence !== undefined) {
        extra.aiConfidence = item.aiConfidence;
      }

      batch.set(itemDocRef, stripUndefined({ ...base, ...extra }));
    }
  }

  await batch.commit();
}
