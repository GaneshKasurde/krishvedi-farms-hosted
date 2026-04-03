import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import apiClient from "../api/client";

interface SessionContextType {
  sessionId: string | null;
  monthsLoaded: string[];
  selectedMonth: string | null;
  isLoading: boolean;
  setSessionId: (id: string | null) => void;
  setMonthsLoaded: (months: string[]) => void;
  setSelectedMonth: (month: string | null) => void;
  addMonth: (month: string) => void;
  clearSession: () => void;
}

const SESSION_STORAGE_KEY = "rmc_session_id";
const MONTHS_STORAGE_KEY = "rmc_months_loaded";

const SessionContext = createContext<SessionContextType | null>(null);

async function validateSession(sessionId: string): Promise<{ valid: boolean; months?: string[] }> {
  try {
    const { data } = await apiClient.get("/session/status", {
      params: { session_id: sessionId },
    });
    return { valid: true, months: data.months_loaded };
  } catch {
    return { valid: false };
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionIdState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(SESSION_STORAGE_KEY);
    }
    return null;
  });
  const [monthsLoaded, setMonthsLoaded] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(MONTHS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    async function checkSession() {
      if (sessionId) {
        const result = await validateSession(sessionId);
        if (result.valid && result.months && result.months.length > 0) {
          setMonthsLoaded(result.months);
          setSelectedMonth(result.months[result.months.length - 1]);
        } else {
          setSessionIdState(null);
          setMonthsLoaded([]);
          setSelectedMonth(null);
          localStorage.removeItem(SESSION_STORAGE_KEY);
          localStorage.removeItem(MONTHS_STORAGE_KEY);
        }
      }
      setIsValidating(false);
    }
    checkSession();
  }, []);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [sessionId]);

  useEffect(() => {
    if (monthsLoaded.length > 0) {
      localStorage.setItem(MONTHS_STORAGE_KEY, JSON.stringify(monthsLoaded));
    } else {
      localStorage.removeItem(MONTHS_STORAGE_KEY);
    }
  }, [monthsLoaded]);

  const setSessionId = useCallback((id: string | null) => {
    setSessionIdState(id);
  }, []);

  const addMonth = useCallback(
    (month: string) => {
      setMonthsLoaded((prev) => {
        if (prev.includes(month)) return prev;
        const next = [...prev, month].sort();
        return next;
      });
      setSelectedMonth(month);
    },
    []
  );

  const clearSession = useCallback(() => {
    setSessionIdState(null);
    setMonthsLoaded([]);
    setSelectedMonth(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(MONTHS_STORAGE_KEY);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        monthsLoaded,
        selectedMonth,
        isLoading: isValidating,
        setSessionId,
        setMonthsLoaded,
        setSelectedMonth,
        addMonth,
        clearSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextType {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}
