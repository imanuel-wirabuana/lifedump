import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData,
} from "firebase/firestore"
import { ITEM_COLLECTIONS } from "@/lib/app-constants"
import type {
  Dump,
  FinanceData,
  Item,
  ItemCategory,
  ItemPatch,
  ItemSource,
  TaskData,
} from "@/types"
import { db } from "./firebase"

function hasSecondsField(value: unknown): value is { seconds: unknown } {
  return typeof value === "object" && value !== null && "seconds" in value
}

export function toDate(value: unknown): Date {
  if (!value) return new Date()
  if (value instanceof Timestamp) return value.toDate()
  if (hasSecondsField(value)) {
    const seconds = Number(value.seconds)
    return Number.isFinite(seconds) ? new Date(seconds * 1000) : new Date()
  }
  return new Date(value as string | number | Date)
}

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

function extractTags(
  data: DocumentData,
  task?: DocumentData,
  finance?: DocumentData
): string[] {
  if (Array.isArray(data.tags)) return data.tags
  if (Array.isArray(task?.tags)) return task.tags
  if (Array.isArray(finance?.tags)) return finance.tags
  return []
}

function extractSource(
  data: DocumentData,
  task?: DocumentData,
  finance?: DocumentData
): "manual" | "ai" {
  if (data.source === "manual" || data.source === "ai") return data.source
  if (task?.source === "manual" || task?.source === "ai") return task.source
  if (finance?.source === "manual" || finance?.source === "ai") {
    return finance.source
  }
  return "manual"
}

function extractTaskData(task: DocumentData | undefined): TaskData | undefined {
  if (!task) return undefined
  return {
    isCompleted: Boolean(task.isCompleted),
    dueAt: task.dueAt ? toDate(task.dueAt) : undefined,
    priority: task.priority ?? "none",
  }
}

function extractFinanceData(
  finance: DocumentData | undefined
): FinanceData | undefined {
  if (!finance) return undefined
  return {
    type: finance.type === "income" ? "income" : "expense",
    amount: Number(finance.amount ?? 0),
    currency: "IDR",
    occurredAt: toDate(finance.occurredAt),
    paymentMethod:
      typeof finance.paymentMethod === "string"
        ? finance.paymentMethod
        : undefined,
  }
}

export function mapDocToItem(
  id: string,
  data: DocumentData,
  category: ItemCategory
): Item {
  const task = data.task as DocumentData | undefined
  const finance = data.finance as DocumentData | undefined

  return {
    id,
    userId: String(data.userId ?? ""),
    dumpId: String(data.dumpId ?? ""),
    category,
    title: String(data.title ?? "Untitled"),
    content: String(data.content ?? ""),
    tags: extractTags(data, task, finance),
    source: extractSource(data, task, finance),
    task: extractTaskData(task),
    finance: extractFinanceData(finance),
    note: data.note
      ? { noteType: data.note.noteType === "journal" ? "journal" : "general" }
      : undefined,
    isPinned: Boolean(data.isPinned),
    aiConfidence:
      typeof data.aiConfidence === "number" ? data.aiConfidence : undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
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
    extractedItems: Array.isArray(data.extractedItems)
      ? data.extractedItems
      : null,
    error: data.error ?? null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

export async function createItem(payload: CreateItemPayload) {
  const collectionName = ITEM_COLLECTIONS[payload.category]
  const itemRef = doc(collection(db, "users", payload.userId, collectionName))

  await setDoc(itemRef, stripUndefined(buildCreateItemDocument(payload)))
  return { id: itemRef.id }
}

export type CreateItemPayload = Omit<
  Item,
  "id" | "userId" | "createdAt" | "updatedAt"
> & {
  userId: string
  source?: ItemSource
}

function buildCreateItemDocument(payload: CreateItemPayload) {
  const document: Record<string, unknown> = {
    userId: payload.userId,
    category: payload.category,
    title: payload.title,
    content: payload.content || "",
    tags: payload.tags || [],
    source: payload.source || "manual",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  if (payload.task) document.task = payload.task
  if (payload.finance) document.finance = payload.finance
  if (payload.note) document.note = payload.note
  if (payload.isPinned) document.isPinned = payload.isPinned
  if (payload.dumpId) document.dumpId = payload.dumpId
  if (typeof payload.aiConfidence === "number") {
    document.aiConfidence = payload.aiConfidence
  }

  return document
}

export async function deleteItem(
  userId: string,
  itemId: string,
  category: ItemCategory
) {
  await deleteDoc(doc(db, "users", userId, ITEM_COLLECTIONS[category], itemId))
}

export async function updateItemTask(
  userId: string,
  itemId: string,
  isCompleted: boolean
) {
  const itemRef = doc(db, "users", userId, ITEM_COLLECTIONS.task, itemId)
  await updateDoc(itemRef, {
    "task.isCompleted": isCompleted,
    updatedAt: serverTimestamp(),
  })
}

export async function updateItem(
  userId: string,
  itemId: string,
  category: ItemCategory,
  updates: ItemPatch
) {
  const itemRef = doc(db, "users", userId, ITEM_COLLECTIONS[category], itemId)
  await updateDoc(
    itemRef,
    stripUndefined({
      ...updates,
      updatedAt: serverTimestamp(),
    } as Record<string, unknown>)
  )
}

export async function deleteDump(userId: string, dumpId: string) {
  await deleteDoc(doc(db, "users", userId, "dumps", dumpId))
}
