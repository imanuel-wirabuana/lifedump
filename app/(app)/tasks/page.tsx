"use client";

import { useAuth } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckSquare, Trash2, Calendar, AlertCircle, Pencil, Tag, Sparkles, Filter, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditDialog } from "@/components/edit-dialog";
import { Item } from "@/types";
import { useItemsByCategoryQuery, useToggleItemTaskMutation, useDeleteItemMutation } from "@/hooks/use-items";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SortBy = "dueDate" | "priority" | "title" | "createdAt";

export default function TasksPage() {
  const { userId } = useAuth();
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: tasks, isLoading } = useItemsByCategoryQuery(userId, "task");

  const toggleMutation = useToggleItemTaskMutation(userId);
  const deleteMutation = useDeleteItemMutation(userId);

  // Filter and Sorting state
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");

  const allTags = Array.from(
    new Set(
      tasks
        ?.flatMap((t) => t.task?.tags || [])
        .map((t) => t.trim().toLowerCase()) || []
    )
  );

  const processTasks = (list: Item[]) => {
    let result = [...list];

    // Filter by tag
    if (filterTag !== "all") {
      result = result.filter((t) =>
        t.task?.tags?.some((tag) => tag.toLowerCase() === filterTag.toLowerCase())
      );
    }

    // Filter by priority
    if (filterPriority !== "all") {
      result = result.filter((t) => (t.task?.priority || "none") === filterPriority);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "dueDate") {
        const timeA = a.task?.dueAt ? new Date(a.task.dueAt).getTime() : Infinity;
        const timeB = b.task?.dueAt ? new Date(b.task.dueAt).getTime() : Infinity;
        return timeA - timeB;
      }
      if (sortBy === "priority") {
        const priorityWeight = { high: 3, medium: 2, low: 1, none: 0 };
        const weightA = priorityWeight[a.task?.priority || "none"] || 0;
        const weightB = priorityWeight[b.task?.priority || "none"] || 0;
        return weightB - weightA;
      }
      if (sortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }
      // Default: createdAt desc
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return result;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col p-4 md:p-8 max-w-2xl mx-auto w-full pt-8 gap-6">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-8 w-48" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="size-4 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const activeTasks = tasks?.filter((t) => !t.task?.isCompleted) || [];
  const completedTasks = tasks?.filter((t) => !!t.task?.isCompleted) || [];

  const checkIsOverdue = (dueAt?: Date) => {
    if (!dueAt) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dueAt);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const renderTaskList = (list: typeof activeTasks, emptyMessage: string) => {
    if (list.length === 0) {
      return (
        <Empty className="py-12 border-border/40">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CheckSquare />
            </EmptyMedia>
            <EmptyTitle>All clear!</EmptyTitle>
            <EmptyDescription>{emptyMessage}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {list.map((task) => {
          const isOverdue = !task.task?.isCompleted && checkIsOverdue(task.task?.dueAt);

          return (
            <Card
              key={task.id}
              className={cn(
                "border border-border/40 bg-card hover:bg-muted/10 transition-all duration-300 shadow-sm rounded-xl overflow-hidden relative",
                task.task?.priority === "high" && "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-red-500",
                task.task?.priority === "medium" && "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-amber-500",
                task.task?.priority === "low" && "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-blue-500",
                isOverdue && "border-destructive/20 bg-destructive/5/20 before:bg-destructive"
              )}
            >
              <CardContent className="p-4 pl-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <Checkbox
                    checked={!!task.task?.isCompleted}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ id: task.id, isCompleted: !!checked })
                    }
                    className="size-4 mt-0.5 rounded border-amber-500/30 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "font-semibold text-sm truncate max-w-[320px] md:max-w-[400px]",
                        task.task?.isCompleted && "line-through text-muted-foreground font-normal"
                      )}
                    >
                      {task.title}
                    </p>
                    {task.content && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-[320px] md:max-w-[400px]">{task.content}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {task.task?.dueAt && (
                        <span
                          suppressHydrationWarning
                          className={cn(
                            "text-[10px] inline-flex items-center gap-1 font-medium",
                            isOverdue
                              ? "text-destructive font-semibold"
                              : "text-muted-foreground"
                          )}
                        >
                          <Calendar className="size-3 shrink-0" />
                          Due: {new Date(task.task.dueAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      {task.task?.priority && task.task.priority !== "none" && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[8px] uppercase px-1 py-0 h-3.5 font-bold tracking-wider shrink-0",
                            task.task.priority === "high" && "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
                            task.task.priority === "medium" && "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                            task.task.priority === "low" && "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          )}
                        >
                          {task.task.priority}
                        </Badge>
                      )}
                      {isOverdue && (
                        <Badge
                          variant="destructive"
                          className="text-[8px] uppercase px-1 py-0 h-3.5 font-bold tracking-wider shrink-0"
                        >
                          <AlertCircle className="size-2.5 mr-0.5" />
                          Overdue
                        </Badge>
                      )}
                      {task.task?.source === "ai" && (
                        <span className="text-[10px] text-indigo-500 inline-flex items-center gap-0.5 shrink-0 font-medium" title="AI Generated">
                          <Sparkles className="size-2.5" />
                          AI
                        </span>
                      )}
                      {task.task?.tags && task.task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 w-full mt-1.5">
                          {task.task.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-[9px] py-0 px-1.5 border-border bg-muted/40 font-mono text-muted-foreground font-normal shrink-0 rounded hover:bg-muted/80 transition-colors"
                            >
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 mt-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingItem(task);
                      setIsEditOpen(true);
                    }}
                    className="text-muted-foreground hover:text-foreground size-7 shrink-0 rounded-md"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate({ id: task.id, category: "task" })}
                    className="text-muted-foreground hover:text-destructive size-7 shrink-0 rounded-md"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col p-4 md:p-8 max-w-2xl mx-auto w-full pt-8 gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage and track your active or completed tasks.</p>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <TabsList className="grid w-full grid-cols-2 max-w-[280px]">
            <TabsTrigger value="active" className="gap-1.5">
              Active
              <Badge variant="secondary" className="px-1 py-0 text-[10px] font-normal pointer-events-none">
                {activeTasks.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-1.5">
              Completed
              <Badge variant="outline" className="px-1 py-0 text-[10px] font-normal pointer-events-none">
                {completedTasks.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Filtering and Sorting Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Priority Filter */}
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className={cn(
                "h-8 rounded-full bg-background/50 border hover:bg-muted/50 transition-all duration-200 gap-1.5 text-xs font-medium px-3 cursor-pointer",
                filterPriority !== "all" 
                  ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10" 
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              )}>
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
                <SelectTrigger className={cn(
                  "h-8 rounded-full bg-background/50 border hover:bg-muted/50 transition-all duration-200 gap-1.5 text-xs font-medium px-3 cursor-pointer max-w-[150px]",
                  filterTag !== "all" 
                    ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10" 
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                )}>
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
            <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortBy)}>
              <SelectTrigger className="h-8 rounded-full bg-background/50 border border-border/60 hover:bg-muted/50 transition-all duration-200 gap-1.5 text-xs font-medium px-3 text-muted-foreground hover:text-foreground cursor-pointer">
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
          {renderTaskList(processTasks(activeTasks), "No pending tasks matching filters. Dump one using the home input!")}
        </TabsContent>

        <TabsContent value="completed" className="mt-0">
          {renderTaskList(processTasks(completedTasks), "No completed tasks matching filters. Finish some items!")}
        </TabsContent>
      </Tabs>

      <EditDialog
        item={editingItem}
        isOpen={isEditOpen}
        onClose={() => {
          setEditingItem(null);
          setIsEditOpen(false);
        }}
      />
    </div>
  );
}
