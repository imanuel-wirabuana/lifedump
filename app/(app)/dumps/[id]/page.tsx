"use client"

import { use, useEffect, useMemo, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import {
  Trash2,
  Pencil,
  ArrowLeft,
  Clock,
  FileDown,
  AlertCircle,
  Calendar,
} from "lucide-react"
import { EditDialog } from "@/components/edit-dialog"
import { Item } from "@/types"
import Link from "next/link"
import { useDumpStore } from "@/stores/use-dump-store"
import { ItemCard, ItemCategoryMark } from "@/components/item-card"
import {
  useItemsQuery,
  useToggleItemTaskMutation,
  useDeleteItemMutation,
} from "@/hooks/use-items"
import { useDumpByIdQuery } from "@/hooks/use-dumps"
import { mapApiItemsToPendingItems } from "@/services/mappers"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function DumpDetailPage({ params }: PageProps) {
  const { id: dumpId } = use(params)
  const { userId } = useAuth()
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const {
    setCurrentInputText,
    setExtractedItems,
    setCurrentDumpId,
    setDumpStatus,
  } = useDumpStore()

  const { data: dump, isLoading: isLoadingDump } = useDumpByIdQuery(
    userId,
    dumpId
  )

  const { data: items, isLoading: isLoadingItems } = useItemsQuery(userId)

  const isNeedsReview = dump?.status === "needs_review"
  const isFailed = dump?.status === "failed"

  useEffect(() => {
    if (dump && dump.status === "needs_review") {
      setCurrentInputText(dump.rawText || "")
      setExtractedItems(mapApiItemsToPendingItems(dump.extractedItems || []))
      setCurrentDumpId(dumpId)
      setDumpStatus("needs_review")
    }
  }, [
    dump,
    dumpId,
    setCurrentInputText,
    setExtractedItems,
    setCurrentDumpId,
    setDumpStatus,
  ])

  const displayItems = useMemo(
    () => items?.filter((item) => item.dumpId === dumpId) || [],
    [items, dumpId]
  )

  const toggleMutation = useToggleItemTaskMutation(userId)

  const deleteMutation = useDeleteItemMutation(userId)

  const isLoading = isLoadingDump || isLoadingItems

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 pt-8 md:p-8">
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

      {isLoading ? (
        <div className="flex flex-col gap-6">
          {/* Header Skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          {/* Items Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      ) : !dump ? (
        <Empty className="border-border/40 py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Calendar />
            </EmptyMedia>
            <EmptyTitle>Dump not found</EmptyTitle>
            <EmptyDescription>
              The dump you are looking for does not exist or has been deleted.
            </EmptyDescription>
          </EmptyHeader>
          <Button asChild className="mt-4">
            <Link href="/">Return Home</Link>
          </Button>
        </Empty>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Review Banner */}
          {isNeedsReview && (
            <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-indigo-900 md:flex-row md:items-center dark:text-indigo-200">
              <div className="flex items-start gap-3 text-xs">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-indigo-500" />
                <div className="space-y-1">
                  <p className="font-bold">Pending Confirmation</p>
                  <p className="text-muted-foreground">
                    These items were extracted by the AI and are pending your
                    review.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setCurrentInputText(dump.rawText || "")
                  setExtractedItems(
                    mapApiItemsToPendingItems(dump.extractedItems || [])
                  )
                  setCurrentDumpId(dumpId)
                  setDumpStatus("needs_review")
                }}
                className="shrink-0 bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Open Review Drawer
              </Button>
            </div>
          )}

          {/* Failed Banner */}
          {isFailed && (
            <div className="text-destructive-foreground flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="space-y-1 text-xs">
                <p className="font-bold">Categorization Failed</p>
                <p className="text-muted-foreground">
                  {dump.error ||
                    "An error occurred during background categorization."}
                </p>
              </div>
            </div>
          )}

          {/* Dump Header & Raw Text */}
          <Card className="relative overflow-hidden border-border/60 bg-linear-to-br from-card to-card/90 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Clock className="size-3.5" />
                <span suppressHydrationWarning>
                  {dump.createdAt
                    ? new Date(dump.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Unknown date"}
                </span>
              </div>
              <Badge
                variant="outline"
                className="h-5 px-1.5 py-0 text-[10px] font-bold tracking-wider uppercase"
              >
                {dump.sourceType}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 p-4 pt-2">
              <div className="relative border-l-2 border-primary/30 pl-4">
                <p className="text-sm leading-relaxed font-medium whitespace-pre-wrap text-foreground/90 italic">
                  &ldquo;{dump.rawText || "Empty dump content"}&rdquo;
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Generated Items */}
          {!isNeedsReview && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-md flex items-center gap-2 font-bold tracking-tight">
                  Extracted Items
                  <Badge
                    variant="secondary"
                    className="rounded-full px-2 py-0 text-xs font-semibold"
                  >
                    {displayItems.length}
                  </Badge>
                </h2>
              </div>

              {displayItems.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {displayItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      showCategory
                      leading={
                        item.category === "task" ? (
                          <Checkbox
                            checked={!!item.task?.isCompleted}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({
                                id: item.id,
                                isCompleted: !!checked,
                              })
                            }
                            className="size-4 rounded border-primary/30 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                          />
                        ) : (
                          <ItemCategoryMark category={item.category} />
                        )
                      }
                      actions={
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingItem(item)
                              setIsEditOpen(true)
                            }}
                            className="size-7 rounded-md text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              deleteMutation.mutate({
                                id: item.id,
                                category: item.category,
                              })
                            }}
                            className="size-7 rounded-md text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      }
                    />
                  ))}
                </div>
              ) : (
                <Empty className="border-border/40 py-8">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FileDown />
                    </EmptyMedia>
                    <EmptyTitle>No items found</EmptyTitle>
                    <EmptyDescription>
                      All items generated from this dump have been deleted or
                      none were created.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </div>
          )}
        </div>
      )}

      <EditDialog
        item={editingItem}
        isOpen={isEditOpen}
        onClose={() => {
          setEditingItem(null)
          setIsEditOpen(false)
        }}
      />
    </div>
  )
}
