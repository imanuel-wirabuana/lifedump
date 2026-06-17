import { NextResponse } from "next/server";
import { after } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, updateDoc } from "firebase/firestore";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const kilo = createOpenAI({
  baseURL: "https://api.kilo.ai/api/gateway",
  apiKey: process.env.KILO_API_KEY || "",
});

const categorizeSchema = z.object({
  items: z.array(
    z.object({
      category: z.enum(["task", "finance", "note"]),
      title: z.string(),
      content: z.string(),
      dueAt: z.string().nullable().optional(),
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

function extractItemsFromRaw(json: any): any[] {
  if (!json) return [];
  if (json.items && Array.isArray(json.items)) return json.items;
  if (Array.isArray(json)) return json;
  const keys = Object.keys(json);
  const isNumericIndexed = keys.length > 0 && keys.every(k => !isNaN(Number(k)));
  if (isNumericIndexed) {
    return keys
      .sort((a, b) => Number(a) - Number(b))
      .map(k => json[k])
      .filter(item => item && typeof item === "object");
  }
  if (json.task || json.finance || json.note) {
    const list: any[] = [];
    if (Array.isArray(json.task)) list.push(...json.task.map((x: any) => ({ ...x, category: "task" })));
    if (Array.isArray(json.finance)) list.push(...json.finance.map((x: any) => ({ ...x, category: "finance" })));
    if (Array.isArray(json.note)) list.push(...json.note.map((x: any) => ({ ...x, category: "note" })));
    if (list.length > 0) return list;
  }
  if (typeof json === "object" && typeof json.category === "string" && typeof json.title === "string") {
    return [json];
  }
  for (const value of Object.values(json)) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // 1. Create a dump document in Firestore with status = "processing"
    const dumpDocRef = doc(collection(db, "users", userId, "dumps"));
    await setDoc(dumpDocRef, {
      userId,
      sourceType: "text",
      rawText: text,
      status: "processing",
      extractedItems: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const dumpId = dumpDocRef.id;

    // 2. Start AI categorization in the background
    after(async () => {
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
- financeType: (for finance) "expense" or "income", or null
- amount: (for finance) numeric amount, or null
- currency: (for finance) "IDR" or null
- occurredAt: (for finance) ISO 8601 string of when it happened with Jakarta offset (e.g. 2026-06-17T10:00:00+07:00), or null
- confidence: number between 0 and 1
- needsClarification: boolean

User Location/Timezone: Jakarta, Indonesia (Asia/Jakarta, UTC+07:00)
Current date/time context: ${currentJakartaTime} (in Jakarta local time).
Please interpret relative date/time descriptions (e.g., "besok jam 10 pagi", "tomorrow at 3pm", "tonight", "next Monday") relative to this context and format them with Jakarta offset (+07:00).
Text to parse: "${text}"`;

        let resultObject: any = null;

        try {
          const { object } = await generateObject({
            model: kilo("kilo-auto/free"),
            maxRetries: 1,
            schema: categorizeSchema,
            system: "You are a data extraction AI. You MUST output a JSON object matching the provided schema. The JSON object must contain an 'items' array as the root key. Never return a single item directly at the root; always wrap it in the 'items' array. All dates and times must be generated in the Asia/Jakarta timezone and formatted with +07:00 offset.",
            prompt,
          });
          resultObject = object;
        } catch (error: any) {
          console.warn("generateObject failed. Attempting salvage...", error);
          let rawText = error.text || error.response?.body?.text || error.response?.text || "";
          if (rawText) {
            try {
              const jsonMatch = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
              const cleanJsonText = jsonMatch ? jsonMatch[0] : rawText;
              const parsed = JSON.parse(cleanJsonText);
              const salvagedItems = extractItemsFromRaw(parsed);
              if (salvagedItems.length > 0) {
                const validatedItems = salvagedItems.map(item => ({
                  category: item.category || "note",
                  title: item.title || "Untitled Item",
                  content: item.content || "",
                  dueAt: item.dueAt || null,
                  financeType: item.financeType || null,
                  amount: typeof item.amount === "number" ? item.amount : null,
                  currency: item.currency || "IDR",
                  occurredAt: item.occurredAt || null,
                  confidence: typeof item.confidence === "number" ? item.confidence : 0.8,
                  needsClarification: typeof item.needsClarification === "boolean" ? item.needsClarification : false,
                }));
                resultObject = { items: validatedItems };
              }
            } catch (salvageError) {
              console.error("Salvage parsing failed:", salvageError);
            }
          }
          if (!resultObject) {
            throw error;
          }
        }

        // Update dump status to "needs_review" with extracted items
        await updateDoc(dumpDocRef, {
          status: "needs_review",
          extractedItems: resultObject.items || [],
          updatedAt: new Date(),
        });
      } catch (error: any) {
        console.error("Async Categorize Error:", error);
        await updateDoc(dumpDocRef, {
          status: "failed",
          error: error.message || "Unknown categorization error",
          updatedAt: new Date(),
        });
      }
    });

    return NextResponse.json({ dumpId, status: "processing" }, { status: 202 });
  } catch (error: any) {
    console.error("Submit Dump Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
