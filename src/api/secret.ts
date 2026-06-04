import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./client";

type Secret = {
    id: number;
    providerId: number;
    name: string;
    value: string;
    remark: string | null;
    createdAt: string;
    updatedAt: string;
};

const queryKey = ["secrets"];

export function useSecrets() {
    return useQuery({ queryKey, queryFn: () => apiRequest<Secret[]>("/api/secrets") });
}

export function useCreateSecret() {
    return useMutation({
        mutationFn: (data: { providerId: number; name: string; value: string; remark?: string }) =>
            apiRequest<Secret>("/api/secrets", { method: "POST", body: data }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });
}

export function useUpdateSecret() {
    return useMutation({
        mutationFn: ({ id, ...data }: { id: number; providerId?: number; name?: string; value?: string; remark?: string }) =>
            apiRequest<Secret>(`/api/secrets/${id}`, { method: "PUT", body: data }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });
}

export function useDeleteSecret() {
    return useMutation({
        mutationFn: (id: number) => apiRequest<{ ok: true }>(`/api/secrets/${id}`, { method: "DELETE" }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });
}
