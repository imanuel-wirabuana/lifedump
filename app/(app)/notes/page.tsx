"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { FileText, Trash2, Search, Pencil } from "lucide-react";
import { EditDialog } from "@/components/edit-dialog";
import { Item } from "@/types";
import { useItemsByCategoryQuery, useDeleteItemMutation } from "@/hooks/use-items";

export default function NotesPage() {
  const { userId } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "general" | "journal">("all");
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: notes, isLoading } = useItemsByCategoryQuery(userId, "note");

  const deleteMutation = useDeleteItemMutation(userId);

  if (isLoading) {
    return (
      <div className="flex flex-col p-4 md:p-8 max-w-2xl mx-auto w-full pt-8 gap-6">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-20 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Filtering Logic
  const filteredNotes = (notes || []).filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase()));

    const noteType = note.note?.noteType || "general";
    const matchesType = filterType === "all" || noteType === filterType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="flex flex-col p-4 md:p-8 max-w-2xl mx-auto w-full pt-8 gap-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
        <p className="text-sm text-muted-foreground mt-1">Keep track of your thoughts, ideas, and journal entries.</p>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <InputGroup className="h-9 flex-1">
          <InputGroupAddon align="inline-start">
            <Search className="size-3.5 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm"
          />
        </InputGroup>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(["all", "general", "journal"] as const).map((type) => (
            <Button
              key={type}
              variant={filterType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(type)}
              className="text-xs h-9 px-3 capitalize shrink-0 rounded-lg"
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredNotes.map((note) => {
            const noteType = note.note?.noteType || "general";
            return (
              <Card
                key={note.id}
                className="border-border/50 shadow-sm hover:border-border hover:shadow transition-all flex flex-col justify-between"
              >
                <div>
                  <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold truncate pr-1">{note.title}</CardTitle>
                      <Badge
                        variant={noteType === "journal" ? "secondary" : "outline"}
                        className="text-[9px] uppercase px-1 py-0 h-4 font-bold tracking-wider mt-1.5"
                      >
                        {noteType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-0.5 -mt-1 -mr-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingItem(note);
                          setIsEditOpen(true);
                        }}
                        className="text-muted-foreground hover:text-foreground size-7 rounded-md"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate({ id: note.id, category: "note" })}
                        className="text-muted-foreground hover:text-destructive size-7 rounded-md"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {note.content && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4 leading-relaxed">
                        {note.content}
                      </p>
                    )}
                  </CardContent>
                </div>
                <div className="px-4 pb-4 pt-0">
                  <p className="text-[10px] text-muted-foreground font-medium" suppressHydrationWarning>
                    {new Date(note.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty className="py-16 border-border/40">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No notes found</EmptyTitle>
            <EmptyDescription>
              {searchQuery || filterType !== "all"
                ? "Try adjusting your search query or filters."
                : "Type and dump notes or journals on the home screen to see them here."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
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
