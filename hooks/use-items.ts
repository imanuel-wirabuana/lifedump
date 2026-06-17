import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllItems, getItemsByCategory, updateItemTask, deleteItem, updateItem } from "@/services/queries";
import { ItemCategory, Item } from "@/types";

export function useItemsQuery(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["items", userId],
    queryFn: () => getAllItems(userId!),
    enabled: !!userId,
  });
}

export function useItemsByCategoryQuery(userId: string | null | undefined, category: ItemCategory) {
  return useQuery({
    queryKey: ["items", userId, category],
    queryFn: () => getItemsByCategory(userId!, category),
    enabled: !!userId,
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
    mutationFn: ({ id, category, updates }: { id: string; category: ItemCategory; updates: Partial<Item> }) =>
      updateItem(userId!, id, category, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", userId] });
    },
  });
}
