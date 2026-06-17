import { collection, query, getDocs, doc, deleteDoc, updateDoc, Timestamp, getDoc, where, limit, startAfter, orderBy, DocumentSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { Item, ItemCategory, Dump } from "@/types";
import { stripUndefined } from "@/lib/utils";

// Helper to safely convert Firestore Timestamp or any date-like value to a JS Date
export function toDate(value: any): Date {
  if (!value) return new Date();
  if (value instanceof Timestamp) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  return new Date(value);
}

export function mapDocToItem(id: string, data: any, category: ItemCategory): Item {
  return {
    id: id,
    userId: data.userId,
    dumpId: data.dumpId,
    category: category,
    title: data.title,
    content: data.content,
    task: data.task ? {
      isCompleted: data.task.isCompleted ?? false,
      dueAt: data.task.dueAt ? toDate(data.task.dueAt) : undefined,
      priority: data.task.priority || "none",
      tags: data.task.tags || [],
      source: data.task.source || "manual",
    } : undefined,
    finance: data.finance ? {
      type: data.finance.type,
      amount: data.finance.amount,
      currency: data.finance.currency || "IDR",
      occurredAt: toDate(data.finance.occurredAt),
    } : undefined,
    note: data.note ? {
      noteType: data.note.noteType || "general",
    } : undefined,
    aiConfidence: data.aiConfidence,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Item;
}

export function mapDocToDump(id: string, data: any): Dump {
  return {
    id: id,
    userId: data.userId,
    sourceType: data.sourceType,
    rawText: data.rawText,
    transcript: data.transcript,
    mediaPath: data.mediaPath,
    status: data.status,
    extractedItems: data.extractedItems || null,
    error: data.error || null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Dump;
}

const collectionNameMap = {
  task: "tasks",
  finance: "finances",
  note: "notes",
} as const;

export async function getItemsByCategory(userId: string, category: ItemCategory): Promise<Item[]> {
  const collectionName = collectionNameMap[category];
  const q = query(collection(db, "users", userId, collectionName));

  const snapshot = await getDocs(q);
  const items = snapshot.docs.map(docSnap => mapDocToItem(docSnap.id, docSnap.data(), category));

  // Sort in memory to avoid requiring a Firestore composite index
  return items.sort((a, b) => {
    const timeA = a.createdAt?.getTime() || 0;
    const timeB = b.createdAt?.getTime() || 0;
    return timeB - timeA;
  });
}

export async function deleteItem(userId: string, itemId: string, category: ItemCategory) {
  const collectionName = collectionNameMap[category];
  await deleteDoc(doc(db, "users", userId, collectionName, itemId));
}

export async function updateItemTask(userId: string, itemId: string, isCompleted: boolean) {
  const itemRef = doc(db, "users", userId, "tasks", itemId);
  await updateDoc(itemRef, {
    "task.isCompleted": isCompleted,
    updatedAt: new Date()
  });
}

export async function getAllItems(userId: string): Promise<Item[]> {
  const collections = ["tasks", "finances", "notes"];
  const snapshots = await Promise.all(
    collections.map(col => getDocs(query(collection(db, "users", userId, col))))
  );

  const items = snapshots.flatMap((snapshot, index) => {
    const categoryCol = collections[index];
    const category = categoryCol === "tasks" ? "task" : categoryCol === "notes" ? "note" : "finance";

    return snapshot.docs.map(docSnap => mapDocToItem(docSnap.id, docSnap.data(), category));
  });

  return items.sort((a, b) => {
    const timeA = a.createdAt?.getTime() || 0;
    const timeB = b.createdAt?.getTime() || 0;
    return timeB - timeA;
  });
}

export async function updateItem(userId: string, itemId: string, category: ItemCategory, updates: any) {
  const collectionName = collectionNameMap[category];
  const itemRef = doc(db, "users", userId, collectionName, itemId);
  await updateDoc(itemRef, stripUndefined({
    ...updates,
    updatedAt: new Date()
  }));
}

export async function getDumps(userId: string): Promise<Dump[]> {
  const q = query(collection(db, "users", userId, "dumps"));
  const snapshot = await getDocs(q);
  const dumps = snapshot.docs.map(docSnap => mapDocToDump(docSnap.id, docSnap.data()));
  return dumps.sort((a, b) => {
    const timeA = a.createdAt?.getTime() || 0;
    const timeB = b.createdAt?.getTime() || 0;
    return timeB - timeA;
  });
}

export async function getDumpById(userId: string, dumpId: string): Promise<Dump | null> {
  const docRef = doc(db, "users", userId, "dumps", dumpId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return mapDocToDump(docSnap.id, docSnap.data());
}

export async function getItemsByDumpId(userId: string, dumpId: string): Promise<Item[]> {
  const collections = ["tasks", "finances", "notes"];
  const snapshots = await Promise.all(
    collections.map(col => getDocs(query(collection(db, "users", userId, col), where("dumpId", "==", dumpId))))
  );

  const items = snapshots.flatMap((snapshot, index) => {
    const categoryCol = collections[index];
    const category = categoryCol === "tasks" ? "task" : categoryCol === "notes" ? "note" : "finance";

    return snapshot.docs.map(docSnap => mapDocToItem(docSnap.id, docSnap.data(), category));
  });

  return items.sort((a, b) => {
    const timeA = a.createdAt?.getTime() || 0;
    const timeB = b.createdAt?.getTime() || 0;
    return timeB - timeA;
  });
}

export async function deleteDump(userId: string, dumpId: string) {
  await deleteDoc(doc(db, "users", userId, "dumps", dumpId));
}


