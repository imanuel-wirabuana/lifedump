"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { getAllItems, deleteItem, updateItemTask } from "@/lib/queries";
import { UniversalInput } from "@/components/universal-input";
import { ConfirmationDrawer } from "@/components/confirmation-drawer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { CheckSquare, DollarSign, FileText, Trash2, Calendar, TrendingUp, NotebookTabs, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditDialog } from "@/components/edit-dialog";
import { Item, ItemCategory } from "@/lib/types";

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

export default function Home() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["items", userId],
    queryFn: () => getAllItems(userId!),
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
    mutationFn: ({ id, category }: { id: string; category: ItemCategory }) => deleteItem(userId!, id, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", userId] });
    },
  });

  // Derived Stats
  const activeTasksCount = items?.filter((i) => i.category === "task" && !i.task?.isCompleted).length || 0;
  const notesCount = items?.filter((i) => i.category === "note").length || 0;
  
  const financeRecords = items?.filter((i) => i.category === "finance") || [];
  const totalExpense = financeRecords.filter((r) => r.finance?.type === "expense").reduce((acc, r) => acc + (r.finance?.amount || 0), 0);
  const totalIncome = financeRecords.filter((r) => r.finance?.type === "income").reduce((acc, r) => acc + (r.finance?.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  const categoryConfig = {
    task: {
      icon: CheckSquare,
      colorClass: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      badgeVariant: "outline" as const,
    },
    finance: {
      icon: DollarSign,
      colorClass: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      badgeVariant: "secondary" as const,
    },
    note: {
      icon: FileText,
      colorClass: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
      badgeVariant: "default" as const,
    },
  };

  const recentItems = items?.slice(0, 4) || [];

  return (
    <div className="flex flex-col p-4 md:p-8 max-w-2xl mx-auto w-full pt-8 gap-8">
      {/* Welcome / Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Your Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Capture everything, declutter your mind, and view your daily statistics.</p>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/60 shadow-sm relative overflow-hidden group">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
            <CardDescription className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tasks</CardDescription>
            <CheckSquare className="size-3.5 text-amber-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {isLoading ? (
              <Skeleton className="h-6 w-10 mt-1" />
            ) : (
              <div className="flex flex-col">
                <span className="text-lg md:text-xl font-bold tracking-tight">{activeTasksCount}</span>
                <span className="text-[10px] text-muted-foreground">pending</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm relative overflow-hidden group">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
            <CardDescription className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</CardDescription>
            <NotebookTabs className="size-3.5 text-indigo-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {isLoading ? (
              <Skeleton className="h-6 w-10 mt-1" />
            ) : (
              <div className="flex flex-col">
                <span className="text-lg md:text-xl font-bold tracking-tight">{notesCount}</span>
                <span className="text-[10px] text-muted-foreground">saved entries</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm relative overflow-hidden group">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
            <CardDescription className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cashflow</CardDescription>
            <TrendingUp className="size-3.5 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {isLoading ? (
              <Skeleton className="h-6 w-12 mt-1" />
            ) : (
              <div className="flex flex-col">
                <span
                  className={cn(
                    "text-xs md:text-[13px] font-bold truncate tracking-tight",
                    netBalance >= 0 ? "text-emerald-500" : "text-destructive"
                  )}
                >
                  {netBalance >= 0 ? "+" : ""}Rp {netBalance.toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground">net monthly</span>
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
        ) : recentItems.length > 0 ? (
          <div className="flex flex-col gap-3">
            {recentItems.map((item) => {
              const config = categoryConfig[item.category];
              const Icon = config.icon;

              return (
                <Card key={item.id} className="border-border/50 shadow-sm hover:border-border transition-colors">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("size-8 shrink-0 flex items-center justify-center rounded-lg border", config.colorClass)}>
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm truncate max-w-[240px] md:max-w-[320px]">{item.title}</p>
                          <Badge variant={config.badgeVariant} className="text-[9px] uppercase px-1 py-0 h-4 font-bold tracking-wider">
                            {item.category}
                          </Badge>
                        </div>
                        {item.content && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-[240px] md:max-w-[320px]">{item.content}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatRelativeTime(item.createdAt)}
                          {item.category === "task" && item.task?.dueAt && (
                            <span className="ml-2 font-medium text-amber-600 dark:text-amber-500">
                              • Due {new Date(item.task.dueAt).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                          {item.category === "finance" && item.finance && (
                            <span
                              className={cn(
                                "ml-2 font-semibold",
                                item.finance.type === "expense" ? "text-destructive" : "text-emerald-500"
                              )}
                            >
                              • {item.finance.type === "expense" ? "-" : "+"} Rp {item.finance.amount.toLocaleString()}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.category === "task" && (
                        <Checkbox
                          checked={!!item.task?.isCompleted}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ id: item.id, isCompleted: !!checked })
                          }
                          className="size-4 rounded border-amber-500/30 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingItem(item);
                          setIsEditOpen(true);
                        }}
                        className="text-muted-foreground hover:text-foreground size-7 rounded-md"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate({ id: item.id, category: item.category })}
                        className="text-muted-foreground hover:text-destructive size-7 rounded-md"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Empty className="border-border/40 py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Calendar />
              </EmptyMedia>
              <EmptyTitle>Your dashboard is empty</EmptyTitle>
              <EmptyDescription>Use the input above to dump tasks, expenses, or notes, and they will appear here categorized.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>

      <ConfirmationDrawer />
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
