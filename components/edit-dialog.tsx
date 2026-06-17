"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { Item } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUpdateItemMutation } from "@/hooks/use-items";

interface EditDialogProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditDialog({ item, isOpen, onClose }: EditDialogProps) {
  const { userId } = useAuth();
  const updateMutation = useUpdateItemMutation(userId);

  // Common fields
  const [title, setTitle] = React.useState("");

  // Task fields
  const [dueAt, setDueAt] = React.useState("");
  const [priority, setPriority] = React.useState<"none" | "low" | "medium" | "high">("none");
  const [tags, setTags] = React.useState("");
  const [source, setSource] = React.useState<"manual" | "ai">("manual");

  // Finance fields
  const [amount, setAmount] = React.useState<number>(0);
  const [financeType, setFinanceType] = React.useState<"expense" | "income">("expense");

  // Note fields
  const [noteType, setNoteType] = React.useState<"general" | "journal">("general");
  const [content, setContent] = React.useState("");

  const formatDateForInput = (date: Date | any) => {
    if (!date) return "";
    try {
      const dateObj = new Date(date);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
      const dd = String(dateObj.getDate()).padStart(2, "0");
      const hh = String(dateObj.getHours()).padStart(2, "0");
      const min = String(dateObj.getMinutes()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    } catch {
      return "";
    }
  };

  // Sync state with selected item when opened
  React.useEffect(() => {
    if (!item) return;

    setTitle(item.title || "");
    setContent(item.content || "");

    if (item.category === "task") {
      setDueAt(formatDateForInput(item.task?.dueAt));
      setPriority(item.task?.priority || "none");
      setTags(item.task?.tags ? item.task.tags.join(", ") : "");
      setSource(item.task?.source || "manual");
    }

    if (item.category === "finance" && item.finance) {
      setAmount(item.finance.amount || 0);
      setFinanceType(item.finance.type || "expense");
    }

    if (item.category === "note") {
      setNoteType(item.note?.noteType || "general");
    }
  }, [item, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !userId) return;

    const updates: any = {
      title,
      content,
    };

    if (item.category === "task") {
      updates.task = {
        isCompleted: !!item.task?.isCompleted,
        dueAt: dueAt ? new Date(dueAt) : null,
        priority,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        source,
      };
    } else if (item.category === "finance") {
      updates.finance = {
        type: financeType,
        amount: Number(amount),
        currency: item.finance?.currency || "IDR",
        occurredAt: item.finance?.occurredAt || new Date(),
      };
    } else if (item.category === "note") {
      updates.note = {
        noteType: noteType,
      };
    }

    updateMutation.mutate(
      { id: item.id, category: item.category, updates },
      {
        onSuccess: () => {
          toast.success("Item updated successfully!");
          onClose();
        },
        onError: (err) => {
          console.error(err);
          toast.error("Failed to update item.");
        },
      }
    );
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {item.category}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            {/* Title field - common to all */}
            <Field>
              <FieldLabel htmlFor="edit-title">Title</FieldLabel>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Title"
                className="h-9"
              />
            </Field>

            {/* Task specific fields */}
            {item.category === "task" && (
              <>
                <Field>
                  <FieldLabel htmlFor="edit-due-date">Due Date & Time</FieldLabel>
                  <Input
                    id="edit-due-date"
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="h-9"
                  />
                </Field>

                <Field>
                  <FieldLabel>Priority</FieldLabel>
                  <ToggleGroup
                    type="single"
                    value={priority}
                    onValueChange={(val) => {
                      if (val) setPriority(val as "none" | "low" | "medium" | "high");
                    }}
                    className="bg-muted p-[3px] rounded-lg w-full max-w-[280px]"
                  >
                    <ToggleGroupItem value="none" className="flex-1 text-center py-1 text-xs">
                      None
                    </ToggleGroupItem>
                    <ToggleGroupItem value="low" className="flex-1 text-center py-1 text-xs">
                      Low
                    </ToggleGroupItem>
                    <ToggleGroupItem value="medium" className="flex-1 text-center py-1 text-xs">
                      Med
                    </ToggleGroupItem>
                    <ToggleGroupItem value="high" className="flex-1 text-center py-1 text-xs">
                      High
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Field>

                <Field>
                  <FieldLabel htmlFor="edit-tags">Tags (comma-separated)</FieldLabel>
                  <Input
                    id="edit-tags"
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. work, personal, shopping"
                    className="h-9"
                  />
                </Field>
              </>
            )}

            {/* Finance specific fields */}
            {item.category === "finance" && (
              <>
                <Field>
                  <FieldLabel htmlFor="edit-amount">Amount (Rp)</FieldLabel>
                  <Input
                    id="edit-amount"
                    type="number"
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                    placeholder="Amount"
                    className="h-9"
                  />
                </Field>

                <Field>
                  <FieldLabel>Transaction Type</FieldLabel>
                  <ToggleGroup
                    type="single"
                    value={financeType}
                    onValueChange={(val) => {
                      if (val) setFinanceType(val as "expense" | "income");
                    }}
                    className="bg-muted p-[3px] rounded-lg w-full max-w-[200px]"
                  >
                    <ToggleGroupItem value="expense" className="flex-1 text-center py-1">
                      Expense
                    </ToggleGroupItem>
                    <ToggleGroupItem value="income" className="flex-1 text-center py-1">
                      Income
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Field>
              </>
            )}

            {/* Note specific fields */}
            {item.category === "note" && (
              <Field>
                <FieldLabel>Note Type</FieldLabel>
                <ToggleGroup
                  type="single"
                  value={noteType}
                  onValueChange={(val) => {
                    if (val) setNoteType(val as "general" | "journal");
                  }}
                  className="bg-muted p-[3px] rounded-lg w-full max-w-[200px]"
                >
                  <ToggleGroupItem value="general" className="flex-1 text-center py-1">
                    General
                  </ToggleGroupItem>
                  <ToggleGroupItem value="journal" className="flex-1 text-center py-1">
                    Journal
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>
            )}

            {/* Content field - common to all */}
            <Field>
              <FieldLabel htmlFor="edit-content">Content</FieldLabel>
              <Textarea
                id="edit-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Details or description here..."
                required
                className="min-h-[120px] resize-none p-3 text-sm rounded-md border"
              />
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || !title.trim()}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
