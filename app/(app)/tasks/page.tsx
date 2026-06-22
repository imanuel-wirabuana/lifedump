"use client"

import { useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckSquare,
  Plus,
  Trash2,
  Pencil,
  Tag,
  Filter,
  ArrowUpDown,
} from "lucide-react"
import { ItemCard, ItemCardSkeleton } from "@/components/item-card"
import { cn } from "@/lib/utils"
import { EditDialog } from "@/components/edit-dialog"
import { AddItemDialog } from "@/components/add-item-dialog"
import { Item, ItemCategory } from "@/types"
import {
  useItemsByCategoryQuery,
  useToggleItemTaskMutation,
  useDeleteItemMutation,
} from "@/hooks/use-items"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PRIORITY_WEIGHTS } from "@/lib/app-constants"

type SortBy = "dueDate" | "priority" | "title" | "createdAt"
type PriorityFilter = "all" | "none" | "low" | "medium" | "high"

function getTimestamp(value?: Date) {
  return value ? new Date(value).getTime() : 0
}

function sortTasks(tasks: Item[], sortBy: SortBy) {
  tasks.sort((a, b) => {
    if (sortBy === "dueDate") {
      const timeA = a.task?.dueAt ? new Date(a.task.dueAt).getTime() : Infinity
      const timeB = b.task?.dueAt ? new Date(b.task.dueAt).getTime() : Infinity
      return timeA - timeB
    }

    if (sortBy === "priority") {
      const weightA = PRIORITY_WEIGHTS[a.task?.priority || "none"]
      const weightB = PRIORITY_WEIGHTS[b.task?.priority || "none"]
      return weightB - weightA
    }

    if (sortBy === "title") {
      return (a.title || "").localeCompare(b.title || "")
    }

    return getTimestamp(b.createdAt) - getTimestamp(a.createdAt)
  })
}

export default function TasksPage() {
  const { userId } = useAuth()
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [addCategory, setAddCategory] = useState<ItemCategory | null>(null)

  const { data: tasks, isLoading } = useItemsByCategoryQuery(userId, "task")

  const toggleMutation = useToggleItemTaskMutation(userId)
  const deleteMutation = useDeleteItemMutation(userId)

  const [filterTag, setFilterTag] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<PriorityFilter>("all")
  const [sortBy, setSortBy] = useState<SortBy>("createdAt")

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    for (const task of tasks || []) {
      for (const tag of task.tags || []) {
        const normalizedTag = tag.trim().toLowerCase()
        if (normalizedTag) tags.add(normalizedTag)
      }
    }
    return Array.from(tags)
  }, [tasks])

  const { activeTasks, completedTasks } = useMemo(() => {
    const active: Item[] = []
    const completed: Item[] = []
    const normalizedFilterTag = filterTag.toLowerCase()

    for (const task of tasks || []) {
      const matchesTag =
        filterTag === "all" ||
        task.tags?.some((tag) => tag.toLowerCase() === normalizedFilterTag)
      const matchesPriority =
        filterPriority === "all" ||
        (task.task?.priority || "none") === filterPriority

      if (!matchesTag || !matchesPriority) continue

      if (task.task?.isCompleted) {
        completed.push(task)
      } else {
        active.push(task)
      }
    }

    sortTasks(active, sortBy)
    sortTasks(completed, sortBy)

    return { activeTasks: active, completedTasks: completed }
  }, [tasks, filterTag, filterPriority, sortBy])

  if (isLoading) {
    return (
      <div className="ld-page-shell">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-8 w-48" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  const renderTaskList = (list: typeof activeTasks, emptyMessage: string) => {
    if (list.length === 0) {
      return (
        <Empty className="border-border/40 py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CheckSquare />
            </EmptyMedia>
            <EmptyTitle>All clear!</EmptyTitle>
            <EmptyDescription>{emptyMessage}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )
    }

    return (
      <div className="flex flex-col gap-3">
        {list.map((task) => (
          <ItemCard
            key={task.id}
            item={task}
            leading={
              <Checkbox
                checked={!!task.task?.isCompleted}
                onCheckedChange={(checked) =>
                  toggleMutation.mutate({
                    id: task.id,
                    isCompleted: !!checked,
                  })
                }
                className="size-4 cursor-pointer rounded border-primary/30 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
              />
            }
            actions={
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingItem(task)
                    setIsEditOpen(true)
                  }}
                  className="size-7 shrink-0 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    deleteMutation.mutate({ id: task.id, category: "task" })
                  }
                  className="size-7 shrink-0 rounded-md text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </>
            }
          />
        ))}
      </div>
    )
  }

  return (
    <div className="ld-page-shell">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="ld-page-kicker">Action queue</p>
          <h1 className="ld-page-title">Tasks</h1>
          <p className="ld-page-subtitle">
            Manage and track your active or completed tasks.
          </p>
        </div>
        <Button
          onClick={() => setAddCategory("task")}
          className="h-9 gap-1.5 rounded-full px-4 text-xs font-bold shadow-sm"
        >
          <Plus className="size-4" /> Add Task
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <TabsList className="grid w-full max-w-[280px] grid-cols-2">
            <TabsTrigger value="active" className="gap-1.5">
              Active
              <Badge
                variant="secondary"
                className="pointer-events-none px-1 py-0 text-[10px] font-normal"
              >
                {activeTasks.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-1.5">
              Completed
              <Badge
                variant="outline"
                className="pointer-events-none px-1 py-0 text-[10px] font-normal"
              >
                {completedTasks.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Filtering and Sorting Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Priority Filter */}
            <Select
              value={filterPriority}
              onValueChange={(value) =>
                setFilterPriority(value as PriorityFilter)
              }
            >
              <SelectTrigger
                className={cn(
                  "h-8 cursor-pointer gap-1.5 rounded-full border bg-background/50 px-3 text-xs font-medium transition-all duration-200 hover:bg-muted/50",
                  filterPriority !== "all"
                    ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                )}
              >
                <Filter className="size-3 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Priority: All</SelectItem>
                <SelectItem value="none">Priority: None</SelectItem>
                <SelectItem value="low">Priority: Low</SelectItem>
                <SelectItem value="medium">Priority: Medium</SelectItem>
                <SelectItem value="high">Priority: High</SelectItem>
              </SelectContent>
            </Select>

            {/* Tag Filter */}
            {allTags.length > 0 && (
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger
                  className={cn(
                    "h-8 max-w-[150px] cursor-pointer gap-1.5 rounded-full border bg-background/50 px-3 text-xs font-medium transition-all duration-200 hover:bg-muted/50",
                    filterTag !== "all"
                      ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                      : "border-border/60 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Tag className="size-3 shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tag: All</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      #{tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Sort Control */}
            <Select
              value={sortBy}
              onValueChange={(val) => setSortBy(val as SortBy)}
            >
              <SelectTrigger className="h-8 cursor-pointer gap-1.5 rounded-full border border-border/60 bg-background/50 px-3 text-xs font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground">
                <ArrowUpDown className="size-3 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Sort: Created</SelectItem>
                <SelectItem value="dueDate">Sort: Due Date</SelectItem>
                <SelectItem value="priority">Sort: Priority</SelectItem>
                <SelectItem value="title">Sort: Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="active" className="mt-0">
          {renderTaskList(
            activeTasks,
            "No pending tasks matching filters. Dump one using the home input!"
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-0">
          {renderTaskList(
            completedTasks,
            "No completed tasks matching filters. Finish some items!"
          )}
        </TabsContent>
      </Tabs>

      <EditDialog
        item={editingItem}
        isOpen={isEditOpen}
        onClose={() => {
          setEditingItem(null)
          setIsEditOpen(false)
        }}
      />
      <AddItemDialog
        category={addCategory}
        isOpen={addCategory !== null}
        onClose={() => setAddCategory(null)}
      />
    </div>
  )
}
