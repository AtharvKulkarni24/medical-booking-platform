/**
 * React Query Hooks - For managing API state and caching
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import type { User, AuthResponse, TimeSlot } from "../types";

/**
 * Auth Hooks
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password, role }: { email: string; password: string; role: string }) =>
      apiClient.login(email, password, role),
    onSuccess: (data) => {
      if (data.user) {
        queryClient.setQueryData(["user"], data.user);
      }
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiClient.register(data),
    onSuccess: (data) => {
      if (data.user) {
        queryClient.setQueryData(["user"], data.user);
      }
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: () => apiClient.getCurrentUser(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Lab Hooks
 */
export function useLabProfile() {
  return useQuery({
    queryKey: ["lab", "profile"],
    queryFn: () => apiClient.getLabProfile(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateLabProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiClient.updateLabProfile(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lab", "profile"] });
    },
  });
}

export function useLabSlots() {
  return useQuery({
    queryKey: ["lab", "slots"],
    queryFn: () => apiClient.getLabSlots(),
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

export function useLabSlot(slotId: string) {
  return useQuery({
    queryKey: ["lab", "slot", slotId],
    queryFn: () => apiClient.getLabSlotById(slotId),
    enabled: !!slotId,
  });
}

export function useCreateLabSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiClient.createLabSlot(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab", "slots"] });
    },
  });
}

export function useUpdateLabSlot(slotId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiClient.updateLabSlot(slotId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab", "slots"] });
      queryClient.invalidateQueries({ queryKey: ["lab", "slot", slotId] });
    },
  });
}

export function useDeleteLabSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slotId: string) => apiClient.deleteLabSlot(slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab", "slots"] });
    },
  });
}

/**
 * Patient Hooks
 */
export function usePatientProfile() {
  return useQuery({
    queryKey: ["patient", "profile"],
    queryFn: () => apiClient.getPatientProfile(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdatePatientProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiClient.updatePatientProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", "profile"] });
    },
  });
}

export function usePatientBookings() {
  return useQuery({
    queryKey: ["patient", "bookings"],
    queryFn: () => apiClient.getPatientBookings(),
    staleTime: 1000 * 60 * 1,
  });
}

export function useBookTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiClient.bookTest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", "bookings"] });
    },
  });
}

/**
 * Search Hooks
 */
export function useSearchLabs(query: string) {
  return useQuery({
    queryKey: ["search", "labs", query],
    queryFn: () => apiClient.searchLabs(query),
    enabled: query.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSearchTests(query: string) {
  return useQuery({
    queryKey: ["search", "tests", query],
    queryFn: () => apiClient.searchTests(query),
    enabled: query.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}
