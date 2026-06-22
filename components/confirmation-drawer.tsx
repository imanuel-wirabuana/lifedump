"use client"

import { useDumpStore } from "@/stores/use-dump-store"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerDescription,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { saveDumpAndItems, confirmDumpAndItems } from "@/services/firestore"
import { useAuth } from "@clerk/nextjs"
import { useState } from "react"
import { Trash2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ItemCard, ItemCategoryMark } from "@/components/item-card"
import { useSettings } from "@/hooks/use-settings"

export function ConfirmationDrawer() {
  const { userId } = useAuth()
  const {
    dumpStatus,
    extractedItems,
    currentInputText,
    currentDumpId,
    setDumpStatus,
    clearState,
    setExtractedItems,
  } = useDumpStore()
  const [isSaving, setIsSaving] = useState(false)
  const [revisionPrompt, setRevisionPrompt] = useState("")
  const [isRevising, setIsRevising] = useState(false)
  const { settings } = useSettings()

  const isOpen = dumpStatus === "needs_review"
  const counts = extractedItems.reduce(
    (acc, item) => {
      acc[item.category] += 1
      return acc
    },
    { task: 0, finance: 0, note: 0 }
  )

  const handleConfirm = async () => {
    if (!userId) return
    setIsSaving(true)
    try {
      if (currentDumpId) {
        await confirmDumpAndItems(userId, currentDumpId, extractedItems)
      } else {
        await saveDumpAndItems(
          userId,
          "text",
          currentInputText,
          "confirmed",
          extractedItems
        )
      }
      toast.success("Items saved successfully!")
      clearState()
    } catch (error) {
      console.error("Failed to save:", error)
      toast.error("Failed to save. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemove = (index: number) => {
    const newItems = [...extractedItems]
    newItems.splice(index, 1)
    setExtractedItems(newItems)
    if (newItems.length === 0) {
      setDumpStatus("idle")
    }
  }

  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!revisionPrompt.trim() || isRevising) return
    if (!currentDumpId) {
      toast.error("No active background dump to refine.")
      return
    }

    setIsRevising(true)

    try {
      // Flatten extractedItems to match the API's z.array schema
      const flatItems = extractedItems.map((item) => ({
        category: item.category,
        title: item.title,
        content: item.content || "",
        dueAt: item.task?.dueAt
          ? new Date(item.task.dueAt).toISOString()
          : null,
        priority: item.task?.priority || "none",
        tags: item.tags || [],
        financeType: item.finance?.type || null,
        amount: item.finance?.amount || null,
        currency: "IDR",
        occurredAt: item.finance?.occurredAt
          ? new Date(item.finance.occurredAt).toISOString()
          : null,
        confidence: item.aiConfidence || 1,
        needsClarification: item.needsClarification || false,
      }))

      const response = await fetch("/api/trigger-refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dumpId: currentDumpId,
          feedback: revisionPrompt,
          currentItems: flatItems,
          aiBaseUrl: settings.aiBaseUrl,
          aiApiKey: settings.aiApiKey,
          aiModel: settings.aiModel,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to start refinement job")
      }

      setRevisionPrompt("")
      setDumpStatus("processing") // close the drawer globally and trigger loading toast
      toast.success("Refining items in the background...")
    } catch (error) {
      console.error("Refinement Error:", error)
      toast.error("Failed to start refinement. Please try again.")
    } finally {
      setIsRevising(false)
    }
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => !open && setDumpStatus("idle")}
    >
      <DrawerContent className="mx-auto max-h-[88vh] w-full max-w-2xl overflow-hidden">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-lg font-black tracking-tight">
            Review Items
          </DrawerTitle>
          <DrawerDescription className="text-xs">
            Please confirm the categorized items before saving.
          </DrawerDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
              {extractedItems.length} total
            </span>
            {counts.task > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                {counts.task} tasks
              </span>
            )}
            {counts.finance > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                {counts.finance} finances
              </span>
            )}
            {counts.note > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                {counts.note} notes
              </span>
            )}
          </div>
          {currentInputText && (
            <p className="mt-3 line-clamp-2 rounded-2xl border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
              {currentInputText}
            </p>
          )}
        </DrawerHeader>

        {/* Scrollable items list */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-2">
          {extractedItems.map((item, index) => (
            <ItemCard
              key={index}
              item={item}
              variant="review"
              showCategory
              showTags
              leading={<ItemCategoryMark category={item.category} />}
              actions={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(index)}
                  className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              }
            />
          ))}
        </div>

        {/* AI Refinement Prompt */}
        <form
          onSubmit={handleRefine}
          className="border-t bg-background/80 px-4 pt-3 pb-2 backdrop-blur"
        >
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">
            Need changes? Example: “make the rent item income” or “split
            groceries into two expenses”.
          </p>
          <InputGroup className="h-9">
            <InputGroupAddon align="inline-start">
              <Sparkles
                className={cn(
                  "size-3.5 text-indigo-500",
                  isRevising && "animate-pulse"
                )}
              />
            </InputGroupAddon>
            <InputGroupInput
              placeholder={
                isRevising
                  ? "Re-processing items..."
                  : "Revision instructions... (e.g. Change task 1 to note)"
              }
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

        <DrawerFooter className="flex flex-row gap-2 px-4 pt-2 pb-6">
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
            className="flex-1 bg-primary font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
          >
            {isSaving && <Spinner data-icon="inline-start" />}
            {isSaving ? "Saving..." : "Confirm All"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
