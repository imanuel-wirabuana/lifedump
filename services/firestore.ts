import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore"
import { db } from "./firebase"
import { ITEM_COLLECTIONS } from "@/lib/app-constants"
import type { DumpSourceType, DumpStatus } from "@/types"
import type { PendingItem } from "@/stores/use-dump-store"

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const clean: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue

    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      clean[key] = stripUndefined(value as Record<string, unknown>)
    } else {
      clean[key] = value
    }
  }

  return clean as T
}

function buildItemDocument(
  userId: string,
  dumpId: string,
  item: PendingItem,
  fallbackSource: "manual" | "ai"
) {
  const document: Record<string, unknown> = {
    userId,
    dumpId,
    category: item.category,
    title: item.title,
    content: item.content || "",
    tags: item.tags || [],
    source: item.source || fallbackSource,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  if (item.category === "task" && item.task) {
    document.task = {
      isCompleted: !!item.task.isCompleted,
      dueAt: item.task.dueAt ? new Date(item.task.dueAt) : null,
      priority: item.task.priority || "none",
    }
  }

  if (item.category === "finance" && item.finance) {
    document.finance = {
      type: item.finance.type || "expense",
      amount: Number(item.finance.amount) || 0,
      currency: item.finance.currency || "IDR",
      occurredAt: item.finance.occurredAt
        ? new Date(item.finance.occurredAt)
        : new Date(),
      paymentMethod: item.finance.paymentMethod,
    }
  }

  if (item.category === "note") {
    document.isPinned = !!item.isPinned
  }

  if (item.aiConfidence !== undefined) {
    document.aiConfidence = item.aiConfidence
  }

  return stripUndefined(document)
}

export async function saveDumpAndItems(
  userId: string,
  sourceType: DumpSourceType,
  rawText: string,
  status: DumpStatus,
  items: PendingItem[]
) {
  const batch = writeBatch(db)
  const dumpsRef = collection(db, "users", userId, "dumps")
  const dumpDocRef = doc(dumpsRef)

  batch.set(dumpDocRef, {
    userId,
    sourceType,
    rawText,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  for (const item of items) {
    const collectionName = ITEM_COLLECTIONS[item.category]
    const itemDocRef = doc(collection(db, "users", userId, collectionName))

    batch.set(
      itemDocRef,
      buildItemDocument(userId, dumpDocRef.id, item, "manual")
    )
  }

  await batch.commit()
  return { dumpId: dumpDocRef.id }
}

export async function confirmDumpAndItems(
  userId: string,
  dumpId: string,
  items: PendingItem[]
) {
  const batch = writeBatch(db)
  const dumpDocRef = doc(db, "users", userId, "dumps", dumpId)

  batch.update(dumpDocRef, {
    status: "confirmed",
    extractedItems: null,
    updatedAt: serverTimestamp(),
  })

  for (const item of items) {
    const collectionName = ITEM_COLLECTIONS[item.category]
    const itemDocRef = doc(collection(db, "users", userId, collectionName))

    batch.set(itemDocRef, buildItemDocument(userId, dumpId, item, "ai"))
  }

  await batch.commit()
}
