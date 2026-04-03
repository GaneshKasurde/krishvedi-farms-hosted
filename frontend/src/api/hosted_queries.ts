import { useQuery, useMutation } from "@tanstack/react-query";
import apiClient from "./client";

// Check if data exists
export function useReportStatus() {
  return useQuery({
    queryKey: ["report-status"],
    queryFn: async () => {
      const { data } = await apiClient.get("/data/report");
      return data;
    },
  });
}

// Get overview data
export function useHostedOverview(month: string | null) {
  return useQuery({
    queryKey: ["hosted-overview", month],
    queryFn: async () => {
      const { data } = await apiClient.get("/data/overview");
      return data;
    },
    enabled: true,
  });
}

// Get items data
export function useHostedItems(month: string = "all") {
  return useQuery({
    queryKey: ["hosted-items", month],
    queryFn: async () => {
      const { data } = await apiClient.get("/data/items", { params: { month } });
      return data;
    },
  });
}

// Get parties data
export function useHostedParties(month: string = "all") {
  return useQuery({
    queryKey: ["hosted-parties", month],
    queryFn: async () => {
      const { data } = await apiClient.get("/data/parties", { params: { month } });
      return data;
    },
  });
}

// Upload file mutation
export function useHostedUpload() {
  return useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      const formData = new FormData();
      formData.append("data_file", file);
      const { data } = await apiClient.post("/data/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
  });
}

// Check auth status
export function useCheckAuth(token: string | null) {
  return useQuery({
    queryKey: ["auth-check", token],
    queryFn: async () => {
      const { data } = await apiClient.get("/auth/check", { 
        params: { token } 
      });
      return data;
    },
    enabled: !!token,
  });
}