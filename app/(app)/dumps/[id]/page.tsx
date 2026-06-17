"use client";

import { use, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { CheckSquare, DollarSign, FileText, Trash2, Calendar, Pencil, ArrowLeft, Clock, FileDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditDialog } from "@/components/edit-dialog";
import { Item, ItemCategory } from "@/types";
import { toast } from "sonner";
import Link from "next/link";
import { useDumpStore } from "@/stores/use-dump-store";
import { useItemsQuery, useToggleItemTaskMutation, useDeleteItemMutation } from "@/hooks/use-items";
import { useDumpByIdQuery } from "@/hooks/use-dumps";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DumpDetailPage({ params }: PageProps) {
  const { id: dumpId } = use(params);
  const { userId } = useAuth();
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { setCurrentInputText, setExtractedItems, setCurrentDumpId, setDumpStatus } = useDumpStore();

  const { data: dump, isLoading: isLoadingDump } = useDumpByIdQuery(userId, dumpId);

  const { data: items, isLoading: isLoadingItems } = useItemsQuery(userId);

  const isNeedsReview = dump?.status === "needs_review";
  const isConfirmed = dump?.status === "confirmed";
  const isFailed = dump?.status === "failed";

  useEffect(() => {
    if (dump && dump.status === "needs_review") {
      setCurrentInputText(dump.rawText || "");
      setExtractedItems(dump.extractedItems || []);
      setCurrentDumpId(dumpId);
      setDumpStatus("needs_review");
    }
  }, [dump, dumpId, setCurrentInputText, setExtractedItems, setCurrentDumpId, setDumpStatus]);

  const displayItems = items?.filter((item) => item.dumpId === dumpId) || [];

  const toggleMutation = useToggleItemTaskMutation(userId);

  const deleteMutation = useDeleteItemMutation(userId);

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
          {/* Review Banner */}
          {isNeedsReview && (
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-indigo-900 dark:text-indigo-200">
              <div className="flex items-start gap-3 text-xs">
                <AlertCircle className="size-5 text-indigo-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Pending Confirmation</p>
                  <p className="text-muted-foreground">These items were extracted by the AI and are pending your review.</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setCurrentInputText(dump.rawText || "");
                  setExtractedItems(dump.extractedItems || []);
                  setCurrentDumpId(dumpId);
                  setDumpStatus("needs_review");
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs shrink-0 font-semibold"
              >
                Open Review Drawer
              </Button>
            </div>
          )}

          {/* Failed Banner */}
          {isFailed && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive-foreground">
              <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">Categorization Failed</p>
                <p className="text-muted-foreground">{dump.error || "An error occurred during background categorization."}</p>
              </div>
            </div>
          )}

          {/* Dump Header & Raw Text */}
          <Card className="border-border/60 shadow-sm relative overflow-hidden bg-gradient-to-br from-card to-card/90">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Clock className="size-3.5" />
                <span suppressHydrationWarning>
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
          {!isNeedsReview && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-md font-bold tracking-tight flex items-center gap-2">
                  Extracted Items
                  <Badge variant="secondary" className="rounded-full px-2 py-0 text-xs font-semibold">
                    {displayItems.length}
                  </Badge>
                </h2>
              </div>

              {displayItems.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {displayItems.map((item) => {
                    const config = categoryConfig[item.category as ItemCategory];
                    const Icon = config.icon;
                    const itemKey = item.id;

                    return (
                      <Card key={itemKey} className="border-border/50 shadow-sm hover:border-border transition-colors">
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
                                  <span className="font-medium text-amber-600 dark:text-amber-500" suppressHydrationWarning>
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
                              onClick={() => {
                                deleteMutation.mutate({ id: item.id, category: item.category });
                              }}
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
          )}
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
