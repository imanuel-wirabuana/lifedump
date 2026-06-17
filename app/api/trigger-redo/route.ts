import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/services/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { tasks } from "@trigger.dev/sdk";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { dumpId, rawText, feedback } = await req.json();

    if (!dumpId) {
      return NextResponse.json({ error: "Dump ID is required" }, { status: 400 });
    }

    // 1. Get the dump document to retrieve the raw text
    const dumpDocRef = doc(db, "users", userId, "dumps", dumpId);
    const dumpDoc = await getDoc(dumpDocRef);
    if (!dumpDoc.exists()) {
      return NextResponse.json({ error: "Dump not found" }, { status: 404 });
    }
    const dumpData = dumpDoc.data();

    // 2. Determine rawText and prepare update payload
    let finalRawText = dumpData.rawText;
    const updatePayload: Record<string, any> = {
      status: "processing",
      updatedAt: serverTimestamp(),
    };

    if (rawText !== undefined && rawText !== null) {
      updatePayload.rawText = rawText;
      finalRawText = rawText;
    }

    await updateDoc(dumpDocRef, updatePayload);

    // 3. Trigger the Trigger.dev redo task
    await tasks.trigger("redo-dump", {
      dumpId,
      userId,
      rawText: finalRawText,
      feedback: feedback && feedback.trim() ? feedback : undefined,
    });

    return NextResponse.json({ dumpId, status: "processing" }, { status: 202 });
  } catch (error: any) {
    console.error("Trigger Redo Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
