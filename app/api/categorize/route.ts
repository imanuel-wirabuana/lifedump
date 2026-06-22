import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import {
  buildCategorizePrompt,
  buildRefinePrompt,
  executeAIStep,
} from "@/services/ai"

type CategorizeRequestBody = {
  text?: string
  currentItems?: unknown[]
  feedback?: string
}

export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await req.json()) as CategorizeRequestBody
    const { text, currentItems, feedback } = body

    if (!text?.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    const prompt =
      feedback?.trim() && currentItems
        ? buildRefinePrompt(text, currentItems, feedback.trim())
        : buildCategorizePrompt(text)

    const items = await executeAIStep(prompt)
    return NextResponse.json({ items })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Categorization failed"
    console.error("Categorize Error:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
