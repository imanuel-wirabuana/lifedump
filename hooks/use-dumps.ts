import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { getDumps, getDumpsPaged, deleteDump, getDumpById } from "@/services/queries";

export function useDumpsQuery(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["dumps", userId],
    queryFn: () => getDumps(userId!),
    enabled: !!userId,
  });
}

export function useDumpByIdQuery(userId: string | null | undefined, dumpId: string | null | undefined) {
  return useQuery({
    queryKey: ["dump", dumpId, userId],
    queryFn: () => getDumpById(userId!, dumpId!),
    enabled: !!userId && !!dumpId,
  });
}

export function useDumpsInfiniteQuery(userId: string | null | undefined) {
  return useInfiniteQuery({
    queryKey: ["dumps-infinite", userId],
    queryFn: ({ pageParam }) => getDumpsPaged(userId!, 5, pageParam),
    initialPageParam: null as any,
    getNextPageParam: (lastPage) => lastPage.lastDoc,
    enabled: !!userId,
  });
}

export function useDeleteDumpMutation(userId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dumpId: string) => deleteDump(userId!, dumpId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dumps-infinite", userId] });
      queryClient.invalidateQueries({ queryKey: ["dumps", userId] });
    },
  });
}
