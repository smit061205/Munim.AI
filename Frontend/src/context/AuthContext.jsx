import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, readToken, writeToken } from "../lib/api";

const AuthContext = createContext();

const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const signOut = useCallback(() => {
    writeToken(null);
    setUser(null);
  }, []);

  // Restore the session on page load
  useEffect(() => {
    const token = readToken();
    if (!token || isTokenExpired(token)) {
      writeToken(null);
      setIsLoaded(true);
      return;
    }

    api("/auth/me")
      .then((data) => setUser(data.user))
      .catch((error) => {
        console.error("Error restoring session:", error);
        // Keep the token if the API is just unreachable
        if (error.status === 401) writeToken(null);
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const getToken = useCallback(async () => {
    const token = readToken();
    if (!token) return null;

    if (isTokenExpired(token)) {
      signOut();
      return null;
    }
    return token;
  }, [signOut]);

  const startSession = useCallback(({ token, user: signedInUser }) => {
    writeToken(token);
    setUser(signedInUser);
    return signedInUser;
  }, []);

  const signIn = useCallback(
    async ({ email, password }) =>
      startSession(
        await api("/auth/login", {
          method: "POST",
          body: { email, password },
        }),
      ),
    [startSession],
  );

  const signUp = useCallback(
    async (details) =>
      startSession(
        await api("/auth/register", { method: "POST", body: details }),
      ),
    [startSession],
  );

  const fetchQuestionnaire = useCallback(
    () => api("/investor-profile/questions"),
    [],
  );

  const saveInvestorProfile = useCallback(
    async (answers) => {
      const data = await api("/investor-profile", {
        method: "PUT",
        body: { answers },
      });
      setUser(data.user);
      return data.user;
    },
    [],
  );

  const updateProfile = useCallback(async (changes) => {
    const data = await api("/auth/me", { method: "PATCH", body: changes });
    setUser(data.user);
    return data.user;
  }, []);

  const reloadUser = useCallback(async () => {
    const data = await api("/auth/me");
    setUser(data.user);
  }, []);

  const value = useMemo(
    () => ({
      isLoaded,
      isSignedIn: !!user,
      userId: user?.id || null,
      user,
      getToken,
      signIn,
      signUp,
      signOut,
      fetchQuestionnaire,
      saveInvestorProfile,
      updateProfile,
      reloadUser,
    }),
    [
      isLoaded,
      user,
      getToken,
      signIn,
      signUp,
      signOut,
      fetchQuestionnaire,
      saveInvestorProfile,
      updateProfile,
      reloadUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const useUser = () => {
  const { user, isLoaded, isSignedIn } = useAuth();
  return { user, isLoaded, isSignedIn };
};
