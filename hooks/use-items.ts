import { useMutation, useQuery } from "@tanstack/react-query"
import {
  createItem,
  deleteItem,
  type CreateItemPayload,
  updateItem,
  updateItemTask,
} from "@/services/queries"
import { Item, ItemCategory, ItemPatch } from "@/types"
import { queryKeys } from "@/lib/app-constants"

export function useItemsQuery(userId: string | null | undefined) {
  return useQuery<Item[]>({
    queryKey: queryKeys.items(userId),
    queryFn: async () => [],
    enabled: !!userId,
    staleTime: Infinity,
  })
}

export function useItemsByCategoryQuery(
  userId: string | null | undefined,
  category: ItemCategory
) {
  return useQuery<Item[]>({
    queryKey: queryKeys.itemsByCategory(userId, category),
    queryFn: async () => [],
    enabled: !!userId,
    staleTime: Infinity,
  })
}

export function useCreateItemMutation(userId: string | null | undefined) {
  return useMutation({
    mutationFn: (payload: Omit<CreateItemPayload, "userId">) =>
      createItem({ ...payload, userId: userId! }),
  })
}

export function useToggleItemTaskMutation(userId: string | null | undefined) {
  return useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      updateItemTask(userId!, id, isCompleted),
  })
}

export function useDeleteItemMutation(userId: string | null | undefined) {
  return useMutation({
    mutationFn: ({ id, category }: { id: string; category: ItemCategory }) =>
      deleteItem(userId!, id, category),
  })
}

export function useUpdateItemMutation(userId: string | null | undefined) {
  return useMutation({
    mutationFn: ({
      id,
      category,
      updates,
    }: {
      id: string
      category: ItemCategory
      updates: ItemPatch
    }) => updateItem(userId!, id, category, updates),
  })
}
