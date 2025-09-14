import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";

const PermissionsContext = createContext();

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
};

export const PermissionsProvider = ({ children }) => {
  const { isSignedIn, isLoaded, session } = useAuth();
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
    if (!isSignedIn || !isLoaded || !session) return;

    setLoading(true);
    setError(null);

    try {
      const token = await session.getToken();
      const response = await fetch("http://localhost:5001/api/permissions", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch permissions");
      }

      const data = await response.json();
      if (data.permissions) {
        setPermissions(data.permissions);
      }
    } catch (err) {
      console.error("Error loading permissions:", err);
      setError("Failed to load permissions");
      // Keep default permissions on error
    } finally {
      setLoading(false);
    }
  };

  // Save permissions to backend (bulk)
  const savePermissions = async (newPermissions) => {
    if (!isSignedIn || !isLoaded || !session) return;

    try {
      const token = await session.getToken();
      const response = await fetch(
        "http://localhost:5001/api/permissions/bulk",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ permissions: newPermissions }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update permissions");
      }

      const data = await response.json();
      if (data.permissions) {
        setPermissions(data.permissions);
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
    if (isSignedIn && isLoaded && session) {
      loadPermissions();
    }
  }, [isSignedIn, isLoaded, session]);

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        togglePermission,
        getAllowedCategories,
        loading,
        error,
        refreshPermissions: loadPermissions,
        setPermissions, // expose for controlled updates if needed
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};
