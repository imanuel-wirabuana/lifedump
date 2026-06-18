import { task } from "@trigger.dev/sdk";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { db } from "@/services/firebase";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";

// Schema for categorization
const categorizeSchema = z.object({
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
      confidence: z.number(),
      needsClarification: z.boolean(),
    })
  ),
  assumptions: z.array(z.string()).optional(),
});

const kilo = createOpenAI({
  baseURL: "https://api.kilo.ai/api/gateway",
  apiKey: process.env.KILO_API_KEY || "",
});

type Category = "task" | "finance" | "note";

type CategorizedItem = z.infer<typeof categorizeSchema>["items"][number];
type UnknownRecord = Record<string, unknown>;

type AiError = Error & {
  text?: string;
  response?: { body?: { text?: string }; text?: string };
  cause?: { message?: string };
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function isCategory(value: unknown): value is Category {
  return value === "task" || value === "finance" || value === "note";
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function withCategory(value: unknown, category: Category): UnknownRecord {
  return isRecord(value) ? { ...value, category } : { category, title: "Untitled Item", content: "" };
}

// Function to salvage items in case of validation failures
function extractItemsFromRaw(json: unknown): unknown[] {
  if (!isRecord(json)) return Array.isArray(json) ? json : [];
  if (Array.isArray(json.items)) return json.items;

  const keys = Object.keys(json);
  const isNumericIndexed = keys.length > 0 && keys.every(k => !isNaN(Number(k)));
  if (isNumericIndexed) {
    return keys
      .sort((a, b) => Number(a) - Number(b))
      .map(k => json[k])
      .filter(isRecord);
  }

  const list: UnknownRecord[] = [];
  if (Array.isArray(json.task)) list.push(...json.task.map(item => withCategory(item, "task")));
  if (Array.isArray(json.finance)) list.push(...json.finance.map(item => withCategory(item, "finance")));
  if (Array.isArray(json.note)) list.push(...json.note.map(item => withCategory(item, "note")));
  if (list.length > 0) return list;

  if (isCategory(json.category) && typeof json.title === "string") return [json];

  for (const value of Object.values(json)) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

function normalizeItem(item: unknown): CategorizedItem {
  const record = isRecord(item) ? item : {};
  const priority = asString(record.priority, "none");
  const financeType = asString(record.financeType, "expense");

  return {
    category: isCategory(record.category) ? record.category : "note",
    title: asString(record.title, "Untitled Item"),
    content: asString(record.content),
    dueAt: asString(record.dueAt) || null,
    priority: priority === "low" || priority === "medium" || priority === "high" ? priority : "none",
    tags: asStringArray(record.tags),
    financeType: financeType === "income" ? "income" : "expense",
    amount: asNumber(record.amount),
    currency: "IDR",
    occurredAt: asString(record.occurredAt) || undefined,
    confidence: asNumber(record.confidence) ?? 0.8,
    needsClarification: asBoolean(record.needsClarification) ?? false,
  };
}

async function executeAIStep(prompt: string): Promise<CategorizedItem[]> {
  let resultObject: { items: CategorizedItem[] } | null = null;

  try {
    const { object } = await generateObject({
      model: kilo("poolside/laguna-m.1:free"),
      maxRetries: 1,
      schema: categorizeSchema,
      system: "You are a data extraction AI. You MUST output a JSON object matching the provided schema. The JSON object must contain an 'items' array as the root key. Never return a single item directly at the root; always wrap it in the 'items' array. All dates and times must be generated in the Asia/Jakarta timezone and formatted with +07:00 offset.",
      prompt,
    });
    resultObject = object;
  } catch (error) {
    const aiError = error as AiError;
    console.warn("generateObject failed. Attempting salvage...", aiError);
    let errorText = aiError.text || aiError.response?.body?.text || aiError.response?.text || "";
    
    if (!errorText && aiError.cause && typeof aiError.cause.message === "string") {
      errorText = aiError.cause.message;
    }
    if (!errorText && aiError.message) {
      errorText = aiError.message;
    }

    if (errorText) {
      try {
        const jsonMatch = errorText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        const cleanJsonText = jsonMatch ? jsonMatch[0] : errorText;
        const parsed = JSON.parse(cleanJsonText);
        
        let salvagedItems = extractItemsFromRaw(parsed);
        
        if (salvagedItems.length === 0 && typeof parsed === "object") {
          for (const val of Object.values(parsed)) {
            if (Array.isArray(val)) {
              salvagedItems = val;
              break;
            }
          }
        }

        if (salvagedItems.length > 0) {
          resultObject = { items: salvagedItems.map(normalizeItem) };
        }
      } catch (salvageError) {
        console.error("Salvage parsing failed:", salvageError);
      }
    }
    if (!resultObject) {
      throw aiError;
    }
  }

  return resultObject.items || [];
}

async function saveExtractedItems(dumpDocRef: ReturnType<typeof doc>, items: CategorizedItem[]) {
  const extractedItems = items.map(item => {
    const base = {
      category: item.category,
      title: item.title,
      content: item.content || "",
      aiConfidence: item.confidence || 0.8,
    };

    const extra: UnknownRecord = {};
    if (item.category === "task") {
      extra.task = {
        isCompleted: false,
        dueAt: item.dueAt ? item.dueAt : null,
        priority: item.priority || "none",
        tags: item.tags || [],
        source: "ai",
      };
    }
    if (item.category === "finance") {
      extra.finance = {
        type: item.financeType || "expense",
        amount: Number(item.amount) || 0,
        currency: item.currency || "IDR",
        occurredAt: item.occurredAt ? item.occurredAt : new Date().toISOString(),
      };
    }
    if (item.category === "note") {
      extra.note = {
        noteType: "general",
      };
    }

    const cleanObj: UnknownRecord = {};
    const merged = { ...base, ...extra };
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined) cleanObj[k] = v;
    }

    return cleanObj;
  });

  await updateDoc(dumpDocRef, {
    status: "needs_review",
    extractedItems,
    updatedAt: serverTimestamp(),
  });
}

export const categorizeTask = task({
  id: "categorize-dump",
  run: async (payload: { dumpId: string; userId: string; rawText: string }) => {
    const { dumpId, userId, rawText } = payload;
    const dumpDocRef = doc(db, "users", userId, "dumps", dumpId);

    try {
      const currentJakartaTime = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date());

      const prompt = `You are a data extraction assistant.
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
Current date/time context: ${currentJakartaTime} (in Jakarta local time).
Please interpret relative date/time descriptions (e.g., "besok jam 10 pagi", "tomorrow at 3pm", "tonight", "next Monday") relative to this context and format them with Jakarta offset (+07:00).
Text to parse: "${rawText}"`;

      const items = await executeAIStep(prompt);
      await saveExtractedItems(dumpDocRef, items);
      return { success: true, count: items.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown background categorization error";
      console.error("Trigger.dev Categorize Job Error:", error);
      await updateDoc(dumpDocRef, {
        status: "failed",
        error: message,
        updatedAt: serverTimestamp(),
      });
      throw error;
    }
  },
});

export const refineTask = task({
  id: "refine-dump",
  run: async (payload: { dumpId: string; userId: string; rawText: string; feedback: string; currentItems: CategorizedItem[] }) => {
    const { dumpId, userId, rawText, feedback, currentItems } = payload;
    const dumpDocRef = doc(db, "users", userId, "dumps", dumpId);

    try {
      const currentJakartaTime = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date());

      const prompt = `You are a refinement AI agent.
The user previously dumped the following text:
"${rawText}"

This was categorized into the following list of items:
${JSON.stringify(currentItems, null, 2)}

The user now wants to revise/correct this categorization with the following instruction/feedback:
"${feedback}"

Apply the user's feedback to revise the list of structured items. You should add, remove, or modify items to accurately reflect the user's intent.

You MUST output a JSON object containing a single root key "items" which is an array of objects conforming to the same schema.
User Location/Timezone: Jakarta, Indonesia (Asia/Jakarta, UTC+07:00)
Current date/time context: ${currentJakartaTime} (in Jakarta local time).
Please format all timestamps with Jakarta offset (+07:00).`;

      const items = await executeAIStep(prompt);
      await saveExtractedItems(dumpDocRef, items);
      return { success: true, count: items.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown background categorization error";
      console.error("Trigger.dev Refine Job Error:", error);
      await updateDoc(dumpDocRef, {
        status: "failed",
        error: message,
        updatedAt: serverTimestamp(),
      });
      throw error;
    }
  },
});

export const redoTask = task({
  id: "redo-dump",
  run: async (payload: { dumpId: string; userId: string; rawText: string; feedback?: string }) => {
    const { dumpId, userId, rawText, feedback } = payload;
    const dumpDocRef = doc(db, "users", userId, "dumps", dumpId);

    try {
      const currentJakartaTime = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date());

      const prompt = `You are a data extraction assistant.
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
Current date/time context: ${currentJakartaTime} (in Jakarta local time).
Please interpret relative date/time descriptions relative to this context and format them with Jakarta offset (+07:00).

The user previously tried to dump text, but it failed to process. They have provided additional instructions/context.
Original text: "${rawText}"
Additional instruction/context: "${feedback || ""}"

Extract and categorize items from the original text, guided by the additional instruction/context.`;

      const items = await executeAIStep(prompt);
      await saveExtractedItems(dumpDocRef, items);
      return { success: true, count: items.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown background redo error";
      console.error("Trigger.dev Redo Job Error:", error);
      await updateDoc(dumpDocRef, {
        status: "failed",
        error: message,
        updatedAt: serverTimestamp(),
      });
      throw error;
    }
  },
});
