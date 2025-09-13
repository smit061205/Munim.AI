import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  createAuthenticatedApi,
  fetchPermissions,
  updatePermissions,
} from "../services/api";

const PermissionsContext = createContext();

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
};

export const PermissionsProvider = ({ children }) => {
  const { getToken, isSignedIn } = useAuth();
  const [permissions, setPermissions] = useState({
    assets: true,
    liabilities: true,
    transactions: true,
    epf: true,
    creditScore: true,
    investments: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load permissions from backend
  const loadPermissions = async () => {
    if (!isSignedIn) return;

    setLoading(true);
    setError(null);

    try {
      const authApi = createAuthenticatedApi(getToken);
      const response = await fetchPermissions(authApi);

      if (response.data?.allowedCategories) {
        setPermissions(response.data.allowedCategories);
      }
    } catch (err) {
      console.error("Error loading permissions:", err);
      setError("Failed to load permissions");
      // Keep default permissions on error
    } finally {
      setLoading(false);
    }
  };

  // Save permissions to backend
  const savePermissions = async (newPermissions) => {
    if (!isSignedIn) return;

    try {
      const authApi = createAuthenticatedApi(getToken);
      const response = await updatePermissions(authApi, newPermissions);

      if (response.data?.allowedCategories) {
        setPermissions(response.data.allowedCategories);
      }
    } catch (err) {
      console.error("Error saving permissions:", err);
      setError("Failed to save permissions");
      // Revert to previous state on error
      throw err;
    }
  };

  const togglePermission = async (category) => {
    const newPermissions = {
      ...permissions,
      [category]: !permissions[category],
    };

    // Optimistically update UI
    setPermissions(newPermissions);

    try {
      await savePermissions(newPermissions);
      setError(null);
    } catch (err) {
      // Revert on error
      setPermissions(permissions);
    }
  };

  const getAllowedCategories = () => {
    return Object.keys(permissions).filter((key) => permissions[key]);
  };

  // Load permissions on mount and when user signs in
  useEffect(() => {
    if (isSignedIn) {
      loadPermissions();
    }
  }, [isSignedIn]);

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        togglePermission,
        getAllowedCategories,
        loading,
        error,
        refreshPermissions: loadPermissions,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};
