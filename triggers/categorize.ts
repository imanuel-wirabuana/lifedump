import { task } from "@trigger.dev/sdk"
import { doc, serverTimestamp, updateDoc } from "firebase/firestore"
import { db } from "@/services/firebase"
import {
  buildCategorizePrompt,
  buildRedoPrompt,
  buildRefinePrompt,
  executeAIStep,
  type AiRuntimeSettings,
  type CategorizedItem,
  type UnknownRecord,
} from "@/services/ai"

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unknown background categorization error"
}

async function saveExtractedItems(
  dumpDocRef: ReturnType<typeof doc>,
  items: CategorizedItem[]
) {
  const extractedItems = items.map((item) => {
    const base: UnknownRecord = {
      category: item.category,
      title: item.title,
      content: item.content || "",
      tags: item.tags || [],
      source: "ai",
      aiConfidence: item.confidence || 0.8,
    }

    const extra: UnknownRecord = {}

    if (item.category === "task") {
      extra.task = {
        isCompleted: false,
        dueAt: item.dueAt || null,
        priority: item.priority || "none",
      }
    }

    if (item.category === "finance") {
      extra.finance = {
        type: item.financeType || "expense",
        amount: Number(item.amount) || 0,
        currency: item.currency || "IDR",
        occurredAt: item.occurredAt || new Date().toISOString(),
        paymentMethod: item.paymentMethod,
      }
    }

    if (item.category === "note") {
      extra.isPinned = !!item.isPinned
    }

    const cleanItem: UnknownRecord = {}
    for (const [key, value] of Object.entries({ ...base, ...extra })) {
      if (value !== undefined) cleanItem[key] = value
    }

    return cleanItem
  })

  await updateDoc(dumpDocRef, {
    status: "needs_review",
    extractedItems,
    updatedAt: serverTimestamp(),
  })
}

async function handleError(dumpDocRef: ReturnType<typeof doc>, error: unknown) {
  const message = getErrorMessage(error)
  console.error("Trigger.dev Job Error:", error)

  await updateDoc(dumpDocRef, {
    status: "failed",
    error: message,
    updatedAt: serverTimestamp(),
  })
}

export const categorizeTask = task({
  id: "categorize-dump",
  run: async (payload: {
    dumpId: string
    userId: string
    rawText: string
    aiSettings?: AiRuntimeSettings
  }) => {
    const { dumpId, userId, rawText, aiSettings } = payload
    const dumpDocRef = doc(db, "users", userId, "dumps", dumpId)

    try {
      const items = await executeAIStep(
        buildCategorizePrompt(rawText),
        aiSettings
      )
      await saveExtractedItems(dumpDocRef, items)
      return { success: true, count: items.length }
    } catch (error) {
      await handleError(dumpDocRef, error)
      throw error
    }
  },
})

export const refineTask = task({
  id: "refine-dump",
  run: async (payload: {
    dumpId: string
    userId: string
    rawText: string
    feedback: string
    currentItems: CategorizedItem[]
    aiSettings?: AiRuntimeSettings
  }) => {
    const { dumpId, userId, rawText, feedback, currentItems, aiSettings } =
      payload
    const dumpDocRef = doc(db, "users", userId, "dumps", dumpId)

    try {
      const items = await executeAIStep(
        buildRefinePrompt(rawText, currentItems, feedback),
        aiSettings
      )
      await saveExtractedItems(dumpDocRef, items)
      return { success: true, count: items.length }
    } catch (error) {
      await handleError(dumpDocRef, error)
      throw error
    }
  },
})

export const redoTask = task({
  id: "redo-dump",
  run: async (payload: {
    dumpId: string
    userId: string
    rawText: string
    feedback?: string
    aiSettings?: AiRuntimeSettings
  }) => {
    const { dumpId, userId, rawText, feedback, aiSettings } = payload
    const dumpDocRef = doc(db, "users", userId, "dumps", dumpId)

    try {
      const items = await executeAIStep(
        buildRedoPrompt(rawText, feedback),
        aiSettings
      )
      await saveExtractedItems(dumpDocRef, items)
      return { success: true, count: items.length }
    } catch (error) {
      await handleError(dumpDocRef, error)
      throw error
    }
  },
})
