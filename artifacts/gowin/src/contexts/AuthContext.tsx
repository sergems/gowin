import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useGetMe, login as apiLogin, register as apiRegister } from "@workspace/api-client-react";
import type { LoginInput, RegisterInput, User } from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("gowin_token"));
  
  // Set custom fetch token getter
  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("gowin_token"));
  }, []);

  const { data: user, isLoading, refetch } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
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

  const login = async (data: LoginInput) => {
    const res = await apiLogin(data);
    handleSetToken(res.token);
    await refetch();
  };

  const register = async (data: RegisterInput) => {
    const res = await apiRegister(data);
    handleSetToken(res.token);
    await refetch();
  };

  const logout = () => {
    handleSetToken(null);
  };

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, login, register, logout, token }}>
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
