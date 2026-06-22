"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useDumpStore } from "@/stores/use-dump-store"
import { Mic, MicOff, Sparkles, Loader2, SendHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useSettings } from "@/hooks/use-settings"

export function UniversalInput() {
  const { currentInputText, setCurrentInputText } = useDumpStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const { settings } = useSettings()
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    queueMicrotask(() => {
      setSpeechSupported(true)
    })

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "id-ID" // Indonesian — change to "en-US" for English
    recognitionRef.current = recognition
  }, [])

  const toggleListening = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) return

    if (isListening) {
      recognition.stop()
      setIsListening(false)
      return
    }

    // Track what was in the input before we started recording
    const textBeforeRecording = currentInputText
    let finalTranscript = ""

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " "
        } else {
          interim = transcript
        }
      }
      // Append to existing text (add a space separator if there's already text)
      const prefix = textBeforeRecording
        ? textBeforeRecording.trimEnd() + " "
        : ""
      setCurrentInputText(prefix + finalTranscript + interim)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error)
      toast.error("Voice capture stopped. Try again or type instead.")
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
    setIsListening(true)
  }, [isListening, currentInputText, setCurrentInputText])

  const handleEnhance = async () => {
    if (!currentInputText.trim()) return
    setIsEnhancing(true)

    try {
      const response = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: currentInputText,
          aiBaseUrl: settings.aiBaseUrl,
          aiApiKey: settings.aiApiKey,
          aiModel: settings.aiModel,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to enhance prompt")
      }

      const data = await response.json()
      if (data.enhancedText) {
        setCurrentInputText(data.enhancedText)
        toast.success("Prompt enhanced!")
      }
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : "Failed to enhance prompt"
      )
    } finally {
      setIsEnhancing(false)
    }
  }

  const handleSubmit = async () => {
    if (!currentInputText.trim()) return

    // Stop listening if active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }

    const textToSubmit = currentInputText
    setCurrentInputText("")
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/trigger-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSubmit,
          aiBaseUrl: settings.aiBaseUrl,
          aiApiKey: settings.aiApiKey,
          aiModel: settings.aiModel,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit dump")
      }
    } catch (error) {
      console.error(error)
      // Put the text back if it failed to submit
      setCurrentInputText(textToSubmit)
      toast.error(
        error instanceof Error ? error.message : "Failed to submit dump"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border bg-card/90 p-4 text-card-foreground shadow-sm backdrop-blur-xl transition-all md:p-5",
          isListening &&
            "border-primary/40 shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_14%,transparent)]"
        )}
      >
        <div className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="ld-page-kicker">Quick capture</p>
            <h2 className="text-lg font-black tracking-tight">
              Unload your brain
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Tasks, expenses, notes — messy text is fine.
            </p>
          </div>
          {isListening && (
            <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
              Listening
            </span>
          )}
        </div>
        <Textarea
          placeholder={
            isListening ? "Listening..." : "Type or speak anything here..."
          }
          className="relative min-h-[132px] resize-none border-0 bg-transparent p-0 text-base leading-7 shadow-none focus-visible:ring-0"
          value={currentInputText}
          onChange={(e) => setCurrentInputText(e.target.value)}
          disabled={isSubmitting || isEnhancing}
        />
        <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
          <div className="flex items-center gap-2">
            {speechSupported && (
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                onClick={toggleListening}
                disabled={isSubmitting || isEnhancing}
                aria-label={
                  isListening ? "Stop voice input" : "Start voice input"
                }
                className={cn(
                  "relative rounded-full",
                  isListening && "animate-pulse"
                )}
              >
                {isListening ? <MicOff /> : <Mic />}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEnhance}
              disabled={
                isSubmitting ||
                isListening ||
                isEnhancing ||
                !currentInputText.trim()
              }
              className="h-9 gap-1.5 rounded-full text-xs font-semibold transition-all duration-200 hover:bg-accent"
            >
              {isEnhancing ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Enhancing...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5 text-primary" />
                  Enhance
                </>
              )}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">
              {currentInputText.trim().length} chars
            </span>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isEnhancing || !currentInputText.trim()}
              className="rounded-full px-5 font-bold shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <SendHorizontal className="size-4" /> Dump
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
