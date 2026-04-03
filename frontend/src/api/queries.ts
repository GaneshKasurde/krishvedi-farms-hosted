import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type {
  UploadResponse,
  OverviewResponse,
  GradeProfitabilityResponse,
  CustomerAnalysisResponse,
  MaterialAnalysisResponse,
  ProductionAnalysisResponse,
  TrendsResponse,
  SessionStatusResponse,
} from "../types/analysis";

// ---- Session ----

export function useSessionStatus(sessionId: string | null) {
  return useQuery<SessionStatusResponse>({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const { data } = await apiClient.get("/session/status", {
        params: { session_id: sessionId },
      });
      return data;
    },
    enabled: !!sessionId,
    refetchOnWindowFocus: false,
  });
}

// ---- Upload ----

export function useUpload() {
  const queryClient = useQueryClient();

  return useMutation<
    UploadResponse,
    Error,
    { formData: FormData; sessionId: string | null }
  >({
    mutationFn: async ({ formData, sessionId }) => {
      if (sessionId) {
        formData.append("session_id", sessionId);
      }
      const { data } = await apiClient.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["production"] });
      queryClient.invalidateQueries({ queryKey: ["trends"] });
    },
  });
}

// ---- Overview ----

export function useOverview(sessionId: string | null) {
  return useQuery<OverviewResponse>({
    queryKey: ["overview", sessionId],
    queryFn: async () => {
      const { data } = await apiClient.get("/analysis/overview", {
        params: { session_id: sessionId },
      });
      return data;
    },
    enabled: !!sessionId,
  });
}

// ---- Grade Profitability ----

export function useGradeProfitability(
  sessionId: string | null,
  month: string | null
) {
  return useQuery<GradeProfitabilityResponse>({
    queryKey: ["grades", sessionId, month],
    queryFn: async () => {
      const { data } = await apiClient.get("/analysis/grade-profitability", {
        params: { session_id: sessionId, month },
      });
      return data;
    },
    enabled: !!sessionId && !!month,
  });
}

// ---- Customer Analysis ----

export function useCustomerAnalysis(
  sessionId: string | null,
  month: string | null
) {
  return useQuery<CustomerAnalysisResponse>({
    queryKey: ["customers", sessionId, month],
    queryFn: async () => {
      const { data } = await apiClient.get("/analysis/customers", {
        params: { session_id: sessionId, month },
      });
      return data;
    },
    enabled: !!sessionId && !!month,
  });
}

// ---- Material Analysis ----

export function useMaterialAnalysis(
  sessionId: string | null,
  month: string | null
) {
  return useQuery<MaterialAnalysisResponse>({
    queryKey: ["materials", sessionId, month],
    queryFn: async () => {
      const { data } = await apiClient.get("/analysis/materials", {
        params: { session_id: sessionId, month },
      });
      return data;
    },
    enabled: !!sessionId && !!month,
  });
}

// ---- Production Analysis ----

export function useProductionAnalysis(
  sessionId: string | null,
  month: string | null
) {
  return useQuery<ProductionAnalysisResponse>({
    queryKey: ["production", sessionId, month],
    queryFn: async () => {
      const { data } = await apiClient.get("/analysis/production", {
        params: { session_id: sessionId, month },
      });
      return data;
    },
    enabled: !!sessionId && !!month,
  });
}

// ---- Trends ----

export function useTrends(sessionId: string | null) {
  return useQuery<TrendsResponse>({
    queryKey: ["trends", sessionId],
    queryFn: async () => {
      const { data } = await apiClient.get("/analysis/trends", {
        params: { session_id: sessionId },
      });
      return data;
    },
    enabled: !!sessionId,
  });
}

// ---- Delete Session ----

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await apiClient.delete("/session", {
        params: { session_id: sessionId },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

// ---- Expenses Upload ----

export function useExpensesUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ formData, sessionId }: { formData: FormData; sessionId: string | null }) => {
      if (sessionId) {
        formData.append("session_id", sessionId);
      }
      const { data } = await apiClient.post("/expenses/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["production"] });
      queryClient.invalidateQueries({ queryKey: ["trends"] });
      queryClient.invalidateQueries({ queryKey: ["income-statement"] });
    },
    onSettled: () => {
      queryClient.refetchQueries({ queryKey: ["session"] });
      queryClient.refetchQueries({ queryKey: ["overview"] });
      queryClient.refetchQueries({ queryKey: ["grades"] });
      queryClient.refetchQueries({ queryKey: ["customers"] });
      queryClient.refetchQueries({ queryKey: ["materials"] });
      queryClient.refetchQueries({ queryKey: ["production"] });
      queryClient.refetchQueries({ queryKey: ["trends"] });
      queryClient.refetchQueries({ queryKey: ["income-statement"] });
    },
  });
}

// ---- Income Statement ----

export function useIncomeStatement(sessionId: string | null, month?: string | null, refreshKey?: number) {
  return useQuery({
    queryKey: ["income-statement", sessionId, month, refreshKey],
    queryFn: async () => {
      const { data } = await apiClient.get("/expenses/income-statement", {
        params: { session_id: sessionId, month },
      });
      return data;
    },
    enabled: !!sessionId,
    refetchOnMount: true,
    staleTime: 0,
  });
}

// ---- Expense Details ----

export function useExpenseDetails(sessionId: string | null, month: string | null, section: string | null) {
  return useQuery({
    queryKey: ["expense-details", sessionId, month, section],
    queryFn: async () => {
      const { data } = await apiClient.get("/expenses/details", {
        params: { session_id: sessionId, month, section },
      });
      return data;
    },
    enabled: !!sessionId && !!month && !!section,
    staleTime: 0,
  });
}

// ---- Expense Details Multi-Month ----

export function useExpenseDetailsMulti(sessionId: string | null, months: string[], section: string | null) {
  return useQuery({
    queryKey: ["expense-details-multi", sessionId, months, section],
    queryFn: async () => {
      const { data } = await apiClient.get("/expenses/details", {
        params: { session_id: sessionId, months: months.join(","), section },
      });
      return data;
    },
    enabled: !!sessionId && months.length > 0 && !!section,
    staleTime: 0,
  });
}

// ---- Krishvedi Overview ----

export function useKrishvediOverview(sessionId: string | null, month?: string | null) {
  return useQuery({
    queryKey: ["krishvedi-overview", sessionId, month],
    queryFn: async () => {
      const { data } = await apiClient.get("/krishvedi/overview", {
        params: { session_id: sessionId, month },
      });
      return data;
    },
    enabled: !!sessionId,
  });
}

// ---- Krishvedi Items ----

export function useKrishvediItems(sessionId: string | null, month?: string | null, category?: string | null) {
  return useQuery({
    queryKey: ["krishvedi-items", sessionId, month, category],
    queryFn: async () => {
      const { data } = await apiClient.get("/krishvedi/items", {
        params: { session_id: sessionId, month, category },
      });
      return data;
    },
    enabled: !!sessionId,
  });
}

// ---- Krishvedi Parties ----

export function useKrishvediParties(sessionId: string | null, month?: string | null) {
  return useQuery({
    queryKey: ["krishvedi-parties", sessionId, month],
    queryFn: async () => {
      const { data } = await apiClient.get("/krishvedi/parties", {
        params: { session_id: sessionId, month },
      });
      return data;
    },
    enabled: !!sessionId,
  });
}

// ---- Krishvedi Income Statement ----

export function useKrishvediIncomeStatement(sessionId: string | null, month?: string | null, refreshKey?: number) {
  return useQuery({
    queryKey: ["krishvedi-income", sessionId, month, refreshKey],
    queryFn: async () => {
      const { data } = await apiClient.get("/krishvedi/income-statement", {
        params: { session_id: sessionId, month },
      });
      return data;
    },
    enabled: !!sessionId,
  });
}
