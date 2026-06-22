import { useMutation, useQuery } from "@tanstack/react-query"
import { deleteDump } from "@/services/queries"
import { Dump } from "@/types"
import { queryKeys } from "@/lib/app-constants"

export function useDumpsQuery(userId: string | null | undefined) {
  return useQuery<Dump[]>({
    queryKey: queryKeys.dumps(userId),
    queryFn: async () => [],
    enabled: !!userId,
    staleTime: Infinity,
  })
}

export function useDumpByIdQuery(
  userId: string | null | undefined,
  dumpId: string | null | undefined
) {
  return useQuery<Dump | null>({
    queryKey: queryKeys.dump(dumpId, userId),
    queryFn: async () => null,
    enabled: !!userId && !!dumpId,
    staleTime: Infinity,
  })
}

export function useDeleteDumpMutation(userId: string | null | undefined) {
  return useMutation({
    mutationFn: (dumpId: string) => deleteDump(userId!, dumpId),
  })
}
