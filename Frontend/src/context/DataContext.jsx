import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../lib/api";

const DataContext = createContext(null);

// One copy of the user's overview, shared by every page and refreshed after
// anything that changes their money
export const DataProvider = ({ children }) => {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api("/wealth/overview");
      setOverview(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ overview, error, refresh }),
    [overview, error, refresh],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => useContext(DataContext);
