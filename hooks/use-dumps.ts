import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDumps, deleteDump, getDumpById } from "@/services/queries";

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

export function useDeleteDumpMutation(userId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dumpId: string) => deleteDump(userId!, dumpId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dumps", userId] });
    },
  });
}
