"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import { Check, Loader2, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldTitle,
} from "@/components/ui/field"
import { ItemCategory, NoteData, TaskData, FinanceData } from "@/types"
import { useCreateItemMutation } from "@/hooks/use-items"

type Priority = "none" | "low" | "medium" | "high"
type NoteType = "journal" | "general"
type FinanceType = "expense" | "income"

interface AddItemDialogProps {
  category: ItemCategory | null
  isOpen: boolean
  onClose: () => void
}

export function AddItemDialog({
  category,
  isOpen,
  onClose,
}: AddItemDialogProps) {
  const { userId } = useAuth()
  const createMutation = useCreateItemMutation(userId)

  const [title, setTitle] = React.useState("")
  const [content, setContent] = React.useState("")
  const [tags, setTags] = React.useState("")

  // Task
  const [dueAt, setDueAt] = React.useState("")
  const [priority, setPriority] = React.useState<Priority>("none")
  const [isCompleted, setIsCompleted] = React.useState(false)

  // Finance
  const [amount, setAmount] = React.useState<string>("")
  const [financeType, setFinanceType] = React.useState<FinanceType>("expense")
  const [occurredAt, setOccurredAt] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState("")

  // Note
  const [noteType, setNoteType] = React.useState<NoteType>("general")
  const [isPinned, setIsPinned] = React.useState(false)

  React.useEffect(() => {
    if (!isOpen) return
    queueMicrotask(() => {
      setTitle("")
      setContent("")
      setTags("")
      setDueAt("")
      setPriority("none")
      setIsCompleted(false)
      setAmount("")
      setFinanceType("expense")
      setOccurredAt("")
      setPaymentMethod("")
      setNoteType("general")
      setIsPinned(false)
    })
  }, [isOpen, category])

  if (!category) return null

  const titleLabel: Record<ItemCategory, string> = {
    task: "Add task",
    finance: "Add transaction",
    note: "Add note",
  }

  const tagList = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)

  const isBusy = createMutation.isPending

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!userId) return
    if (!title.trim()) {
      toast.error("Title is required")
      return
    }

    const base = {
      category,
      title: title.trim(),
      content: content.trim(),
      tags: tagList,
      source: "manual" as const,
    }

    if (category === "task") {
      const task: TaskData = {
        isCompleted,
        priority,
        dueAt: dueAt ? new Date(dueAt) : undefined,
      }
      createMutation.mutate(
        { ...base, category: "task", task },
        {
          onSuccess: () => {
            toast.success("Task added")
            onClose()
          },
          onError: (err) => {
            console.error(err)
            toast.error("Failed to add task")
          },
        }
      )
      return
    }

    if (category === "finance") {
      const numericAmount = Number(amount)
      if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
        toast.error("Enter a valid amount")
        return
      }
      const finance: FinanceData = {
        type: financeType,
        amount: numericAmount,
        currency: "IDR",
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        paymentMethod: paymentMethod.trim() || undefined,
      }
      createMutation.mutate(
        { ...base, category: "finance", finance },
        {
          onSuccess: () => {
            toast.success("Transaction added")
            onClose()
          },
          onError: (err) => {
            console.error(err)
            toast.error("Failed to add transaction")
          },
        }
      )
      return
    }

    const note: NoteData = { noteType }
    createMutation.mutate(
      { ...base, category: "note", note, isPinned },
      {
        onSuccess: () => {
          toast.success("Note added")
          onClose()
        },
        onError: (err) => {
          console.error(err)
          toast.error("Failed to add note")
        },
      }
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{titleLabel[category]}</DialogTitle>
          <DialogDescription className="text-xs">
            Add a new {category} entry manually.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="add-title">Title</Label>
            <Input
              id="add-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Short, descriptive title"
              required
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-tags">Tags (comma-separated)</Label>
            <Input
              id="add-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="work, personal, shopping"
              className="h-9"
            />
          </div>

          {category === "task" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="add-due">Due Date & Time</Label>
                <Input
                  id="add-due"
                  type="datetime-local"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <RadioGroup
                  value={priority}
                  onValueChange={(val) => setPriority(val as Priority)}
                  className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                >
                  <FieldLabel className="cursor-pointer">
                    <Field
                      data-checked={priority === "none"}
                      className="flex flex-row items-center gap-2 rounded-lg border p-2 data-checked:border-primary data-checked:bg-primary/5"
                    >
                      <RadioGroupItem value="none" id="priority-none" />
                      <FieldContent>
                        <FieldTitle className="text-xs font-semibold">
                          None
                        </FieldTitle>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                  <FieldLabel className="cursor-pointer">
                    <Field
                      data-checked={priority === "low"}
                      className="flex flex-row items-center gap-2 rounded-lg border p-2 data-checked:border-primary data-checked:bg-primary/5"
                    >
                      <RadioGroupItem value="low" id="priority-low" />
                      <FieldContent>
                        <FieldTitle className="text-xs font-semibold">
                          Low
                        </FieldTitle>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                  <FieldLabel className="cursor-pointer">
                    <Field
                      data-checked={priority === "medium"}
                      className="flex flex-row items-center gap-2 rounded-lg border p-2 data-checked:border-primary data-checked:bg-primary/5"
                    >
                      <RadioGroupItem value="medium" id="priority-medium" />
                      <FieldContent>
                        <FieldTitle className="text-xs font-semibold">
                          Medium
                        </FieldTitle>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                  <FieldLabel className="cursor-pointer">
                    <Field
                      data-checked={priority === "high"}
                      className="flex flex-row items-center gap-2 rounded-lg border p-2 data-checked:border-primary data-checked:bg-primary/5"
                    >
                      <RadioGroupItem value="high" id="priority-high" />
                      <FieldContent>
                        <FieldTitle className="text-xs font-semibold">
                          High
                        </FieldTitle>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                </RadioGroup>
              </div>
              <label className="flex flex-row items-center gap-2">
                <Checkbox
                  id="add-completed"
                  checked={isCompleted}
                  onCheckedChange={(checked) =>
                    setIsCompleted(checked === true)
                  }
                />
                <Label htmlFor="add-completed">Already completed</Label>
              </label>
            </>
          )}

          {category === "finance" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="add-amount">Amount (Rp)</Label>
                <Input
                  id="add-amount"
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Amount"
                  required
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <RadioGroup
                  value={financeType}
                  onValueChange={(val) => setFinanceType(val as FinanceType)}
                  className="grid grid-cols-2 gap-2"
                >
                  <FieldLabel className="cursor-pointer">
                    <Field
                      data-checked={financeType === "expense"}
                      className="flex flex-row items-center gap-2 rounded-lg border p-2 data-checked:border-primary data-checked:bg-primary/5"
                    >
                      <RadioGroupItem value="expense" id="type-expense" />
                      <FieldContent>
                        <FieldTitle className="text-xs font-semibold">
                          Expense
                        </FieldTitle>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                  <FieldLabel className="cursor-pointer">
                    <Field
                      data-checked={financeType === "income"}
                      className="flex flex-row items-center gap-2 rounded-lg border p-2 data-checked:border-primary data-checked:bg-primary/5"
                    >
                      <RadioGroupItem value="income" id="type-income" />
                      <FieldContent>
                        <FieldTitle className="text-xs font-semibold">
                          Income
                        </FieldTitle>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-occurred">Occurred Date & Time</Label>
                <Input
                  id="add-occurred"
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(event) => setOccurredAt(event.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-payment">Payment Method</Label>
                <Input
                  id="add-payment"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  placeholder="cash, card, transfer"
                  className="h-9"
                />
              </div>
            </>
          )}

          {category === "note" && (
            <>
              <div className="space-y-2">
                <Label>Note Type</Label>
                <RadioGroup
                  value={noteType}
                  onValueChange={(val) => setNoteType(val as NoteType)}
                  className="grid grid-cols-2 gap-2"
                >
                  <FieldLabel className="cursor-pointer">
                    <Field
                      data-checked={noteType === "general"}
                      className="flex flex-row items-center gap-2 rounded-lg border p-2 data-checked:border-primary data-checked:bg-primary/5"
                    >
                      <RadioGroupItem value="general" id="note-general" />
                      <FieldContent>
                        <FieldTitle className="text-xs font-semibold">
                          General
                        </FieldTitle>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                  <FieldLabel className="cursor-pointer">
                    <Field
                      data-checked={noteType === "journal"}
                      className="flex flex-row items-center gap-2 rounded-lg border p-2 data-checked:border-primary data-checked:bg-primary/5"
                    >
                      <RadioGroupItem value="journal" id="note-journal" />
                      <FieldContent>
                        <FieldTitle className="text-xs font-semibold">
                          Journal
                        </FieldTitle>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                </RadioGroup>
              </div>
              <label className="flex flex-row items-center gap-2">
                <Checkbox
                  id="add-pinned"
                  checked={isPinned}
                  onCheckedChange={(checked) => setIsPinned(checked === true)}
                />
                <Label htmlFor="add-pinned">Pin this note</Label>
              </label>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="add-content">Content</Label>
            <Textarea
              id="add-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Details or description here..."
              className="min-h-30 resize-none rounded-md border p-3 text-sm"
            />
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isBusy}
            >
              <X className="size-4" /> Cancel
            </Button>
            <Button type="submit" disabled={isBusy || !title.trim()}>
              {isBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {isBusy ? "Saving..." : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
