import { deleteDoc, doc, DocumentData, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Dump, Item, ItemCategory, ItemPatch } from "@/types";

// Helper to safely convert Firestore Timestamp or date-like values to a JS Date.
export function toDate(value: unknown): Date {
  if (!value) return new Date();
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "object" && value !== null && "seconds" in value) {
    const seconds = Number((value as { seconds: unknown }).seconds);
    return Number.isFinite(seconds) ? new Date(seconds * 1000) : new Date();
  }
  return new Date(value as string | number | Date);
}

export function mapDocToItem(id: string, data: DocumentData, category: ItemCategory): Item {
  const task = data.task as DocumentData | undefined;
  const finance = data.finance as DocumentData | undefined;
  const note = data.note as DocumentData | undefined;

  const tags = Array.isArray(data.tags) ? data.tags : Array.isArray(task?.tags) ? task.tags : Array.isArray(finance?.tags) ? finance.tags : [];
  const source = data.source === "manual" || data.source === "ai" ? data.source : task?.source === "manual" || task?.source === "ai" ? task.source : finance?.source === "manual" || finance?.source === "ai" ? finance.source : "manual";

  return {
    id,
    userId: String(data.userId ?? ""),
    dumpId: String(data.dumpId ?? ""),
    category,
    title: String(data.title ?? "Untitled"),
    content: String(data.content ?? ""),
    tags,
    source,
    task: task ? {
      isCompleted: Boolean(task.isCompleted),
      dueAt: task.dueAt ? toDate(task.dueAt) : undefined,
      priority: task.priority ?? "none",
    } : undefined,
    finance: finance ? {
      type: finance.type === "income" ? "income" : "expense",
      amount: Number(finance.amount ?? 0),
      currency: "IDR",
      occurredAt: toDate(finance.occurredAt),
      paymentMethod: typeof finance.paymentMethod === "string" ? finance.paymentMethod : undefined,
    } : undefined,
    note: note ? {
      noteType: note.noteType === "journal" ? "journal" : "general",
    } : undefined,
    isPinned: Boolean(data.isPinned),
    aiConfidence: typeof data.aiConfidence === "number" ? data.aiConfidence : undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function mapDocToDump(id: string, data: DocumentData): Dump {
  return {
    id,
    userId: String(data.userId ?? ""),
    sourceType: data.sourceType ?? "text",
    rawText: data.rawText,
    transcript: data.transcript,
    mediaPath: data.mediaPath,
    status: data.status ?? "processing",
    extractedItems: Array.isArray(data.extractedItems) ? data.extractedItems : null,
    error: data.error ?? null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

const collectionNameMap = {
  task: "tasks",
  finance: "finances",
  note: "notes",
} as const;

export async function deleteItem(userId: string, itemId: string, category: ItemCategory) {
  const collectionName = collectionNameMap[category];
  await deleteDoc(doc(db, "users", userId, collectionName, itemId));
}

export async function updateItemTask(userId: string, itemId: string, isCompleted: boolean) {
  const itemRef = doc(db, "users", userId, "tasks", itemId);
  await updateDoc(itemRef, {
    "task.isCompleted": isCompleted,
    updatedAt: new Date(),
  });
}

export async function updateItem(userId: string, itemId: string, category: ItemCategory, updates: ItemPatch) {
  const collectionName = collectionNameMap[category];
  const itemRef = doc(db, "users", userId, collectionName, itemId);
  await updateDoc(itemRef, {
    ...updates,
    updatedAt: new Date(),
  });
}

export async function deleteDump(userId: string, dumpId: string) {
  await deleteDoc(doc(db, "users", userId, "dumps", dumpId));
}
