"use client"

import { useAuth } from "@clerk/nextjs"
import { useDumpStore } from "@/stores/use-dump-store"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import {
  Check,
  ArrowLeft,
  Clock,
  Sparkles,
  Loader2,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useDumpsQuery, useDeleteDumpMutation } from "@/hooks/use-dumps"
import { cn, formatRelativeTime } from "@/lib/utils"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dump } from "@/types"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { mapApiItemsToPendingItems } from "@/services/mappers"
import { useSettings } from "@/hooks/use-settings"

export default function ReviewPage() {
  const { userId } = useAuth()
  const {
    setCurrentInputText,
    setExtractedItems,
    setCurrentDumpId,
    setDumpStatus,
  } = useDumpStore()

  const { data: dumps, isLoading } = useDumpsQuery(userId)
  const deleteDumpMutation = useDeleteDumpMutation(userId)

  const [redoDump, setRedoDump] = useState<Dump | null>(null)
  const [redoRawText, setRedoRawText] = useState("")
  const [redoFeedback, setRedoFeedback] = useState("")
  const [isSubmittingRedo, setIsSubmittingRedo] = useState(false)
  const [dumpToDelete, setDumpToDelete] = useState<string | null>(null)
  const { settings } = useSettings()

  const handleRedoSubmit = async () => {
    if (!redoDump) return
    setIsSubmittingRedo(true)

    try {
      const response = await fetch("/api/trigger-redo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dumpId: redoDump.id,
          rawText:
            redoRawText.trim() !== redoDump.rawText?.trim()
              ? redoRawText.trim()
              : undefined,
          feedback: redoFeedback.trim() || undefined,
          aiBaseUrl: settings.aiBaseUrl,
          aiApiKey: settings.aiApiKey,
          aiModel: settings.aiModel,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to submit redo request")
      }

      toast.success("Redo triggered! Dump is now processing.")
      setRedoDump(null)
    } catch (error) {
      console.error("Redo error:", error)
      toast.error(
        error instanceof Error
          ? error.message
          : "An error occurred while retrying the dump"
      )
    } finally {
      setIsSubmittingRedo(false)
    }
  }

  const pendingDumps = useMemo(
    () =>
      (dumps || []).filter(
        (dump) =>
          dump.status === "processing" ||
          dump.status === "needs_review" ||
          dump.status === "failed"
      ),
    [dumps]
  )

  return (
    <div className="ld-page-shell">
      {/* Back Button */}
      <div>
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Dashboard
        </Link>
      </div>

      <div>
        <p className="ld-page-kicker">AI inbox</p>
        <h1 className="ld-page-title">Pending Reviews</h1>
        <p className="ld-page-subtitle">
          Review and confirm draft items extracted by the AI before saving them
          to your active lists.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-3 p-4">
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
            const itemCount = dump.extractedItems?.length || 0
            const isReviewable = dump.status === "needs_review"

            return (
              <Card
                key={dump.id}
                onClick={() => {
                  if (isReviewable) {
                    setCurrentInputText(dump.rawText || "")
                    setExtractedItems(
                      mapApiItemsToPendingItems(dump.extractedItems || [])
                    )
                    setCurrentDumpId(dump.id)
                    setDumpStatus("needs_review")
                  }
                }}
                className={cn(
                  "border-border/50 shadow-sm transition-all duration-200",
                  isReviewable
                    ? "cursor-pointer hover:-translate-y-px hover:border-border hover:shadow-md"
                    : "cursor-default opacity-80"
                )}
              >
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-3 border-l-2 border-primary/20 pl-3 text-sm font-medium text-foreground/90 italic">
                        &ldquo;{dump.rawText || "Empty dump"}&rdquo;
                      </p>
                      {dump.status === "failed" && dump.error && (
                        <p className="mt-2 rounded border border-destructive/20 bg-destructive/5 p-2 pl-3 font-mono text-xs text-destructive dark:bg-destructive/10">
                          Error: {dump.error}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {dump.status === "processing" && (
                        <Badge
                          variant="secondary"
                          className="h-5 animate-pulse border-indigo-500/20 bg-indigo-500/10 px-1.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400"
                        >
                          Processing...
                        </Badge>
                      )}
                      {dump.status === "failed" && (
                        <Badge
                          variant="destructive"
                          className="h-5 px-1.5 text-[10px] font-medium"
                        >
                          Failed
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="h-5 shrink-0 px-1.5 text-[10px] font-medium capitalize"
                      >
                        {dump.sourceType}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/40 pt-2">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Clock className="size-3.5" />
                      <span suppressHydrationWarning>
                        {formatRelativeTime(dump.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        disabled={deleteDumpMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation()
                          setDumpToDelete(dump.id)
                        }}
                      >
                        {deleteDumpMutation.isPending &&
                        deleteDumpMutation.variables === dump.id ? (
                          <Loader2 className="size-3.5 animate-spin text-destructive" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>

                      {dump.status === "needs_review" && (
                        <>
                          <Badge
                            variant="secondary"
                            className="border-indigo-500/20 bg-indigo-500/10 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400"
                          >
                            <Sparkles className="mr-1 inline-block size-3" />
                            {itemCount} {itemCount === 1 ? "item" : "items"}
                          </Badge>
                          <Button
                            size="sm"
                            className="h-7 rounded-lg bg-primary px-3 text-xs font-medium text-white hover:bg-primary/95"
                          >
                            Review
                          </Button>
                        </>
                      )}
                      {dump.status === "processing" && (
                        <Button
                          size="sm"
                          disabled
                          className="h-7 gap-1 px-3 text-xs"
                        >
                          <Loader2 className="size-3 animate-spin" />
                          Processing
                        </Button>
                      )}
                      {dump.status === "failed" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 px-3 text-xs font-semibold transition-colors hover:bg-destructive/90"
                          onClick={(e) => {
                            e.stopPropagation()
                            setRedoDump(dump)
                            setRedoRawText(dump.rawText || "")
                            setRedoFeedback("")
                          }}
                        >
                          Redo
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Empty className="border-border/40 py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Check className="size-6 text-emerald-500" />
            </EmptyMedia>
            <EmptyTitle>All caught up!</EmptyTitle>
            <EmptyDescription>
              You have no pending dumps to review. Everything has been
              organized.
            </EmptyDescription>
          </EmptyHeader>
          <Button asChild className="mt-4">
            <Link href="/">Return to Dashboard</Link>
          </Button>
        </Empty>
      )}

      {/* Redo Modal Dialog */}
      <Dialog
        open={!!redoDump}
        onOpenChange={(open) => !open && setRedoDump(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redo Failed Dump</DialogTitle>
            <DialogDescription>
              Adjust the original text or add extra instructions/guidance to
              help the AI process this dump correctly.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="rawText"
                className="text-xs font-semibold text-foreground/80"
              >
                Original Text
              </Label>
              <Textarea
                id="rawText"
                value={redoRawText}
                onChange={(e) => setRedoRawText(e.target.value)}
                placeholder="What did you dump?"
                rows={4}
                className="bg-muted/30 text-xs focus-visible:ring-primary/30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="feedback"
                className="text-xs font-semibold text-foreground/80"
              >
                Additional Instruction / Context{" "}
                <span className="font-normal text-muted-foreground">
                  (Optional)
                </span>
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
              className="h-9 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRedoSubmit}
              disabled={
                isSubmittingRedo ||
                (!redoRawText.trim() && !redoFeedback.trim())
              }
              className="h-9 bg-primary text-xs text-white hover:bg-primary/95"
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
      <ConfirmDeleteDialog
        open={!!dumpToDelete}
        title="Delete dump?"
        description="This removes the dump from your review queue. This action cannot be undone."
        isPending={deleteDumpMutation.isPending}
        onOpenChange={(open) => !open && setDumpToDelete(null)}
        onConfirm={() => {
          if (!dumpToDelete) return
          deleteDumpMutation.mutate(dumpToDelete, {
            onSuccess: () => {
              toast.success("Dump deleted successfully")
              setDumpToDelete(null)
            },
            onError: () => toast.error("Failed to delete dump"),
          })
        }}
      />
    </div>
  )
}
