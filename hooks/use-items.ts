import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteItem, updateItem, updateItemTask } from "@/services/queries";
import { Item, ItemCategory, ItemPatch } from "@/types";

export function useItemsQuery(userId: string | null | undefined) {
  return useQuery<Item[]>({
    queryKey: ["items", userId],
    queryFn: async () => [],
    enabled: !!userId,
    staleTime: Infinity,
  });
}

export function useItemsByCategoryQuery(userId: string | null | undefined, category: ItemCategory) {
  return useQuery<Item[]>({
    queryKey: ["items", userId, category],
    queryFn: async () => [],
    enabled: !!userId,
    staleTime: Infinity,
  });
}

export function useToggleItemTaskMutation(userId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      updateItemTask(userId!, id, isCompleted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", userId] });
    },
  });
}

export function useDeleteItemMutation(userId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, category }: { id: string; category: ItemCategory }) =>
      deleteItem(userId!, id, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", userId] });
    },
  });
}

export function useUpdateItemMutation(userId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, category, updates }: { id: string; category: ItemCategory; updates: ItemPatch }) =>
      updateItem(userId!, id, category, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", userId] });
    },
  });
}
