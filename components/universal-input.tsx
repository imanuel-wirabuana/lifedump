"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDumpStore, PendingItem } from "@/store/use-dump-store";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function UniversalInput() {
  const { currentInputText, setCurrentInputText } = useDumpStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "id-ID"; // Indonesian — change to "en-US" for English

      recognitionRef.current = recognition;
    }
  }, []);

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

  const handleSubmit = async () => {
    if (!currentInputText.trim()) return;

    // Stop listening if active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/dumps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: currentInputText }),
      });

      if (!response.ok) {
        throw new Error("Failed to create dump");
      }

      // Clear the text immediately
      setCurrentInputText("");

      toast.success("Dump submitted successfully!", {
        description: "AI is organizing it in the background.",
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit dump. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl border bg-card text-card-foreground shadow-sm p-4">
        <h2 className="text-sm font-medium text-muted-foreground">What's on your mind?</h2>
        <Textarea
          placeholder={isListening ? "Listening..." : "Type or speak anything here..."}
          className="min-h-[120px] resize-none border-0 p-0 focus-visible:ring-0 text-base"
          value={currentInputText}
          onChange={(e) => setCurrentInputText(e.target.value)}
          disabled={isSubmitting}
        />
        <div className="flex items-center justify-between mt-2">
          <div>
            {speechSupported && (
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                onClick={toggleListening}
                disabled={isSubmitting}
                className={cn(
                  "relative",
                  isListening && "animate-pulse"
                )}
              >
                {isListening ? <MicOff /> : <Mic />}
              </Button>
            )}
          </div>
          <Button onClick={handleSubmit} disabled={isSubmitting || !currentInputText.trim()}>
            {isSubmitting ? "Processing..." : "Dump"}
          </Button>
        </div>
      </div>
    </div>
  );
}
