import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const kilo = createOpenAI({
  baseURL: "https://api.kilo.ai/api/gateway",
  apiKey: process.env.KILO_API_KEY || "",
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
});

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

    let enhancedText = "";
    try {
      const { text: result } = await generateText({
        model: kilo("kilo-auto/free"),
        system: `You are an expert prompt enhancer for personal organization. \nYour task is to take a raw, rough, shorthand, or voice-transcribed user dump (input note/task/finance entry) and rewrite it into a clear, well-structured, and grammatically correct prompt.\nFollow these critical rules:\n1. Retain ALL original factual details: names, quantities, numbers, dates, times, currencies, and context. Do NOT lose or modify any fact.\n2. Do NOT add any fictitious information or assumptions that aren't implied.\n3. Fix typos, slang, and grammar. Keep the language natural (Indonesian, English, or mixed as written).\n4. If there are relative dates (e.g. "besok", "lusa", "next week"), preserve them exactly.\n5. Return ONLY the enhanced text. Do not include quotes, conversational introductions, or explanations.`,
        prompt: text,
      });
      enhancedText = result;
    } catch (error) {
      console.warn("Enhance prompt with kilo-auto/free failed. Falling back to gemini-1.5-flash...", error);
      const { text: result } = await generateText({
        model: google("gemini-1.5-flash"),
        system: `You are an expert prompt enhancer for personal organization. \nYour task is to take a raw, rough, shorthand, or voice-transcribed user dump (input note/task/finance entry) and rewrite it into a clear, well-structured, and grammatically correct prompt.\nFollow these critical rules:\n1. Retain ALL original factual details: names, quantities, numbers, dates, times, currencies, and context. Do NOT lose or modify any fact.\n2. Do NOT add any fictitious information or assumptions that aren't implied.\n3. Fix typos, slang, and grammar. Keep the language natural (Indonesian, English, or mixed as written).\n4. If there are relative dates (e.g. "besok", "lusa", "next week"), preserve them exactly.\n5. Return ONLY the enhanced text. Do not include quotes, conversational introductions, or explanations.`,
        prompt: text,
      });
      enhancedText = result;
    }

    return NextResponse.json({ enhancedText: enhancedText.trim() });
  } catch (error: any) {
    console.error("Enhance Prompt Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
