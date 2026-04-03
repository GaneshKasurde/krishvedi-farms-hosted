import { useState, useEffect, createContext, useContext } from "react";
import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import apiClient from "./api/client";
import LoginPage from "./routes/LoginPage";
import HostedDashboardPage from "./routes/HostedDashboardPage";
import Layout from "./components/Layout";
import ItemsPage from "./routes/ItemsPage";
import PartiesPage from "./routes/PartiesPage";
import KrishvediIncomeStatementPage from "./routes/KrishvediIncomeStatementPage";
import KrishvediAnalysisPage from "./routes/KrishvediAnalysisPage";

// Auth Context
interface AuthContextType {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

// Main Layout with auth
function MainLayout() {
  const { logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-green-500 text-white px-4 py-3 flex justify-between items-center">
        <h1 className="font-bold text-lg">Krishvedi Farms</h1>
        <button
          onClick={logout}
          className="text-sm bg-green-600 px-3 py-1 rounded hover:bg-green-700"
        >
          Logout
        </button>
      </nav>
      <div className="p-4">
        <Outlet />
      </div>
    </div>
  );
}

const rootRoute = createRootRoute({
  component: () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [checking, setChecking] = useState(true);

    const checkAuth = async () => {
      const token = localStorage.getItem("auth_token");
      if (token) {
        try {
          const { data } = await apiClient.get("/auth/check", {
            params: { token },
          });
          setIsAuthenticated(data.authenticated);
        } catch {
          localStorage.removeItem("auth_token");
          setIsAuthenticated(false);
        }
      }
      setChecking(false);
    };

    const login = (token: string) => {
      setIsAuthenticated(true);
    };

    const logout = () => {
      localStorage.removeItem("auth_token");
      setIsAuthenticated(false);
    };

    useEffect(() => {
      checkAuth();
    }, []);

    if (checking) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return <LoginPage onLogin={login} />;
    }

    return (
      <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
        <MainLayout />
      </AuthContext.Provider>
    );
  },
});

// Routes
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: HostedDashboardPage,
});

const itemsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/items",
  component: ItemsPage,
});

const partiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/parties",
  component: PartiesPage,
});

const incomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/income-statement",
  component: KrishvediIncomeStatementPage,
});

const analysisRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analysis",
  component: KrishvediAnalysisPage,
});

// Default to dashboard
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (window.location.href = "/dashboard"),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  itemsRoute,
  partiesRoute,
  incomeRoute,
  analysisRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}