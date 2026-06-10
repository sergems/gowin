import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useGetMe, getGetMeQueryKey, login as apiLogin, register as apiRegister, setAuthTokenGetter } from "@workspace/api-client-react";
import type { LoginInput, RegisterInput, User } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<{ mustChangePassword?: boolean }>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("gowin_token"));

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("gowin_token"));
  }, []);

  const { data: user, isLoading, refetch } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 7 * 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  });

  const handleSetToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem("gowin_token", newToken);
    } else {
      localStorage.removeItem("gowin_token");
    }
    setToken(newToken);
  };

  const login = async (data: LoginInput): Promise<{ mustChangePassword?: boolean }> => {
    const res = await apiLogin(data);
    handleSetToken(res.token);
    await refetch();
    return { mustChangePassword: res.mustChangePassword ?? false };
  };

  const register = async (data: RegisterInput) => {
    const res = await apiRegister(data);
    handleSetToken(res.token);
    await refetch();
  };

  const logout = () => {
    handleSetToken(null);
  };

  const refreshUser = async () => {
    await refetch();
  };

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, login, register, logout, refreshUser, token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
