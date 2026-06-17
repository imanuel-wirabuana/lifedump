"use client";

import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { getDumpById, getAllItems, deleteItem, updateItemTask } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { CheckSquare, DollarSign, FileText, Trash2, Calendar, Pencil, ArrowLeft, Clock, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditDialog } from "@/components/edit-dialog";
import { Item, ItemCategory } from "@/lib/types";
import { toast } from "sonner";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DumpDetailPage({ params }: PageProps) {
  const { id: dumpId } = use(params);
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: dump, isLoading: isLoadingDump } = useQuery({
    queryKey: ["dump", dumpId, userId],
    queryFn: () => getDumpById(userId!, dumpId),
    enabled: !!userId && !!dumpId,
  });

  const { data: items, isLoading: isLoadingItems } = useQuery({
    queryKey: ["items", userId],
    queryFn: () => getAllItems(userId!),
    enabled: !!userId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      updateItemTask(userId!, id, isCompleted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", userId] });
      toast.success("Task status updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, category }: { id: string; category: ItemCategory }) => deleteItem(userId!, id, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", userId] });
      toast.success("Item deleted successfully");
    },
  });

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

  const dumpItems = items?.filter((item) => item.dumpId === dumpId) || [];
  const isLoading = isLoadingDump || isLoadingItems;

  return (
    <div className="flex flex-col p-4 md:p-8 max-w-2xl mx-auto w-full pt-8 gap-6">
      {/* Back Button */}
      <div>
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group">
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
            <EmptyDescription>The dump you are looking for does not exist or has been deleted.</EmptyDescription>
          </EmptyHeader>
          <Button asChild className="mt-4">
            <Link href="/">Return Home</Link>
          </Button>
        </Empty>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Dump Header & Raw Text */}
          <Card className="border-border/60 shadow-sm relative overflow-hidden bg-gradient-to-br from-card to-card/90">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Clock className="size-3.5" />
                <span>
                  {dump.createdAt ? new Date(dump.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }) : "Unknown date"}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase px-1.5 py-0 h-5 font-bold tracking-wider">
                {dump.sourceType}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 pt-2 flex flex-col gap-2">
              <div className="relative pl-4 border-l-2 border-primary/30">
                <p className="text-sm font-medium leading-relaxed italic text-foreground/90 whitespace-pre-wrap">
                  "{dump.rawText || "Empty dump content"}"
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Generated Items */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-md font-bold tracking-tight flex items-center gap-2">
                Extracted Items
                <Badge variant="secondary" className="rounded-full px-2 py-0 text-xs font-semibold">
                  {dumpItems.length}
                </Badge>
              </h2>
            </div>

            {dumpItems.length > 0 ? (
              <div className="flex flex-col gap-3">
                {dumpItems.map((item) => {
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
                              <p className="font-semibold text-sm truncate max-w-[200px] md:max-w-[320px]">{item.title}</p>
                              <Badge variant={config.badgeVariant} className="text-[9px] uppercase px-1 py-0 h-4 font-bold tracking-wider">
                                {item.category}
                              </Badge>
                            </div>
                            {item.content && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 max-w-[200px] md:max-w-[320px]">{item.content}</p>
                            )}
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {item.category === "task" && item.task?.dueAt && (
                                <span className="font-medium text-amber-600 dark:text-amber-500">
                                  Due {new Date(item.task.dueAt).toLocaleString(undefined, {
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
                                    "font-semibold",
                                    item.finance.type === "expense" ? "text-destructive" : "text-emerald-500"
                                  )}
                                >
                                  {item.finance.type === "expense" ? "-" : "+"} Rp {item.finance.amount.toLocaleString()}
                                </span>
                              )}
                              {item.category === "note" && item.note && (
                                <span className="capitalize font-medium text-indigo-600 dark:text-indigo-400">
                                  Type: {item.note.noteType}
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
                    <FileDown />
                  </EmptyMedia>
                  <EmptyTitle>No items found</EmptyTitle>
                  <EmptyDescription>All items generated from this dump have been deleted or none were created.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </div>
      )}

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
