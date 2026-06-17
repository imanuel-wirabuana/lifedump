"use client";

import { useDumpStore } from "@/store/use-dump-store";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { saveDumpAndItems } from "@/lib/firestore";
import { mapApiItemsToPendingItems } from "@/lib/mappers";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckSquare, DollarSign, FileText, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ConfirmationDrawer() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const { dumpStatus, extractedItems, currentInputText, setDumpStatus, clearState, setExtractedItems } = useDumpStore();
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
      await saveDumpAndItems(
        userId,
        "text",
        currentInputText,
        "confirmed",
        extractedItems
      );
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

      const response = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: currentInputText,
          currentItems: flatItems,
          feedback: revisionPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to refine items");
      }

      const data = await response.json();
      const updatedItems = mapApiItemsToPendingItems(data.items);
      setExtractedItems(updatedItems);
      setRevisionPrompt("");
      toast.success("Refined successfully!");
    } catch (error) {
      console.error("Refinement Error:", error);
      toast.error("Failed to refine. Please try again.");
    } finally {
      setIsRevising(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && setDumpStatus("idle")}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Review Items</DrawerTitle>
          <DrawerDescription>Please confirm the categorized items before saving.</DrawerDescription>
        </DrawerHeader>

        <div className="p-4 overflow-y-auto flex flex-col gap-4">
          {extractedItems.map((item, index) => {
            const Icon = categoryIcon[item.category as keyof typeof categoryIcon];
            return (
              <Card key={index}>
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="size-4" />}
                    <Badge variant="secondary">{item.category}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex flex-col gap-1">
                  <CardTitle className="text-base">{item.title}</CardTitle>

                  {item.category === "task" && item.task?.dueAt && (
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(item.task.dueAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}

                  {item.category === "finance" && item.finance && (
                    <p className="text-sm text-muted-foreground">
                      {item.finance.type === "expense" ? "-" : "+"} {item.finance.currency} {item.finance.amount?.toLocaleString()}
                    </p>
                  )}

                  {item.content && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1 border-l-2 pl-2 border-muted">{item.content}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* AI Refinement Prompt */}
        <form onSubmit={handleRefine} className="px-4 pb-2 border-t pt-4">
          <InputGroup className="h-9">
            <InputGroupAddon align="inline-start">
              <Sparkles className={cn("size-3.5 text-indigo-500", isRevising && "animate-pulse")} />
            </InputGroupAddon>
            <InputGroupInput
              placeholder={isRevising ? "Re-processing items..." : "Revision instructions... (e.g. Change task 1 to general note)"}
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

        <DrawerFooter>
          <Button onClick={handleConfirm} disabled={isSaving || isRevising || extractedItems.length === 0}>
            {isSaving && <Spinner data-icon="inline-start" />}
            {isSaving ? "Saving..." : "Confirm All"}
          </Button>
          <Button variant="outline" onClick={() => setDumpStatus("idle")} disabled={isSaving || isRevising}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
