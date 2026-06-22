import { generateObject } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { z } from "zod"
import { AI_CONFIG } from "@/lib/app-constants"

export type AiRuntimeSettings = {
  baseUrl?: string
  apiKey?: string
  model?: string
}

// ── AI Client ───────────────────────────────────────────────────────────
export const kilo = createOpenAI({
  baseURL: AI_CONFIG.baseUrl,
  apiKey: process.env.KILO_API_KEY || "",
})

function normalizeBaseUrl(baseUrl?: string) {
  if (!baseUrl?.trim()) return AI_CONFIG.baseUrl

  try {
    const url = new URL(baseUrl.trim())
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return AI_CONFIG.baseUrl
    }
    return url.toString().replace(/\/$/, "")
  } catch {
    return AI_CONFIG.baseUrl
  }
}

function normalizeModel(model?: string) {
  return model?.trim() || AI_CONFIG.model
}

function createAiProvider(settings?: AiRuntimeSettings) {
  return createOpenAI({
    baseURL: normalizeBaseUrl(settings?.baseUrl),
    apiKey: settings?.apiKey?.trim() || process.env.KILO_API_KEY || "",
  })
}

// ── Schema ──────────────────────────────────────────────────────────────
export const categorizeSchema = z.object({
  items: z.array(
    z.object({
      category: z.enum(["task", "finance", "note"]),
      title: z.string(),
      content: z.string(),
      dueAt: z.string().nullable().optional(),
      priority: z.enum(["none", "low", "medium", "high"]).optional(),
      tags: z.array(z.string()).optional(),
      financeType: z.enum(["expense", "income"]).optional(),
      amount: z.number().optional(),
      currency: z.literal("IDR").optional(),
      occurredAt: z.string().optional(),
      paymentMethod: z.string().nullable().optional(),
      isPinned: z.boolean().optional(),
      confidence: z.number(),
      needsClarification: z.boolean(),
    })
  ),
  assumptions: z.array(z.string()).optional(),
})

export type CategorizedItem = z.infer<typeof categorizeSchema>["items"][number]
export type Category = "task" | "finance" | "note"
export type UnknownRecord = Record<string, unknown>

// ── System Prompt Template ──────────────────────────────────────────────
export const CATEGORIZE_SYSTEM_PROMPT =
  "You are a data extraction AI. You MUST output a JSON object matching the provided schema. " +
  "The JSON object must contain an 'items' array as the root key. " +
  "Never return a single item directly at the root; always wrap it in the 'items' array. " +
  "All dates and times must be generated in the Asia/Jakarta timezone and formatted with +07:00 offset."

// ── Jakarta Time Helper ──────────────────────────────────────────────────
export function getJakartaTime(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: AI_CONFIG.timezone,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date())
}

export function buildCategorizePrompt(rawText: string): string {
  const time = getJakartaTime()
  return `You are a data extraction assistant.
You MUST output a JSON object containing a single root key "items" which is an array of objects.
Each object in the "items" array MUST represent a categorized item ('task', 'finance', or 'note') extracted from the input text, conforming to these rules:
- category: must be "task", "finance", or "note"
- title: a short, descriptive name/title
- content: a description/details (mandatory for all categories, e.g., task description, reason/detail for finance transaction, or general note body). Cannot be null or empty.
- dueAt: (for tasks) ISO 8601 string of the due date and time with Jakarta offset (e.g. 2026-06-17T10:00:00+07:00) based on the user's input, or null. Support both date and time!
- priority: (for tasks) "none", "low", "medium", or "high". Default to "none" if not specified.
- tags: (for tasks) array of lowercase contextual tag strings (e.g. ["work", "shopping", "home"]) extracted from the task context, or empty array.
- financeType: (for finance) "expense" or "income", or null
- amount: (for finance) numeric amount, or null
- currency: (for finance) "IDR" or null
- occurredAt: (for finance) ISO 8601 string of when it happened with Jakarta offset (e.g. 2026-06-17T10:00:00+07:00), or null
- confidence: number between 0 and 1
- needsClarification: boolean

User Location/Timezone: Jakarta, Indonesia (Asia/Jakarta, UTC+07:00)
Current date/time context: ${time} (in Jakarta local time).
Please interpret relative date/time descriptions (e.g., "besok jam 10 pagi", "tomorrow at 3pm", "tonight", "next Monday") relative to this context and format them with Jakarta offset (+07:00).
Text to parse: "${rawText}"`
}

export function buildRefinePrompt(
  rawText: string,
  currentItems: unknown[],
  feedback: string
): string {
  const time = getJakartaTime()
  return `You are a refinement AI agent.
The user previously dumped the following text:
"${rawText}"

This was categorized into the following list of items:
${JSON.stringify(currentItems, null, 2)}

The user now wants to revise/correct this categorization with the following instruction/feedback:
"${feedback}"

Apply the user's feedback to revise the list of structured items. You should add, remove, or modify items to accurately reflect the user's intent.

You MUST output a JSON object containing a single root key "items" which is an array of objects conforming to the same schema.
User Location/Timezone: Jakarta, Indonesia (Asia/Jakarta, UTC+07:00)
Current date/time context: ${time} (in Jakarta local time).
Please format all timestamps with Jakarta offset (+07:00).`
}

export function buildRedoPrompt(rawText: string, feedback?: string): string {
  const time = getJakartaTime()
  return `You are a data extraction assistant.
You MUST output a JSON object containing a single root key "items" which is an array of objects.
Each object in the "items" array MUST represent a categorized item ('task', 'finance', or 'note') extracted from the input text, conforming to these rules:
- category: must be "task", "finance", or "note"
- title: a short, descriptive name/title
- content: a description/details (mandatory for all categories, e.g., task description, reason/detail for finance transaction, or general note body). Cannot be null or empty.
- dueAt: (for tasks) ISO 8601 string of the due date and time with Jakarta offset (e.g. 2026-06-17T10:00:00+07:00) based on the user's input, or null. Support both date and time!
- priority: (for tasks) "none", "low", "medium", or "high". Default to "none" if not specified.
- tags: (for tasks) array of lowercase contextual tag strings (e.g. ["work", "shopping", "home"]) extracted from the task context, or empty array.
- financeType: (for finance) "expense" or "income", or null
- amount: (for finance) numeric amount, or null
- currency: (for finance) "IDR" or null
- occurredAt: (for finance) ISO 8601 string of when it happened with Jakarta offset (e.g. 2026-06-17T10:00:00+07:00), or null
- confidence: number between 0 and 1
- needsClarification: boolean

User Location/Timezone: Jakarta, Indonesia (Asia/Jakarta, UTC+07:00)
Current date/time context: ${time} (in Jakarta local time).
Please interpret relative date/time descriptions relative to this context and format them with Jakarta offset (+07:00).

The user previously tried to dump text, but it failed to process. They have provided additional instructions/context.
Original text: "${rawText}"
Additional instruction/context: "${feedback || ""}"

Extract and categorize items from the original text, guided by the additional instruction/context.`
}

// ── Type Guards ──────────────────────────────────────────────────────────
export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null
}

export function isCategory(value: unknown): value is Category {
  return value === "task" || value === "finance" || value === "note"
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

export function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined
}

export function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

// ── Salvage Helpers ──────────────────────────────────────────────────────
export function withCategory(
  value: unknown,
  category: Category
): UnknownRecord {
  return isRecord(value)
    ? { ...value, category }
    : { category, title: "Untitled Item", content: "" }
}

export function extractItemsFromRaw(json: unknown): unknown[] {
  if (!isRecord(json)) return Array.isArray(json) ? json : []
  if (Array.isArray(json.items)) return json.items

  const keys = Object.keys(json)
  const isNumericIndexed =
    keys.length > 0 && keys.every((k) => !isNaN(Number(k)))
  if (isNumericIndexed) {
    return keys
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => json[k])
      .filter(isRecord)
  }

  const list: UnknownRecord[] = []
  if (Array.isArray(json.task))
    list.push(...json.task.map((item) => withCategory(item, "task")))
  if (Array.isArray(json.finance))
    list.push(...json.finance.map((item) => withCategory(item, "finance")))
  if (Array.isArray(json.note))
    list.push(...json.note.map((item) => withCategory(item, "note")))
  if (list.length > 0) return list

  if (isCategory(json.category) && typeof json.title === "string") return [json]

  for (const value of Object.values(json)) {
    if (Array.isArray(value)) return value
  }

  return []
}

export function normalizeItem(item: unknown): CategorizedItem {
  const record = isRecord(item) ? item : {}
  const priority = asString(record.priority, "none")
  const financeType = asString(record.financeType, "expense")

  return {
    category: isCategory(record.category) ? record.category : "note",
    title: asString(record.title, "Untitled Item"),
    content: asString(record.content),
    dueAt: asString(record.dueAt) || null,
    priority:
      priority === "low" || priority === "medium" || priority === "high"
        ? priority
        : "none",
    tags: asStringArray(record.tags),
    financeType: financeType === "income" ? "income" : "expense",
    amount: asNumber(record.amount),
    currency: "IDR",
    occurredAt: asString(record.occurredAt) || undefined,
    paymentMethod: asString(record.paymentMethod) || undefined,
    isPinned: asBoolean(record.isPinned) ?? false,
    confidence: asNumber(record.confidence) ?? 0.8,
    needsClarification: asBoolean(record.needsClarification) ?? false,
  }
}

// ── AI Execution ─────────────────────────────────────────────────────────
export type AiError = Error & {
  text?: string
  response?: { body?: { text?: string }; text?: string }
  cause?: { message?: string }
}

function extractErrorText(aiError: AiError): string {
  return (
    aiError.text ||
    aiError.response?.body?.text ||
    aiError.response?.text ||
    (aiError.cause && typeof aiError.cause.message === "string"
      ? aiError.cause.message
      : "") ||
    aiError.message ||
    ""
  )
}

export async function executeAIStep(
  prompt: string,
  settings?: AiRuntimeSettings
): Promise<CategorizedItem[]> {
  let resultObject: { items: CategorizedItem[] } | null = null
  const provider = createAiProvider(settings)

  try {
    const { object } = await generateObject({
      model: provider(normalizeModel(settings?.model)),
      maxRetries: 1,
      schema: categorizeSchema,
      system: CATEGORIZE_SYSTEM_PROMPT,
      prompt,
    })
    resultObject = object
  } catch (error) {
    const aiError = error as AiError
    console.warn("generateObject failed. Attempting salvage...", aiError)
    const errorText = extractErrorText(aiError)

    if (errorText) {
      try {
        const jsonMatch = errorText.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
        const cleanJsonText = jsonMatch ? jsonMatch[0] : errorText
        const parsed = JSON.parse(cleanJsonText)
        const salvagedItems = extractItemsFromRaw(parsed)

        if (salvagedItems.length > 0) {
          resultObject = { items: salvagedItems.map(normalizeItem) }
        }
      } catch (salvageError) {
        console.error("Salvage parsing failed:", salvageError)
      }
    }

    if (!resultObject) {
      throw aiError
    }
  }

  return resultObject.items || []
}
