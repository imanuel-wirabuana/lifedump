"use client"

import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { UniversalInput } from "@/components/universal-input"
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useMemo, useState, useRef, useEffect } from "react"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import {
  Trash2,
  Calendar,
  Loader2,
  CheckSquare,
  NotebookTabs,
  TrendingUp,
} from "lucide-react"
import { cn, formatRelativeTime } from "@/lib/utils"
import { Item } from "@/types"
import { useItemsQuery } from "@/hooks/use-items"
import { useDumpsQuery, useDeleteDumpMutation } from "@/hooks/use-dumps"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { CATEGORY_CONFIG } from "@/lib/constants"

export default function Home() {
  const { userId } = useAuth()
  const router = useRouter()
  const [visibleCount, setVisibleCount] = useState(5)
  const [dumpToDelete, setDumpToDelete] = useState<string | null>(null)

  const { data: items = [], isLoading } = useItemsQuery(userId)
  const { data: dumps = [], isLoading: isLoadingDumps } = useDumpsQuery(userId)
  const deleteDumpMutation = useDeleteDumpMutation(userId)

  const confirmedDumps = useMemo(
    () => dumps.filter((dump) => dump.status === "confirmed"),
    [dumps]
  )
  const recentDumps = useMemo(
    () => confirmedDumps.slice(0, visibleCount),
    [confirmedDumps, visibleCount]
  )
  const hasNextPage = confirmedDumps.length > visibleCount
  const itemsByDumpId = useMemo(() => {
    return items.reduce<Record<string, Item[]>>((groups, item) => {
      if (item.dumpId) {
        groups[item.dumpId] ??= []
        groups[item.dumpId].push(item)
      }
      return groups
    }, {})
  }, [items])

  // Infinite Scroll Intersection Observer
  const observerRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 5)
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerRef.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasNextPage])

  const { activeTasksCount, notesCount, netBalance } = useMemo(() => {
    let activeTasksCount = 0
    let notesCount = 0
    let netBalance = 0

    for (const item of items) {
      if (item.category === "task" && !item.task?.isCompleted) {
        activeTasksCount += 1
      }

      if (item.category === "note") {
        notesCount += 1
      }

      if (item.category === "finance") {
        const amount = item.finance?.amount || 0
        netBalance += item.finance?.type === "expense" ? -amount : amount
      }
    }

    return {
      activeTasksCount,
      notesCount,
      netBalance,
    }
  }, [items])

  return (
    <div className="ld-page-shell gap-8">
      {/* Welcome / Header */}
      <div>
        <p className="ld-page-kicker">Today</p>
        <h1 className="ld-page-title">Your Dashboard</h1>
        <p className="ld-page-subtitle">
          Capture everything, declutter your mind, and view your daily
          statistics.
        </p>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="ld-glass-card group relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
            <CardDescription className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Tasks
            </CardDescription>
            <CheckSquare className="size-3.5 text-amber-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {isLoading ? (
              <Skeleton className="mt-1 h-6 w-10" />
            ) : (
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight md:text-xl">
                  {activeTasksCount}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  pending
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="ld-glass-card group relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
            <CardDescription className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Notes
            </CardDescription>
            <NotebookTabs className="size-3.5 text-indigo-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {isLoading ? (
              <Skeleton className="mt-1 h-6 w-10" />
            ) : (
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight md:text-xl">
                  {notesCount}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  saved entries
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="ld-glass-card group relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
            <CardDescription className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Cashflow
            </CardDescription>
            <TrendingUp className="size-3.5 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {isLoading ? (
              <Skeleton className="mt-1 h-6 w-12" />
            ) : (
              <div className="flex flex-col">
                <span
                  className={cn(
                    "truncate text-xs font-bold tracking-tight md:text-[13px]",
                    netBalance >= 0 ? "text-emerald-500" : "text-destructive"
                  )}
                >
                  {netBalance >= 0 ? "+" : ""}Rp {netBalance.toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  net monthly
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Universal Input Section */}
      <UniversalInput />

      {/* Recent Feed */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold tracking-tight">Recent Dumps</h2>

        {isLoading || isLoadingDumps ? (
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
        ) : confirmedDumps.length > 0 ? (
          <div className="flex flex-col gap-3">
            {recentDumps.map((dump) => {
              const dumpItems = itemsByDumpId[dump.id] ?? []

              return (
                <div
                  key={dump.id}
                  onClick={() => {
                    router.push(`/dumps/${dump.id}`)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      router.push(`/dumps/${dump.id}`)
                    }
                  }}
                  tabIndex={0}
                  className="block cursor-pointer rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <Card className="group border-border/50 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md">
                    <CardContent className="flex flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <p className="line-clamp-2 flex-1 border-l-2 border-primary/20 pl-3 text-sm font-medium text-foreground/90 italic">
                          &ldquo;{dump.rawText || "Empty dump"}&rdquo;
                        </p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="h-5 shrink-0 px-1.5 text-[10px] font-medium capitalize"
                          >
                            {dump.sourceType}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deleteDumpMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation()
                              setDumpToDelete(dump.id)
                            }}
                            className="size-7 shrink-0 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Delete Dump"
                          >
                            {deleteDumpMutation.isPending &&
                            deleteDumpMutation.variables === dump.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/40 pt-2">
                        <span
                          className="text-[11px] text-muted-foreground"
                          suppressHydrationWarning
                        >
                          {formatRelativeTime(dump.createdAt)}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {dumpItems.length > 0 ? (
                            dumpItems.map((item) => {
                              const config = CATEGORY_CONFIG[item.category]
                              const Icon = config.icon
                              return (
                                <div
                                  key={item.id}
                                  title={`${item.category}: ${item.title}`}
                                  className="flex size-5 items-center justify-center rounded-md border border-muted bg-muted/10 text-[10px]"
                                >
                                  <Icon className="size-3" />
                                </div>
                              )
                            })
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">
                              No items
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}

            {/* Infinite Scroll Sentinel & Loader */}
            <div
              ref={observerRef}
              className="flex w-full items-center justify-center py-4"
            >
              {hasNextPage ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVisibleCount((prev) => prev + 5)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Load More
                </Button>
              ) : (
                <span className="text-xs font-medium text-muted-foreground/40">
                  All dumps loaded
                </span>
              )}
            </div>
          </div>
        ) : (
          <Empty className="border-border/40 py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Calendar />
              </EmptyMedia>
              <EmptyTitle>Your dashboard is empty</EmptyTitle>
              <EmptyDescription>
                Use the input above to dump tasks, expenses, or notes, and they
                will appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>

      <ConfirmDeleteDialog
        open={!!dumpToDelete}
        title="Delete dump?"
        description="This removes the dump record. Generated items are not deleted automatically."
        isPending={deleteDumpMutation.isPending}
        onOpenChange={(open) => !open && setDumpToDelete(null)}
        onConfirm={() => {
          if (!dumpToDelete) return
          deleteDumpMutation.mutate(dumpToDelete, {
            onSuccess: () => setDumpToDelete(null),
          })
        }}
      />
    </div>
  )
}
