"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDumpStore } from "@/stores/use-dump-store";
import { UniversalInput } from "@/components/universal-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useRef, useEffect } from "react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { CheckSquare, DollarSign, FileText, Trash2, Calendar, TrendingUp, NotebookTabs, Pencil, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditDialog } from "@/components/edit-dialog";
import { Item, ItemCategory } from "@/types";
import { useItemsQuery, useUpdateItemMutation, useDeleteItemMutation } from "@/hooks/use-items";
import { useDumpsQuery, useDeleteDumpMutation } from "@/hooks/use-dumps";

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
  const router = useRouter();
  const { setCurrentInputText, setExtractedItems, setCurrentDumpId, setDumpStatus } = useDumpStore();
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);

  const { data: items, isLoading } = useItemsQuery(userId);

  const { data: dumps, isLoading: isLoadingDumps } = useDumpsQuery(userId);

  const deleteDumpMutation = useDeleteDumpMutation(userId);

  const toggleMutation = useUpdateItemMutation(userId);
  const deleteMutation = useDeleteItemMutation(userId);

  const confirmedDumps = dumps?.filter((dump) => dump.status === "confirmed") || [];
  const recentDumps = confirmedDumps.slice(0, visibleCount);
  const hasNextPage = confirmedDumps.length > visibleCount;

  // Infinite Scroll Intersection Observer
  const observerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 5);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage]);

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

        {isLoading || isLoadingDumps ? (
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
        ) : confirmedDumps.length > 0 ? (
          <div className="flex flex-col gap-3">
            {recentDumps.map((dump) => {
              const dumpItems = items?.filter((item) => item.dumpId === dump.id) || [];

              return (
                <div
                  key={dump.id}
                  onClick={() => {
                    router.push(`/dumps/${dump.id}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/dumps/${dump.id}`);
                    }
                  }}
                  tabIndex={0}
                  className="block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
                >
                  <Card className="border-border/50 shadow-sm hover:border-border transition-all duration-200 hover:-translate-y-[2px] group hover:shadow-md">
                    <CardContent className="p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-4">
                        <p className="font-medium text-sm text-foreground/90 line-clamp-2 flex-1 italic pl-3 border-l-2 border-primary/20">
                          "{dump.rawText || "Empty dump"}"
                        </p>
                        <div className="flex gap-1.5 shrink-0 items-center">
                          <Badge variant="outline" className="text-[10px] shrink-0 font-medium capitalize h-5 px-1.5">
                            {dump.sourceType}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deleteDumpMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Are you sure you want to delete this dump?")) {
                                deleteDumpMutation.mutate(dump.id);
                              }
                            }}
                            className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md shrink-0"
                            title="Delete Dump"
                          >
                            {deleteDumpMutation.isPending && deleteDumpMutation.variables === dump.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/40">
                        <span className="text-[11px] text-muted-foreground" suppressHydrationWarning>
                          {formatRelativeTime(dump.createdAt)}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {dumpItems.length > 0 ? (
                            dumpItems.map((item) => {
                              const config = categoryConfig[item.category];
                              const Icon = config.icon;
                              return (
                                <div
                                  key={item.id}
                                  title={`${item.category}: ${item.title}`}
                                  className={cn(
                                    "size-5 rounded-md flex items-center justify-center border text-[10px]",
                                    config.colorClass
                                  )}
                                >
                                  <Icon className="size-3" />
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">No items</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}

            {/* Infinite Scroll Sentinel & Loader */}
            <div ref={observerRef} className="py-4 w-full flex items-center justify-center">
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
                <span className="text-xs text-muted-foreground/40 font-medium">All dumps loaded</span>
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
              <EmptyDescription>Use the input above to dump tasks, expenses, or notes, and they will appear here.</EmptyDescription>
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
