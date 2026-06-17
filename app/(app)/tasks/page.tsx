"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { getItemsByCategory, updateItemTask, deleteItem } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckSquare, Trash2, Calendar, AlertCircle, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditDialog } from "@/components/edit-dialog";
import { Item } from "@/lib/types";

export default function TasksPage() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["items", userId, "task"],
    queryFn: () => getItemsByCategory(userId!, "task"),
    enabled: !!userId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      updateItemTask(userId!, id, isCompleted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", userId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteItem(userId!, id, "task"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", userId] });
    },
  });

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
                "border-border/50 shadow-sm transition-colors",
                isOverdue && "border-destructive/30 bg-destructive/5"
              )}
            >
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Checkbox
                    checked={!!task.task?.isCompleted}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ id: task.id, isCompleted: !!checked })
                    }
                    className="size-4 rounded border-amber-500/30 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
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
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
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
                          <Calendar className="size-3" />
                          Due: {new Date(task.task.dueAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      {isOverdue && (
                        <Badge
                          variant="destructive"
                          className="text-[8px] uppercase px-1 py-0 h-3.5 font-bold tracking-wider"
                        >
                          <AlertCircle className="size-2.5 mr-0.5" />
                          Overdue
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
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
                    onClick={() => deleteMutation.mutate(task.id)}
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
        <TabsList className="grid w-full grid-cols-2 max-w-[280px] mb-4">
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

        <TabsContent value="active" className="mt-0">
          {renderTaskList(activeTasks, "No pending tasks. Dump one using the home input!")}
        </TabsContent>

        <TabsContent value="completed" className="mt-0">
          {renderTaskList(completedTasks, "No completed tasks yet. Finish some items!")}
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
