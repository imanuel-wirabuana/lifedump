import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { AI_CONFIG } from "@/lib/app-constants"

type ModelResponse = {
  data?: Array<{ id?: unknown; name?: unknown }>
}

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

export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await req.json()) as { baseUrl?: string; apiKey?: string }
    const baseUrl = normalizeBaseUrl(body.baseUrl)
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${body.apiKey?.trim() || process.env.KILO_API_KEY || ""}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Models request failed: ${response.status}` },
        { status: 502 }
      )
    }

    const json = (await response.json()) as ModelResponse
    const models = (json.data || [])
      .map((model) => {
        if (typeof model.id === "string") return model.id
        if (typeof model.name === "string") return model.name
        return null
      })
      .filter((model): model is string => !!model)
      .sort((a, b) => a.localeCompare(b))

    return NextResponse.json({ models })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load models"
    console.error("Fetch AI Models Error:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
