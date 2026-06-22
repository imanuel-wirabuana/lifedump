import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { AI_CONFIG } from "@/lib/app-constants"
import { kilo } from "@/services/ai"

function createProvider(baseUrl?: string, apiKey?: string) {
  if (!baseUrl?.trim()) return kilo

  try {
    const url = new URL(baseUrl.trim())
    if (url.protocol !== "https:" && url.protocol !== "http:") return kilo

    return createOpenAI({
      baseURL: url.toString().replace(/\/$/, ""),
      apiKey: apiKey?.trim() || process.env.KILO_API_KEY || "",
    })
  } catch {
    return kilo
  }
}

function getErrorResponseText(error: unknown) {
  if (!error || typeof error !== "object") return ""

  const record = error as {
    responseBody?: unknown
    text?: unknown
    cause?: { text?: unknown }
  }

  if (typeof record.responseBody === "string") return record.responseBody
  if (typeof record.text === "string") return record.text
  if (typeof record.cause?.text === "string") return record.cause.text
  return ""
}

function extractTextFromSse(body: string) {
  let completedText = ""
  let deltaText = ""

  for (const line of body.split("\n")) {
    if (!line.startsWith("data: ")) continue

    const payload = line.slice(6).trim()
    if (!payload || payload === "[DONE]") continue

    try {
      const json = JSON.parse(payload) as {
        type?: string
        text?: string
        delta?: string
      }

      if (json.type === "response.output_text.done" && json.text) {
        completedText = json.text
      }

      if (json.type === "response.output_text.delta" && json.delta) {
        deltaText += json.delta
      }
    } catch {
      // Ignore non-JSON SSE chunks.
    }
  }

  return (completedText || deltaText).trim()
}

export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await req.json()) as {
      text?: string
      aiBaseUrl?: string
      aiApiKey?: string
      aiModel?: string
    }
    const text = body.text

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    const provider = createProvider(body.aiBaseUrl, body.aiApiKey)

    let enhancedText = ""

    try {
      const result = await generateText({
        model: provider(body.aiModel?.trim() || AI_CONFIG.model),
        system: `You are an expert prompt enhancer for personal organization. \nYour task is to take a raw, rough, shorthand, or voice-transcribed user dump (input note/task/finance entry) and rewrite it into a clear, well-structured, and grammatically correct prompt.\nFollow these critical rules:\n1. Retain ALL original factual details: names, quantities, numbers, dates, times, currencies, and context. Do NOT lose or modify any fact.\n2. Do NOT add any fictitious information or assumptions that aren't implied.\n3. Fix typos, slang, and grammar. Keep the language natural (Indonesian, English, or mixed as written).\n4. If there are relative dates (e.g. "besok", "lusa", "next week"), preserve them exactly.\n5. Return ONLY the enhanced text. Do not include quotes, conversational introductions, or explanations.`,
        prompt: text,
      })
      enhancedText = result.text
    } catch (error) {
      enhancedText = extractTextFromSse(getErrorResponseText(error))
      if (!enhancedText) throw error
    }

    return NextResponse.json({ enhancedText: enhancedText.trim() })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Enhancement failed"
    console.error("Enhance Prompt Error:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
