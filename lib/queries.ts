import { collection, query, getDocs, doc, deleteDoc, updateDoc, Timestamp, getDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import { Item, ItemCategory, Dump } from "./types";

// Helper to safely convert Firestore Timestamp or any date-like value to a JS Date
function toDate(value: any): Date {
  if (!value) return new Date();
  if (value instanceof Timestamp) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  return new Date(value);
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
  const items = snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: data.userId,
      dumpId: data.dumpId,
      category: data.category,
      title: data.title,
      content: data.content,
      task: data.task ? {
        isCompleted: data.task.isCompleted ?? false,
        dueAt: data.task.dueAt ? toDate(data.task.dueAt) : undefined,
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
  });

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

    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        dumpId: data.dumpId,
        category: category,
        title: data.title,
        content: data.content,
        task: data.task ? {
          isCompleted: data.task.isCompleted ?? false,
          dueAt: data.task.dueAt ? toDate(data.task.dueAt) : undefined,
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
    });
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
  await updateDoc(itemRef, {
    ...updates,
    updatedAt: new Date()
  });
}

export async function getDumps(userId: string): Promise<Dump[]> {
  const q = query(collection(db, "users", userId, "dumps"));
  const snapshot = await getDocs(q);
  const dumps = snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: data.userId,
      sourceType: data.sourceType,
      rawText: data.rawText,
      transcript: data.transcript,
      mediaPath: data.mediaPath,
      status: data.status,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as Dump;
  });
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
  const data = docSnap.data();
  return {
    id: docSnap.id,
    userId: data.userId,
    sourceType: data.sourceType,
    rawText: data.rawText,
    transcript: data.transcript,
    mediaPath: data.mediaPath,
    status: data.status,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Dump;
}

export async function getItemsByDumpId(userId: string, dumpId: string): Promise<Item[]> {
  const collections = ["tasks", "finances", "notes"];
  const snapshots = await Promise.all(
    collections.map(col => getDocs(query(collection(db, "users", userId, col), where("dumpId", "==", dumpId))))
  );

  const items = snapshots.flatMap((snapshot, index) => {
    const categoryCol = collections[index];
    const category = categoryCol === "tasks" ? "task" : categoryCol === "notes" ? "note" : "finance";

    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        dumpId: data.dumpId,
        category: category,
        title: data.title,
        content: data.content,
        task: data.task ? {
          isCompleted: data.task.isCompleted ?? false,
          dueAt: data.task.dueAt ? toDate(data.task.dueAt) : undefined,
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
    });
  });

  return items.sort((a, b) => {
    const timeA = a.createdAt?.getTime() || 0;
    const timeB = b.createdAt?.getTime() || 0;
    return timeB - timeA;
  });
}
