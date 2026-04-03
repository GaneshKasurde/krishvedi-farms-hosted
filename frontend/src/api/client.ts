import axios from "axios";

// Use environment variable or proxy to backend
const apiBaseUrl = import.meta.env.VITE_API_URL || "";

const apiClient = axios.create({
  baseURL: apiBaseUrl + "/api",
  timeout: 30000,
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.params = { ...config.params, token };
  }
  return config;
});

export default apiClient;
