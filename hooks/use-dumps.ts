import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteDump } from "@/services/queries";
import { Dump } from "@/types";

export function useDumpsQuery(userId: string | null | undefined) {
  return useQuery<Dump[]>({
    queryKey: ["dumps", userId],
    queryFn: async () => [],
    enabled: !!userId,
    staleTime: Infinity,
  });
}

export function useDumpByIdQuery(userId: string | null | undefined, dumpId: string | null | undefined) {
  const dumpsQuery = useDumpsQuery(userId);
  return {
    ...dumpsQuery,
    data: dumpsQuery.data?.find((dump) => dump.id === dumpId) ?? null,
  };
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
