"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDumpStore } from "@/stores/use-dump-store";
import { Mic, MicOff, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function UniversalInput() {
  const { currentInputText, setCurrentInputText } = useDumpStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "id-ID"; // Indonesian — change to "en-US" for English
    recognitionRef.current = recognition;
  }, []);

  const speechSupported = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const toggleListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    // Track what was in the input before we started recording
    const textBeforeRecording = currentInputText;
    let finalTranscript = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interim = transcript;
        }
      }
      // Append to existing text (add a space separator if there's already text)
      const prefix = textBeforeRecording ? textBeforeRecording.trimEnd() + " " : "";
      setCurrentInputText(prefix + finalTranscript + interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
  }, [isListening, currentInputText, setCurrentInputText]);

  const handleEnhance = async () => {
    if (!currentInputText.trim()) return;
    setIsEnhancing(true);

    try {
      const response = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: currentInputText }),
      });

      if (!response.ok) {
        throw new Error("Failed to enhance prompt");
      }

      const data = await response.json();
      if (data.enhancedText) {
        setCurrentInputText(data.enhancedText);
        toast.success("Prompt enhanced!");
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to enhance prompt");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentInputText.trim()) return;

    // Stop listening if active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const textToSubmit = currentInputText;
    setCurrentInputText("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/trigger-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSubmit }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit dump");
      }
    } catch (error) {
      console.error(error);
      // Put the text back if it failed to submit
      setCurrentInputText(textToSubmit);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl border bg-card text-card-foreground shadow-sm p-4">
        <h2 className="text-sm font-medium text-muted-foreground">What&apos;s on your mind?</h2>
        <Textarea
          placeholder={isListening ? "Listening..." : "Type or speak anything here..."}
          className="min-h-[120px] resize-none border-0 p-0 focus-visible:ring-0 text-base"
          value={currentInputText}
          onChange={(e) => setCurrentInputText(e.target.value)}
          disabled={isSubmitting || isEnhancing}
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {speechSupported && (
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                onClick={toggleListening}
                disabled={isSubmitting || isEnhancing}
                className={cn(
                  "relative",
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
              disabled={isSubmitting || isListening || isEnhancing || !currentInputText.trim()}
              className="gap-1.5 h-9 text-xs font-semibold hover:bg-accent transition-all duration-200"
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
          <Button onClick={handleSubmit} disabled={isSubmitting || isEnhancing || !currentInputText.trim()}>
            {isSubmitting ? "Processing..." : "Dump"}
          </Button>
        </div>
      </div>
    </div>
  );
}
