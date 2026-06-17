import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/services/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { tasks } from "@trigger.dev/sdk/v3";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { dumpId, feedback, currentItems } = await req.json();

    if (!dumpId) {
      return NextResponse.json({ error: "Dump ID is required" }, { status: 400 });
    }

    if (!feedback || !feedback.trim()) {
      return NextResponse.json({ error: "Feedback is required" }, { status: 400 });
    }

    // 1. Get the dump document to retrieve the raw text
    const dumpDocRef = doc(db, "users", userId, "dumps", dumpId);
    const dumpDoc = await getDoc(dumpDocRef);
    if (!dumpDoc.exists()) {
      return NextResponse.json({ error: "Dump not found" }, { status: 404 });
    }
    const dumpData = dumpDoc.data();

    // 2. Update status back to "processing" to trigger the global loading indicator
    await updateDoc(dumpDocRef, {
      status: "processing",
      updatedAt: serverTimestamp(),
    });

    // 3. Trigger the Trigger.dev background task
    await tasks.trigger("categorize-dump", {
      dumpId,
      userId,
      rawText: dumpData.rawText,
      feedback,
      currentItems,
    });

    return NextResponse.json({ dumpId, status: "processing" }, { status: 202 });
  } catch (error: any) {
    console.error("Trigger Refine Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
