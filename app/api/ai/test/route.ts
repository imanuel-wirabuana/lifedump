import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { AI_CONFIG } from "@/lib/app-constants"

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
      baseUrl?: string
      apiKey?: string
      model?: string
    }

    const model = body.model?.trim() || AI_CONFIG.model
    const provider = createOpenAI({
      baseURL: normalizeBaseUrl(body.baseUrl),
      apiKey: body.apiKey?.trim() || process.env.KILO_API_KEY || "",
    })

    let output = ""

    try {
      const result = await generateText({
        model: provider(model),
        prompt: "Reply with exactly: OK",
      })
      output = result.text.trim()
    } catch (error) {
      output = extractTextFromSse(getErrorResponseText(error))
      if (!output) throw error
    }

    return NextResponse.json({ ok: true, model, output })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Model test failed"
    console.error("AI Model Test Error:", error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
