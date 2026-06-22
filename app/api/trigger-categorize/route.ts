import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/services/firebase"
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore"
import { tasks } from "@trigger.dev/sdk"

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

    // 1. Create a dump document in Firestore with status = "processing"
    const dumpDocRef = doc(collection(db, "users", userId, "dumps"))
    const dumpId = dumpDocRef.id

    await setDoc(dumpDocRef, {
      userId,
      sourceType: "text",
      rawText: text,
      status: "processing",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // 2. Trigger the Trigger.dev background task
    await tasks.trigger("categorize-dump", {
      dumpId,
      userId,
      rawText: text,
      aiSettings: {
        baseUrl: body.aiBaseUrl,
        apiKey: body.aiApiKey,
        model: body.aiModel,
      },
    })

    return NextResponse.json({ dumpId, status: "processing" }, { status: 202 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Trigger categorize failed"
    console.error("Trigger Categorize Error:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
