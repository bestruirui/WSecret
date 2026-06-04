import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./client";

type Provider = { id: number; name: string; avatar: string | null };

const queryKey = ["providers"];

export function useProviders() {
    return useQuery({ queryKey, queryFn: () => apiRequest<Provider[]>("/api/providers") });
}

export function useCreateProvider() {
    return useMutation({
        mutationFn: (data: { name: string; avatar?: string }) =>
            apiRequest<Provider>("/api/providers", { method: "POST", body: data }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });
}

export function useUpdateProvider() {
    return useMutation({
        mutationFn: ({ id, ...data }: { id: number; name?: string; avatar?: string }) =>
            apiRequest<Provider>(`/api/providers/${id}`, { method: "PUT", body: data }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });
}

export function useDeleteProvider() {
    return useMutation({
        mutationFn: (id: number) =>
            apiRequest<{ ok: true }>(`/api/providers/${id}`, { method: "DELETE" }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });
}
