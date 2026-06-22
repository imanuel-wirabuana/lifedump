"use client"

import { useMemo, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { FileText, Plus, Trash2, Search, Pencil, Pin } from "lucide-react"
import { EditDialog } from "@/components/edit-dialog"
import { AddItemDialog } from "@/components/add-item-dialog"
import { Item, ItemCategory } from "@/types"
import { cn } from "@/lib/utils"
import { ItemCard, ItemCardSkeleton } from "@/components/item-card"
import {
  useItemsByCategoryQuery,
  useDeleteItemMutation,
  useUpdateItemMutation,
} from "@/hooks/use-items"

export default function NotesPage() {
  const { userId } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [addCategory, setAddCategory] = useState<ItemCategory | null>(null)

  const { data: notes, isLoading } = useItemsByCategoryQuery(userId, "note")

  const deleteMutation = useDeleteItemMutation(userId)
  const updateMutation = useUpdateItemMutation(userId)

  const filteredNotes = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    const source = [...(notes || [])].sort((a, b) => {
      if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      )
    })
    if (!normalizedQuery) return source

    return source.filter((note) => {
      return (
        note.title.toLowerCase().includes(normalizedQuery) ||
        note.content.toLowerCase().includes(normalizedQuery) ||
        note.tags?.some((tag) => tag.toLowerCase().includes(normalizedQuery))
      )
    })
  }, [notes, searchQuery])

  if (isLoading) {
    return (
      <div className="ld-page-shell">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <ItemCardSkeleton key={i} variant="grid" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="ld-page-shell">
      {/* Page Title */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="ld-page-kicker">Memory bank</p>
          <h1 className="ld-page-title">Notes</h1>
          <p className="ld-page-subtitle">
            Keep track of your thoughts, ideas, and journal entries.
          </p>
        </div>
        <Button
          onClick={() => setAddCategory("note")}
          className="h-9 gap-1.5 rounded-full px-4 text-xs font-bold shadow-sm"
        >
          <Plus className="size-4" /> Add Note
        </Button>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <InputGroup className="h-9 flex-1">
          <InputGroupAddon align="inline-start">
            <Search className="size-3.5 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search notes, content, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm"
          />
        </InputGroup>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filteredNotes.map((note) => (
            <ItemCard
              key={note.id}
              item={note}
              variant="grid"
              showTimestamp
              actions={
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      updateMutation.mutate({
                        id: note.id,
                        category: "note",
                        updates: { isPinned: !note.isPinned },
                      })
                    }
                    className={cn(
                      "size-7 rounded-md text-muted-foreground hover:text-foreground",
                      note.isPinned && "bg-primary/10 text-primary"
                    )}
                  >
                    <Pin className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingItem(note)
                      setIsEditOpen(true)
                    }}
                    className="size-7 rounded-md text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      deleteMutation.mutate({ id: note.id, category: "note" })
                    }
                    className="size-7 rounded-md text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </>
              }
            />
          ))}
        </div>
      ) : (
        <Empty className="border-border/40 py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No notes found</EmptyTitle>
            <EmptyDescription>
              {searchQuery
                ? "Try adjusting your search query."
                : "Type and dump notes on the home screen to see them here."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <EditDialog
        item={editingItem}
        isOpen={isEditOpen}
        onClose={() => {
          setEditingItem(null)
          setIsEditOpen(false)
        }}
      />
      <AddItemDialog
        category={addCategory}
        isOpen={addCategory !== null}
        onClose={() => setAddCategory(null)}
      />
    </div>
  )
}
