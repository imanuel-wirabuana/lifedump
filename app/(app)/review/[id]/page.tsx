"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { doc, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { confirmDumpAndItems } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  CheckSquare, 
  DollarSign, 
  FileText, 
  Trash2, 
  Sparkles, 
  Plus, 
  ArrowLeft, 
  Check, 
  AlertTriangle,
  RotateCcw,
  Heading
} from "lucide-react";

type ItemCategory = "task" | "finance" | "note";

interface PendingItem {
  category: ItemCategory;
  title: string;
  content: string;
  task?: {
    isCompleted: boolean;
    dueAt?: Date | string;
  };
  finance?: {
    type: "expense" | "income";
    amount: number;
    currency: string;
    occurredAt?: Date | string;
  };
  note?: {
    noteType: "journal" | "general";
  };
  aiConfidence?: number;
  needsClarification?: boolean;
}

function toLocalISOString(dateInput: any): string {
  if (!dateInput) return "";
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "";
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  } catch {
    return "";
  }
}

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: dumpId } = use(params);
  const router = useRouter();
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const [dump, setDump] = useState<any>(null);
  const [items, setItems] = useState<PendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [failedRawText, setFailedRawText] = useState("");

  const categoryIcon = {
    task: CheckSquare,
    finance: DollarSign,
    note: FileText,
  } as const;

  useEffect(() => {
    if (!userId || !dumpId) return;

    const dumpRef = doc(db, "users", userId, "dumps", dumpId);
    
    const unsubscribe = onSnapshot(
      dumpRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          toast.error("Dump not found.");
          router.push("/");
          return;
        }

        const data = docSnap.data();
        setDump(data);
        setIsLoading(false);
        setFailedRawText(data.rawText || "");

        // Only sync items if we are in "needs_review" status and not actively typing in refinement
        if (data.status === "needs_review" && !isRevising) {
          setItems(data.extractedItems || []);
        }

        // Auto-redirect to home on confirmed status
        if (data.status === "confirmed") {
          toast.success("Dump confirmed and items saved!");
          queryClient.invalidateQueries({ queryKey: ["items", userId] });
          router.push("/");
        }
      },
      (error) => {
        console.error("Firestore listener error:", error);
        toast.error("Error loading dump.");
        router.push("/");
      }
    );

    return () => unsubscribe();
  }, [userId, dumpId, router, queryClient, isRevising]);

  const handleUpdateItem = (index: number, updates: Partial<PendingItem>) => {
    const updated = [...items];
    updated[index] = { ...updated[index], ...updates };
    setItems(updated);
  };

  const handleUpdateNested = (
    index: number,
    field: "task" | "finance" | "note",
    nestedUpdates: any
  ) => {
    const updated = [...items];
    const currentNested = updated[index][field] || {};
    updated[index] = {
      ...updated[index],
      [field]: { ...currentNested, ...nestedUpdates },
    };
    setItems(updated);
  };

  const handleCategoryChange = (index: number, newCategory: ItemCategory) => {
    const updated = [...items];
    const prevItem = updated[index];
    
    // Setup default structures for the new category
    const newItem: PendingItem = {
      category: newCategory,
      title: prevItem.title,
      content: prevItem.content,
      aiConfidence: prevItem.aiConfidence,
    };

    if (newCategory === "task") {
      newItem.task = {
        isCompleted: false,
        dueAt: undefined,
      };
    } else if (newCategory === "finance") {
      newItem.finance = {
        type: "expense",
        amount: 0,
        currency: "IDR",
        occurredAt: new Date().toISOString(),
      };
    } else if (newCategory === "note") {
      newItem.note = {
        noteType: "general",
      };
    }

    updated[index] = newItem;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const handleAddItem = () => {
    const newItem: PendingItem = {
      category: "task",
      title: "New Item",
      content: "",
      task: {
        isCompleted: false,
      },
    };
    setItems([...items, newItem]);
  };

  const handleConfirmAll = async () => {
    if (!userId || !dumpId) return;

    setIsSaving(true);
    try {
      // Validate items
      for (const item of items) {
        if (!item.title.trim()) {
          toast.error("All items must have a title.");
          setIsSaving(false);
          return;
        }
      }

      await confirmDumpAndItems(userId, dumpId, items);
      // redirect is handled by onSnapshot detecting 'confirmed' status
    } catch (error) {
      console.error("Confirm error:", error);
      toast.error("Failed to save items. Please try again.");
      setIsSaving(false);
    }
  };

  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !dumpId || !revisionPrompt.trim() || isRevising) return;

    setIsRevising(true);
    try {
      const response = await fetch(`/api/dumps/${dumpId}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentItems: items,
          feedback: revisionPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error("Refinement failed.");
      }

      setRevisionPrompt("");
      toast.success("AI is refining items...");
    } catch (error) {
      console.error(error);
      toast.error("Failed to refine. Please try again.");
    } finally {
      setIsRevising(false);
    }
  };

  const handleRetryAI = async () => {
    if (!userId || !dumpId || isRevising) return;

    setIsRevising(true);
    try {
      // Update the raw text in Firestore in case the user edited it
      const dumpRef = doc(db, "users", userId, "dumps", dumpId);
      await updateDoc(dumpRef, {
        rawText: failedRawText,
      });

      const response = await fetch(`/api/dumps/${dumpId}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentItems: [],
          feedback: "Extract items from raw text again.",
        }),
      });

      if (!response.ok) {
        throw new Error("Retry request failed");
      }

      toast.success("AI categorization restarted.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to retry. Please try again.");
    } finally {
      setIsRevising(false);
    }
  };

  const handleDeleteDump = async () => {
    if (!userId || !dumpId) return;

    if (confirm("Are you sure you want to delete this dump?")) {
      try {
        await deleteDoc(doc(db, "users", userId, "dumps", dumpId));
        toast.success("Dump deleted successfully");
        router.push("/");
      } catch (err) {
        toast.error("Failed to delete dump");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto w-full pt-12 flex flex-col gap-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  // 1. Loading / Processing UI
  if (dump.status === "processing" || dump.status === "queued") {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto w-full pt-16 flex flex-col items-center justify-center gap-6 min-h-[60vh]">
        <div className="relative flex items-center justify-center">
          <div className="size-16 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
          <Sparkles className="absolute size-6 text-indigo-500 animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold tracking-tight">AI is organizing your dump</h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            This will take a few seconds. You can navigate away, we will notify you when it's done.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/")} className="mt-4">
          <ArrowLeft className="size-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // 2. Failed State UI
  if (dump.status === "failed") {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto w-full pt-8 flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="size-8">
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-xl font-bold">Review Dump</h1>
        </div>

        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-destructive">Categorization Failed</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {dump.error || "An unknown error occurred during AI processing."}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Original Input</label>
          <Textarea
            value={failedRawText}
            onChange={(e) => setFailedRawText(e.target.value)}
            className="min-h-[150px] resize-none text-base p-4 rounded-xl border"
            placeholder="Edit original text here..."
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button onClick={handleRetryAI} disabled={isRevising || !failedRawText.trim()} className="flex-1 gap-2">
            <RotateCcw className={cn("size-4", isRevising && "animate-spin")} />
            <span>Retry AI Processing</span>
          </Button>
          <Button variant="secondary" onClick={() => handleCategoryChange(0, "task")} className="flex-1">
            Categorize Manually
          </Button>
          <Button variant="destructive" onClick={handleDeleteDump} className="flex-1 shrink-0">
            Delete Dump
          </Button>
        </div>
      </div>
    );
  }

  // 3. Needs Review State UI
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto w-full pt-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="size-8">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">Review & Save</h1>
            <p className="text-xs text-muted-foreground truncate">Refine details before adding them to your log</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleDeleteDump} className="text-destructive hover:text-destructive">
          <Trash2 className="size-4 mr-1.5" />
          Discard
        </Button>
      </div>

      {/* Raw input context */}
      <div className="p-4 rounded-xl border bg-muted/30 text-sm italic border-dashed">
        <span className="text-xs font-semibold uppercase text-muted-foreground not-italic block mb-1">
          Original Input:
        </span>
        "{dump.rawText}"
      </div>

      {/* Items list */}
      <div className="flex flex-col gap-4">
        {items.map((item, index) => {
          const Icon = categoryIcon[item.category];
          return (
            <Card key={index} className="border-border/60 shadow-sm relative overflow-hidden group">
              {/* Category selector top banner */}
              <CardHeader className="p-4 pb-2 border-b bg-muted/20 flex flex-row items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="size-4 text-indigo-500" />}
                  <ToggleGroup
                    type="single"
                    value={item.category}
                    onValueChange={(val) => {
                      if (val) handleCategoryChange(index, val as ItemCategory);
                    }}
                    className="bg-muted p-[2px] rounded-md text-[11px]"
                  >
                    <ToggleGroupItem value="task" className="px-2 py-0.5 text-xs h-6">
                      Task
                    </ToggleGroupItem>
                    <ToggleGroupItem value="finance" className="px-2 py-0.5 text-xs h-6">
                      Finance
                    </ToggleGroupItem>
                    <ToggleGroupItem value="note" className="px-2 py-0.5 text-xs h-6">
                      Note
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="flex items-center gap-2">
                  {item.aiConfidence !== undefined && (
                    <Badge variant="outline" className="text-[10px] h-5 py-0">
                      AI: {Math.round(item.aiConfidence * 100)}%
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(index)}
                    className="size-7 text-muted-foreground hover:text-destructive rounded-md"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 flex flex-col gap-3">
                {/* Title */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Title</label>
                  <Input
                    value={item.title}
                    onChange={(e) => handleUpdateItem(index, { title: e.target.value })}
                    placeholder="Enter item title..."
                    required
                    className="h-9 font-medium"
                  />
                </div>

                {/* Description / Content */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Description</label>
                  <Textarea
                    value={item.content}
                    onChange={(e) => handleUpdateItem(index, { content: e.target.value })}
                    placeholder="Enter details..."
                    className="min-h-[60px] resize-none text-sm p-2"
                  />
                </div>

                {/* Category specific fields */}
                {item.category === "task" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Due Date & Time</label>
                      <Input
                        type="datetime-local"
                        value={toLocalISOString(item.task?.dueAt)}
                        onChange={(e) =>
                          handleUpdateNested(index, "task", { dueAt: e.target.value || null })
                        }
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                )}

                {item.category === "finance" && item.finance && (
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Amount (Rp)</label>
                      <Input
                        type="number"
                        value={item.finance.amount || ""}
                        onChange={(e) =>
                          handleUpdateNested(index, "finance", { amount: Number(e.target.value) || 0 })
                        }
                        placeholder="Amount"
                        className="h-9"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Type</label>
                      <ToggleGroup
                        type="single"
                        value={item.finance.type}
                        onValueChange={(val) => {
                          if (val) handleUpdateNested(index, "finance", { type: val as "expense" | "income" });
                        }}
                        className="bg-muted p-[3px] rounded-lg h-9 w-full"
                      >
                        <ToggleGroupItem value="expense" className="flex-1 text-center py-1 text-xs">
                          Expense
                        </ToggleGroupItem>
                        <ToggleGroupItem value="income" className="flex-1 text-center py-1 text-xs">
                          Income
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </div>
                )}

                {item.category === "note" && item.note && (
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Note Type</label>
                      <ToggleGroup
                        type="single"
                        value={item.note.noteType}
                        onValueChange={(val) => {
                          if (val) handleUpdateNested(index, "note", { noteType: val as "general" | "journal" });
                        }}
                        className="bg-muted p-[3px] rounded-lg h-9 w-full max-w-[200px]"
                      >
                        <ToggleGroupItem value="general" className="flex-1 text-center py-1 text-xs">
                          General
                        </ToggleGroupItem>
                        <ToggleGroupItem value="journal" className="flex-1 text-center py-1 text-xs">
                          Journal
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add manually / actions */}
      <div className="flex justify-center mt-2">
        <Button variant="outline" onClick={handleAddItem} size="sm" className="gap-1.5 border-dashed">
          <Plus className="size-3.5" />
          <span>Add Custom Item</span>
        </Button>
      </div>

      {/* AI Refinement Box */}
      <form onSubmit={handleRefine} className="border-t pt-6 mt-2 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-indigo-500" />
            <span>Refine with AI</span>
          </label>
          <InputGroup className="h-10">
            <InputGroupInput
              placeholder={isRevising ? "Re-processing items..." : "Revision instructions... (e.g. Change expense amount to Rp75000)"}
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
                className="h-8 px-3 text-[11px] text-indigo-500 hover:text-indigo-600 font-semibold"
              >
                {isRevising ? <Spinner className="size-3" /> : "Refine"}
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </form>

      {/* Confirm Drawer Action Footer */}
      <div className="border-t pt-6 flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={() => router.push("/")} className="flex-1" disabled={isSaving || isRevising}>
          Cancel
        </Button>
        <Button onClick={handleConfirmAll} disabled={isSaving || isRevising || items.length === 0} className="flex-1 gap-2">
          {isSaving ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <Check className="size-4" />
          )}
          <span>{isSaving ? "Saving..." : "Confirm All Items"}</span>
        </Button>
      </div>
    </div>
  );
}
