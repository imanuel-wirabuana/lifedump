"use client";

import { useAuth } from "@clerk/nextjs";
import { useDumpStore } from "@/stores/use-dump-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Check, ArrowLeft, Clock, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { useDumpsQuery } from "@/hooks/use-dumps";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dump } from "@/types";

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ReviewPage() {
  const { userId } = useAuth();
  const { setCurrentInputText, setExtractedItems, setCurrentDumpId, setDumpStatus } = useDumpStore();

  const { data: dumps, isLoading } = useDumpsQuery(userId);

  const [redoDump, setRedoDump] = useState<Dump | null>(null);
  const [redoRawText, setRedoRawText] = useState("");
  const [redoFeedback, setRedoFeedback] = useState("");
  const [isSubmittingRedo, setIsSubmittingRedo] = useState(false);

  const handleRedoSubmit = async () => {
    if (!redoDump) return;
    setIsSubmittingRedo(true);

    try {
      const response = await fetch("/api/trigger-refine", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dumpId: redoDump.id,
          rawText: redoRawText.trim() !== redoDump.rawText?.trim() ? redoRawText.trim() : undefined,
          feedback: redoFeedback.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit redo request");
      }

      toast.success("Redo triggered! Dump is now processing.");
      setRedoDump(null);
    } catch (error: any) {
      console.error("Redo error:", error);
      toast.error(error.message || "An error occurred while retrying the dump");
    } finally {
      setIsSubmittingRedo(false);
    }
  };

  const pendingDumps = (dumps || []).filter(
    (dump) =>
      dump.status === "processing" ||
      dump.status === "needs_review" ||
      dump.status === "failed"
  );

  return (
    <div className="flex flex-col p-4 md:p-8 max-w-2xl mx-auto w-full pt-8 gap-6">
      {/* Back Button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Pending Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and confirm draft items extracted by the AI before saving them to your active lists.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="size-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pendingDumps.length > 0 ? (
        <div className="flex flex-col gap-4">
          {pendingDumps.map((dump) => {
            const itemCount = dump.extractedItems?.length || 0;
            const isReviewable = dump.status === "needs_review";

            return (
              <Card
                key={dump.id}
                onClick={() => {
                  if (isReviewable) {
                    setCurrentInputText(dump.rawText || "");
                    setExtractedItems(dump.extractedItems || []);
                    setCurrentDumpId(dump.id);
                    setDumpStatus("needs_review");
                  }
                }}
                className={cn(
                  "border-border/50 shadow-sm transition-all duration-200",
                  isReviewable
                    ? "hover:border-border hover:-translate-y-[2px] cursor-pointer hover:shadow-md"
                    : "cursor-default opacity-80"
                )}
              >
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground/90 line-clamp-3 italic pl-3 border-l-2 border-primary/20">
                        "{dump.rawText || "Empty dump"}"
                      </p>
                      {dump.status === "failed" && dump.error && (
                        <p className="text-xs text-destructive mt-2 font-mono bg-destructive/5 dark:bg-destructive/10 p-2 rounded border border-destructive/20 pl-3">
                          Error: {dump.error}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0 items-center">
                      {dump.status === "processing" && (
                        <Badge variant="secondary" className="text-[10px] font-medium h-5 px-1.5 animate-pulse bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                          Processing...
                        </Badge>
                      )}
                      {dump.status === "failed" && (
                        <Badge variant="destructive" className="text-[10px] font-medium h-5 px-1.5">
                          Failed
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] shrink-0 font-medium capitalize h-5 px-1.5">
                        {dump.sourceType}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Clock className="size-3.5" />
                      <span suppressHydrationWarning>{formatRelativeTime(dump.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {dump.status === "needs_review" && (
                        <>
                          <Badge variant="secondary" className="text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                            <Sparkles className="size-3 mr-1 inline-block" />
                            {itemCount} {itemCount === 1 ? "item" : "items"}
                          </Badge>
                          <Button size="sm" className="h-7 px-3 text-xs bg-primary hover:bg-primary/95 text-white font-medium rounded-lg">
                            Review
                          </Button>
                        </>
                      )}
                      {dump.status === "processing" && (
                        <Button size="sm" disabled className="h-7 px-3 text-xs gap-1">
                          <Loader2 className="size-3 animate-spin" />
                          Processing
                        </Button>
                      )}
                      {dump.status === "failed" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 px-3 text-xs font-semibold hover:bg-destructive/90 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRedoDump(dump);
                            setRedoRawText(dump.rawText || "");
                            setRedoFeedback("");
                          }}
                        >
                          Redo
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty className="border-border/40 py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Check className="size-6 text-emerald-500" />
            </EmptyMedia>
            <EmptyTitle>All caught up!</EmptyTitle>
            <EmptyDescription>You have no pending dumps to review. Everything has been organized.</EmptyDescription>
          </EmptyHeader>
          <Button asChild className="mt-4">
            <Link href="/">Return to Dashboard</Link>
          </Button>
        </Empty>
      )}

      {/* Redo Modal Dialog */}
      <Dialog open={!!redoDump} onOpenChange={(open) => !open && setRedoDump(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redo Failed Dump</DialogTitle>
            <DialogDescription>
              Adjust the original text or add extra instructions/guidance to help the AI process this dump correctly.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rawText" className="text-xs font-semibold text-foreground/80">
                Original Text
              </Label>
              <Textarea
                id="rawText"
                value={redoRawText}
                onChange={(e) => setRedoRawText(e.target.value)}
                placeholder="What did you dump?"
                rows={4}
                className="text-xs bg-muted/30 focus-visible:ring-primary/30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="feedback" className="text-xs font-semibold text-foreground/80">
                Additional Instruction / Context <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="feedback"
                value={redoFeedback}
                onChange={(e) => setRedoFeedback(e.target.value)}
                placeholder="e.g., 'This is a task due tomorrow at 10 AM', 'Ignore the currency, it should be USD', etc."
                rows={3}
                className="text-xs focus-visible:ring-primary/30"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setRedoDump(null)}
              disabled={isSubmittingRedo}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRedoSubmit}
              disabled={isSubmittingRedo || (!redoRawText.trim() && !redoFeedback.trim())}
              className="text-xs h-9 bg-primary hover:bg-primary/95 text-white"
            >
              {isSubmittingRedo ? (
                <>
                  <Loader2 className="mr-2 size-3 animate-spin" />
                  Processing...
                </>
              ) : (
                "Redo Dump"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
