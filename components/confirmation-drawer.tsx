"use client";

import { useDumpStore } from "@/stores/use-dump-store";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { saveDumpAndItems, confirmDumpAndItems } from "@/services/firestore";
import { mapApiItemsToPendingItems } from "@/services/mappers";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckSquare, DollarSign, FileText, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ConfirmationDrawer() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const { dumpStatus, extractedItems, currentInputText, currentDumpId, setDumpStatus, clearState, setExtractedItems } = useDumpStore();
  const [isSaving, setIsSaving] = useState(false);
  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [isRevising, setIsRevising] = useState(false);

  const isOpen = dumpStatus === "needs_review";

  const categoryIcon = {
    task: CheckSquare,
    finance: DollarSign,
    note: FileText,
  } as const;

  const handleConfirm = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      if (currentDumpId) {
        await confirmDumpAndItems(userId, currentDumpId, extractedItems);
      } else {
        await saveDumpAndItems(
          userId,
          "text",
          currentInputText,
          "confirmed",
          extractedItems
        );
      }
      // Invalidate all item queries so lists refresh immediately
      queryClient.invalidateQueries({ queryKey: ["items", userId] });
      queryClient.invalidateQueries({ queryKey: ["dumps", userId] });
      toast.success("Items saved successfully!");
      clearState();
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = (index: number) => {
    const newItems = [...extractedItems];
    newItems.splice(index, 1);
    setExtractedItems(newItems);
    if (newItems.length === 0) {
      setDumpStatus("idle");
    }
  };

  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionPrompt.trim() || isRevising) return;
    if (!currentDumpId) {
      toast.error("No active background dump to refine.");
      return;
    }

    setIsRevising(true);

    try {
      // Flatten extractedItems to match the API's z.array schema
      const flatItems = extractedItems.map(item => ({
        category: item.category,
        title: item.title,
        content: item.content || "",
        dueAt: item.task?.dueAt ? new Date(item.task.dueAt).toISOString() : null,
        financeType: item.finance?.type || null,
        amount: item.finance?.amount || null,
        currency: "IDR",
        occurredAt: item.finance?.occurredAt ? new Date(item.finance.occurredAt).toISOString() : null,
        confidence: item.aiConfidence || 1,
        needsClarification: item.needsClarification || false,
      }));

      const response = await fetch("/api/trigger-refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dumpId: currentDumpId,
          feedback: revisionPrompt,
          currentItems: flatItems,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start refinement job");
      }

      setRevisionPrompt("");
      setDumpStatus("processing"); // close the drawer globally and trigger loading toast
      toast.success("Refining items in the background...");
    } catch (error) {
      console.error("Refinement Error:", error);
      toast.error("Failed to start refinement. Please try again.");
    } finally {
      setIsRevising(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && setDumpStatus("idle")}>
      <DrawerContent className="max-h-[85vh] mx-auto max-w-2xl w-full">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-lg font-bold">Review Items</DrawerTitle>
          <DrawerDescription className="text-xs">Please confirm the categorized items before saving.</DrawerDescription>
        </DrawerHeader>

        {/* Scrollable items list */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 flex flex-col gap-3">
          {extractedItems.map((item, index) => {
            const Icon = categoryIcon[item.category as keyof typeof categoryIcon];
            return (
              <div
                key={index}
                className="flex gap-3 items-start p-3 rounded-lg border bg-card text-card-foreground shadow-xs relative group/card transition-colors hover:bg-muted/30"
              >
                {/* Category Icon Badge */}
                <div
                  className={cn(
                    "p-2 rounded-md shrink-0 flex items-center justify-center",
                    item.category === "task" && "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20",
                    item.category === "finance" && "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20",
                    item.category === "note" && "bg-amber-500/10 text-amber-500 dark:bg-amber-500/20"
                  )}
                >
                  {Icon && <Icon className="size-4" />}
                </div>

                {/* Item Content */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm truncate">{item.title}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0 capitalize font-medium shrink-0",
                        item.category === "task" && "border-blue-500/20 text-blue-600 dark:text-blue-400 bg-blue-500/5",
                        item.category === "finance" && "border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5",
                        item.category === "note" && "border-amber-500/20 text-amber-600 dark:text-amber-400 bg-amber-500/5"
                      )}
                    >
                      {item.category}
                    </Badge>
                  </div>

                  {item.category === "task" && item.task?.dueAt && (
                    <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                      Due: {new Date(item.task.dueAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}

                  {item.category === "finance" && item.finance && (
                    <p className="text-xs font-semibold">
                      <span className={item.finance.type === "expense" ? "text-rose-500" : "text-emerald-500"}>
                        {item.finance.type === "expense" ? "-" : "+"} {item.finance.currency} {item.finance.amount?.toLocaleString()}
                      </span>
                    </p>
                  )}

                  {item.content && (
                    <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-wrap border-l-2 pl-2 border-muted line-clamp-3">
                      {item.content}
                    </p>
                  )}
                </div>

                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(index)}
                  className="absolute right-2 top-2 size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            );
          })}
        </div>

        {/* AI Refinement Prompt */}
        <form onSubmit={handleRefine} className="px-4 pb-2 border-t pt-3">
          <InputGroup className="h-9">
            <InputGroupAddon align="inline-start">
              <Sparkles className={cn("size-3.5 text-indigo-500", isRevising && "animate-pulse")} />
            </InputGroupAddon>
            <InputGroupInput
              placeholder={isRevising ? "Re-processing items..." : "Revision instructions... (e.g. Change task 1 to note)"}
              value={revisionPrompt}
              onChange={(e) => setRevisionPrompt(e.target.value)}
              disabled={isRevising || isSaving}
              className="text-xs"
            />
            <InputGroupAddon align="inline-end" className="p-0">
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                disabled={isRevising || isSaving || !revisionPrompt.trim()}
                className="h-7 px-2 text-[10px] text-indigo-500 hover:text-indigo-600"
              >
                Refine
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </form>

        <DrawerFooter className="flex flex-row gap-2 pt-2 pb-6 px-4">
          <Button
            variant="outline"
            onClick={() => setDumpStatus("idle")}
            disabled={isSaving || isRevising}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSaving || isRevising || extractedItems.length === 0}
            className="flex-1 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold shadow-xs"
          >
            {isSaving && <Spinner data-icon="inline-start" />}
            {isSaving ? "Saving..." : "Confirm All"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
