import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { tasks } from "@trigger.dev/sdk/v3";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { text } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // 1. Create a dump document in Firestore with status = "processing"
    const dumpDocRef = doc(collection(db, "users", userId, "dumps"));
    const dumpId = dumpDocRef.id;

    await setDoc(dumpDocRef, {
      userId,
      sourceType: "text",
      rawText: text,
      status: "processing",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Trigger the Trigger.dev background task
    await tasks.trigger("categorize-dump", {
      dumpId,
      userId,
      rawText: text,
    });

    return NextResponse.json({ dumpId, status: "processing" }, { status: 202 });
  } catch (error: any) {
    console.error("Trigger Categorize Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
