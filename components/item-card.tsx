import * as React from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Calendar,
  AlertCircle,
  Sparkles,
  Pin,
  CircleCheck,
  Circle,
  CreditCard,
  Clock,
  NotebookTabs,
  Percent,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CATEGORY_CONFIG } from "@/lib/constants"
import type { ItemCategory } from "@/types"

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

/**
 * Structural type compatible with both Item and PendingItem.
 * Contains only display-relevant fields.
 */
export interface ItemCardData {
  id?: string
  category: ItemCategory
  title: string
  content?: string
  tags?: string[]
  source?: "manual" | "ai"
  createdAt?: Date
  task?: {
    isCompleted?: boolean
    dueAt?: Date
    priority?: "none" | "low" | "medium" | "high"
  }
  finance?: {
    type: "expense" | "income"
    amount: number
    currency: "IDR"
    occurredAt?: Date
    paymentMethod?: string
  }
  note?: {
    noteType?: "journal" | "general"
  }
  isPinned?: boolean
  aiConfidence?: number
  needsClarification?: boolean
}

export interface ItemCardProps {
  item: ItemCardData
  variant?: "list" | "grid" | "review"
  density?: "default" | "compact"
  showCategory?: boolean
  showTags?: boolean
  showSource?: boolean
  showTimestamp?: boolean
  leading?: React.ReactNode
  actions?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

// ────────────────────────────────────────────────────────────────────────────
// Helper: Check if task is overdue
// ────────────────────────────────────────────────────────────────────────────

function isTaskOverdue(dueAt?: Date, isCompleted?: boolean) {
  if (!dueAt || isCompleted) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(dueAt)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate < today
}

function formatShortDate(value?: Date) {
  if (!value) return ""
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatConfidence(value?: number) {
  if (typeof value !== "number") return ""
  return `${Math.round(value * 100)}%`
}

// ────────────────────────────────────────────────────────────────────────────
// ItemCategoryMark Component
// ────────────────────────────────────────────────────────────────────────────

export interface ItemCategoryMarkProps {
  category: ItemCategory
  size?: "sm" | "md" | "lg"
  className?: string
}

export function ItemCategoryMark({
  category,
  size = "md",
  className,
}: ItemCategoryMarkProps) {
  const config = CATEGORY_CONFIG[category]
  const Icon = config.icon

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-inner",
        size === "sm" && "size-6",
        size === "md" && "size-8",
        size === "lg" && "size-10",
        className
      )}
    >
      <Icon
        className={cn(
          size === "sm" && "size-3",
          size === "md" && "size-4",
          size === "lg" && "size-5"
        )}
      />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// ItemCard Component
// ────────────────────────────────────────────────────────────────────────────

export function ItemCard({
  item,
  variant = "list",
  density = "default",
  showCategory = false,
  showTags = true,
  showSource = true,
  showTimestamp = false,
  leading,
  actions,
  footer,
  className,
}: ItemCardProps) {
  const config = CATEGORY_CONFIG[item.category]
  const isOverdue = isTaskOverdue(item.task?.dueAt, item.task?.isCompleted)
  const isCompact = density === "compact"

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-border/50 bg-card/90 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-card hover:shadow-md",
        isOverdue &&
          "border-destructive/20 bg-destructive/5 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-0.75 before:bg-destructive",
        variant === "grid" && "flex min-h-45 flex-col justify-between",
        variant === "review" && "border-primary/20 bg-primary/5",
        className
      )}
    >
      <CardContent
        className={cn(
          "flex items-start justify-between gap-3 sm:gap-4",
          isCompact ? "p-3" : "p-4",
          isOverdue && "pl-5"
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {/* Leading Slot */}
          {leading && <div className="mt-0.5 shrink-0">{leading}</div>}

          {/* Main Content */}
          <div className="min-w-0 flex-1 space-y-1">
            {/* Title & Category Badge */}
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p
                className={cn(
                  "min-w-0 flex-1 truncate leading-snug font-semibold",
                  isCompact ? "text-xs" : "text-sm",
                  item.task?.isCompleted &&
                    "font-normal text-muted-foreground line-through"
                )}
              >
                {item.title}
              </p>
              {showCategory && (
                <Badge
                  variant={config.badgeVariant}
                  className="h-4 shrink-0 px-1 py-0 text-[9px] font-bold tracking-wider uppercase"
                >
                  {item.category}
                </Badge>
              )}
              {item.isPinned && (
                <Badge
                  variant="secondary"
                  className="h-5 shrink-0 gap-1 rounded-full px-1.5 py-0 text-[9px] font-bold tracking-wider uppercase"
                >
                  <Pin className="size-2.5 fill-current" />
                  Pinned
                </Badge>
              )}
            </div>

            {/* Content/Description */}
            {item.content && (
              <p
                className={cn(
                  "mt-0.5 max-w-70 text-muted-foreground md:max-w-100",
                  "max-w-full leading-relaxed",
                  isCompact
                    ? "line-clamp-1 text-[11px]"
                    : "line-clamp-2 text-xs",
                  variant === "grid" && "line-clamp-4 whitespace-pre-wrap"
                )}
              >
                {item.content}
              </p>
            )}

            {/* Metadata Row */}
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
              {/* Task: Completion State */}
              {item.category === "task" && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    item.task?.isCompleted
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  )}
                >
                  {item.task?.isCompleted ? (
                    <CircleCheck className="size-3" />
                  ) : (
                    <Circle className="size-3" />
                  )}
                  {item.task?.isCompleted ? "Done" : "Open"}
                </span>
              )}

              {/* Task: Due Date */}
              {item.category === "task" && item.task?.dueAt && (
                <span
                  suppressHydrationWarning
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-medium",
                    isOverdue
                      ? "font-semibold text-destructive"
                      : "text-muted-foreground"
                  )}
                >
                  <Calendar className="size-3 shrink-0" />
                  Due: {formatShortDate(item.task.dueAt)}
                </span>
              )}

              {/* Task: Priority Badge */}
              {item.category === "task" &&
                item.task?.priority &&
                item.task.priority !== "none" && (
                  <Badge
                    variant="outline"
                    className="h-3.5 shrink-0 border-primary/30 bg-primary/10 px-1 py-0 text-[8px] font-bold tracking-wider text-primary uppercase"
                  >
                    {item.task.priority}
                  </Badge>
                )}

              {/* Task: Overdue Badge */}
              {isOverdue && (
                <Badge
                  variant="destructive"
                  className="h-3.5 shrink-0 px-1 py-0 text-[8px] font-bold tracking-wider uppercase"
                >
                  <AlertCircle className="mr-0.5 size-2.5" />
                  Overdue
                </Badge>
              )}

              {/* Finance: Amount (rendered in metadata, styled by parent if needed) */}
              {item.category === "finance" && item.finance && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-bold",
                    item.finance.type === "expense"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {item.finance.type === "expense" ? "-" : "+"} Rp{" "}
                  {item.finance.amount.toLocaleString()}
                </span>
              )}

              {/* Finance: Occurred Date */}
              {item.category === "finance" && item.finance?.occurredAt && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <Clock className="size-3 shrink-0" />
                  {formatShortDate(item.finance.occurredAt)}
                </span>
              )}

              {/* Finance: Payment Method */}
              {item.category === "finance" && item.finance?.paymentMethod && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <CreditCard className="size-3 shrink-0" />
                  {item.finance.paymentMethod}
                </span>
              )}

              {/* Note: Type */}
              {item.category === "note" && item.note?.noteType && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <NotebookTabs className="size-3 shrink-0" />
                  {item.note.noteType}
                </span>
              )}

              {/* AI Source Indicator */}
              {showSource && item.source === "ai" && (
                <span
                  className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-primary"
                  title="AI Generated"
                >
                  <Sparkles className="size-2.5" />
                  AI
                </span>
              )}

              {showSource && item.source === "manual" && (
                <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
                  Manual
                </span>
              )}

              {item.aiConfidence !== undefined && (
                <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <Percent className="size-2.5" />
                  {formatConfidence(item.aiConfidence)}
                </span>
              )}

              {item.needsClarification && (
                <Badge
                  variant="outline"
                  className="h-4 shrink-0 border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[8px] font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400"
                >
                  Needs review
                </Badge>
              )}

              {/* Timestamp */}
              {showTimestamp && item.createdAt && (
                <span
                  className="text-[10px] font-medium text-muted-foreground"
                  suppressHydrationWarning
                >
                  {new Date(item.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>

            {/* Tags */}
            {showTags && item.tags && item.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="shrink-0 rounded border-border bg-muted/40 px-1.5 py-0 font-mono text-[9px] font-normal text-muted-foreground transition-colors hover:bg-muted/80"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions Slot */}
        {actions && (
          <div className="mt-0.5 flex shrink-0 items-center gap-1 opacity-90 transition-opacity group-hover:opacity-100">
            {actions}
          </div>
        )}
      </CardContent>

      {/* Footer Slot */}
      {footer && (
        <CardFooter className={cn("px-4 pt-0", isCompact ? "pb-3" : "pb-4")}>
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// ItemCardSkeleton Component
// ────────────────────────────────────────────────────────────────────────────

export interface ItemCardSkeletonProps {
  variant?: "list" | "grid" | "review"
  density?: "default" | "compact"
}

export function ItemCardSkeleton({
  density = "default",
}: ItemCardSkeletonProps) {
  const isCompact = density === "compact"

  return (
    <Card className="border-border/40 shadow-sm">
      <CardContent
        className={cn("flex items-center gap-3", isCompact ? "p-3" : "p-4")}
      >
        <Skeleton className={cn("rounded", isCompact ? "size-4" : "size-8")} />
        <div className="flex-1 space-y-2">
          <Skeleton className={cn(isCompact ? "h-3 w-3/4" : "h-4 w-3/4")} />
          <Skeleton className={cn(isCompact ? "h-2 w-1/3" : "h-3 w-1/3")} />
        </div>
      </CardContent>
    </Card>
  )
}
