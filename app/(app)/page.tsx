"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { getAllItems, deleteItem, updateItemTask } from "@/lib/queries";
import { UniversalInput } from "@/components/universal-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { CheckSquare, DollarSign, FileText, Trash2, Calendar, TrendingUp, NotebookTabs, Pencil, AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditDialog } from "@/components/edit-dialog";
import { Item, ItemCategory } from "@/lib/types";
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import Link from "next/link";

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
  const [pendingDumps, setPendingDumps] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "users", userId, "dumps"),
      where("status", "in", ["needs_review", "failed"]),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dumps = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setPendingDumps(dumps);
    });

    return () => unsubscribe();
  }, [userId]);

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

      {/* Pending Reviews Section */}
      {pendingDumps.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pending Reviews</h2>
          <div className="flex flex-col gap-3">
            {pendingDumps.map((dump) => (
              <Card
                key={dump.id}
                className={cn(
                  "border shadow-sm overflow-hidden",
                  dump.status === "failed" 
                    ? "border-destructive/30 bg-destructive/5" 
                    : "border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/10"
                )}
              >
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex gap-3 min-w-0">
                    <div
                      className={cn(
                        "size-8 rounded-lg shrink-0 flex items-center justify-center border",
                        dump.status === "failed"
                          ? "text-destructive bg-destructive/10 border-destructive/20"
                          : "text-indigo-500 bg-indigo-500/10 border-indigo-500/20"
                      )}
                    >
                      {dump.status === "failed" ? (
                        <AlertTriangle className="size-4" />
                      ) : (
                        <Sparkles className="size-4 animate-pulse" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">
                        {dump.status === "failed" ? "Categorization Failed" : "Dump Ready for Review"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 italic">
                        "{dump.rawText}"
                      </p>
                      {dump.status === "failed" && dump.error && (
                        <p className="text-[11px] text-destructive mt-1 font-medium line-clamp-1">
                          Error: {dump.error}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={async () => {
                        try {
                          await deleteDoc(doc(db, "users", userId!, "dumps", dump.id));
                          toast.success("Dump deleted successfully");
                        } catch (err) {
                          toast.error("Failed to delete dump");
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                    <Button asChild size="sm" className="h-8 gap-1 shadow-sm shrink-0">
                      <Link href={`/review/${dump.id}`}>
                        <span>Review</span>
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

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
