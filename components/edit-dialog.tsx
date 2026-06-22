"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Item, ItemPatch } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldContent,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useUpdateItemMutation } from "@/hooks/use-items"
import { formatDateForInput } from "@/lib/utils"

interface EditDialogProps {
  item: Item | null
  isOpen: boolean
  onClose: () => void
}

export function EditDialog({ item, isOpen, onClose }: EditDialogProps) {
  const { userId } = useAuth()
  const updateMutation = useUpdateItemMutation(userId)

  // Common fields
  const [title, setTitle] = React.useState("")

  // Task fields
  const [dueAt, setDueAt] = React.useState("")
  const [priority, setPriority] = React.useState<
    "none" | "low" | "medium" | "high"
  >("none")
  const [tags, setTags] = React.useState("")
  const [source, setSource] = React.useState<"manual" | "ai">("manual")
  const [isPinned, setIsPinned] = React.useState(false)
  const [noteType, setNoteType] = React.useState<"journal" | "general">(
    "general"
  )

  // Finance fields
  const [amount, setAmount] = React.useState<number>(0)
  const [financeType, setFinanceType] = React.useState<"expense" | "income">(
    "expense"
  )
  const [paymentMethod, setPaymentMethod] = React.useState("")
  const [occurredAt, setOccurredAt] = React.useState("")

  // Note fields
  const [content, setContent] = React.useState("")

  // Sync state with selected item when opened
  React.useEffect(() => {
    if (!item) return

    queueMicrotask(() => {
      setTitle(item.title || "")
      setContent(item.content || "")

      setTags(item.tags ? item.tags.join(", ") : "")
      setSource(item.source || "manual")
      setIsPinned(!!item.isPinned)

      if (item.category === "task") {
        setDueAt(formatDateForInput(item.task?.dueAt))
        setPriority(item.task?.priority || "none")
      }

      if (item.category === "finance" && item.finance) {
        setAmount(item.finance.amount || 0)
        setFinanceType(item.finance.type || "expense")
        setPaymentMethod(item.finance.paymentMethod || "")
        setOccurredAt(formatDateForInput(item.finance.occurredAt))
      }

      if (item.category === "note") {
        setNoteType(item.note?.noteType || "general")
      }
    })
  }, [item, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!item || !userId) return

    const updates: ItemPatch = {
      title,
      content,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      source,
    }

    if (item.category === "task") {
      updates.task = {
        isCompleted: !!item.task?.isCompleted,
        dueAt: dueAt ? new Date(dueAt) : undefined,
        priority,
      }
    } else if (item.category === "finance") {
      updates.finance = {
        type: financeType,
        amount: Number(amount),
        currency: item.finance?.currency || "IDR",
        occurredAt: occurredAt
          ? new Date(occurredAt)
          : item.finance?.occurredAt || new Date(),
        paymentMethod: paymentMethod.trim() || undefined,
      }
    } else if (item.category === "note") {
      updates.isPinned = isPinned
      updates.note = { noteType }
    }

    updateMutation.mutate(
      { id: item.id, category: item.category, updates },
      {
        onSuccess: () => {
          toast.success("Item updated successfully!")
          onClose()
        },
        onError: (err) => {
          console.error(err)
          toast.error("Failed to update item.")
        },
      }
    )
  }

  if (!item) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
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

            <Field>
              <FieldLabel htmlFor="edit-tags">
                Tags (comma-separated)
              </FieldLabel>
              <Input
                id="edit-tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. work, personal, shopping"
                className="h-9"
              />
            </Field>

            {/* Task specific fields */}
            {item.category === "task" && (
              <>
                <Field>
                  <FieldLabel htmlFor="edit-due-date">
                    Due Date & Time
                  </FieldLabel>
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
                  <RadioGroup
                    value={priority}
                    onValueChange={(val) => {
                      if (val)
                        setPriority(val as "none" | "low" | "medium" | "high")
                    }}
                    className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                  >
                    <FieldLabel className="cursor-pointer">
                      <Field
                        data-checked={priority === "none"}
                        className="flex flex-row items-center gap-2 rounded-lg border p-2 data-checked:border-primary data-checked:bg-primary/5"
                      >
                        <RadioGroupItem value="none" id="edit-priority-none" />
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
                        <RadioGroupItem value="low" id="edit-priority-low" />
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
                        <RadioGroupItem
                          value="medium"
                          id="edit-priority-medium"
                        />
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
                        <RadioGroupItem value="high" id="edit-priority-high" />
                        <FieldContent>
                          <FieldTitle className="text-xs font-semibold">
                            High
                          </FieldTitle>
                        </FieldContent>
                      </Field>
                    </FieldLabel>
                  </RadioGroup>
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
                  <FieldLabel htmlFor="edit-payment-method">
                    Payment Method
                  </FieldLabel>
                  <Input
                    id="edit-payment-method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    placeholder="cash, card, transfer"
                    className="h-9"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="edit-occurred-at">
                    Occurred Date & Time
                  </FieldLabel>
                  <Input
                    id="edit-occurred-at"
                    type="datetime-local"
                    value={occurredAt}
                    onChange={(e) => setOccurredAt(e.target.value)}
                    className="h-9"
                  />
                </Field>

                <Field>
                  <FieldLabel>Transaction Type</FieldLabel>
                  <RadioGroup
                    value={financeType}
                    onValueChange={(val) => {
                      if (val) setFinanceType(val as "expense" | "income")
                    }}
                    className="grid grid-cols-2 gap-2"
                  >
                    <FieldLabel className="cursor-pointer">
                      <Field
                        data-checked={financeType === "expense"}
                        className="flex flex-row items-center gap-2 rounded-lg border p-2 data-checked:border-primary data-checked:bg-primary/5"
                      >
                        <RadioGroupItem
                          value="expense"
                          id="edit-type-expense"
                        />
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
                        <RadioGroupItem value="income" id="edit-type-income" />
                        <FieldContent>
                          <FieldTitle className="text-xs font-semibold">
                            Income
                          </FieldTitle>
                        </FieldContent>
                      </Field>
                    </FieldLabel>
                  </RadioGroup>
                </Field>
              </>
            )}

            {item.category === "note" && (
              <>
                <Field>
                  <FieldLabel>Note Type</FieldLabel>
                  <RadioGroup
                    value={noteType}
                    onValueChange={(val) => {
                      if (val) setNoteType(val as "journal" | "general")
                    }}
                    className="grid grid-cols-2 gap-2"
                  >
                    <FieldLabel className="cursor-pointer">
                      <Field
                        data-checked={noteType === "general"}
                        className="flex flex-row items-center gap-2 rounded-lg border p-2 data-checked:border-primary data-checked:bg-primary/5"
                      >
                        <RadioGroupItem
                          value="general"
                          id="edit-note-general"
                        />
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
                        <RadioGroupItem
                          value="journal"
                          id="edit-note-journal"
                        />
                        <FieldContent>
                          <FieldTitle className="text-xs font-semibold">
                            Journal
                          </FieldTitle>
                        </FieldContent>
                      </Field>
                    </FieldLabel>
                  </RadioGroup>
                </Field>

                <Field className="flex-row items-center gap-2">
                  <Checkbox
                    id="edit-is-pinned"
                    checked={isPinned}
                    onCheckedChange={(checked) => setIsPinned(checked === true)}
                  />
                  <FieldLabel htmlFor="edit-is-pinned">Pinned</FieldLabel>
                </Field>
              </>
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
                className="min-h-30 resize-none rounded-md border p-3 text-sm"
              />
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending || !title.trim()}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
