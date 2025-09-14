import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import "./PermissionsManager.css";

const PermissionsManager = ({ isOpen, onClose }) => {
  const { getToken } = useAuth();
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const permissionCategories = [
    {
      key: "assets",
      title: "Assets",
      description: "Bank accounts, real estate, vehicles, and other assets",
    },
    {
      key: "liabilities",
      title: "Liabilities",
      description: "Loans, credit cards, and other debts",
    },
    {
      key: "transactions",
      title: "Transactions",
      description: "Income, expenses, and transaction history",
    },
    {
      key: "investments",
      title: "Investments",
      description: "Stocks, mutual funds, and investment portfolio",
    },
    {
      key: "epf",
      title: "EPF (Provident Fund)",
      description: "Employee Provident Fund details",
    },
    {
      key: "creditScore",
      title: "Credit Score",
      description: "Credit score and credit history information",
    },
  ];

  useEffect(() => {
    if (isOpen) {
      fetchPermissions();
    }
  }, [isOpen]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
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
      setPermissions(data.permissions);
    } catch (err) {
      console.error("Error fetching permissions:", err);
      setError("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = async (category, allowed) => {
    try {
      setSaving(true);
      setError(null);

      const token = await getToken();
      const response = await fetch("http://localhost:5001/api/permissions", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ category, allowed }),
      });

      if (!response.ok) {
        throw new Error("Failed to update permission");
      }

      const data = await response.json();
      setPermissions(data.permissions);
    } catch (err) {
      console.error("Error updating permission:", err);
      setError("Failed to update permission");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (category) => {
    const currentValue = permissions[category];
    updatePermission(category, !currentValue);
  };

  if (!isOpen) return null;

  return (
    <div className="permissions-overlay">
      <div className="permissions-modal">
        <div className="permissions-header">
          <h2>Data Access Permissions</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="permissions-content">
          <p className="permissions-description">
            Quick access to control which financial data categories the AI
            assistant can access. For more detailed permissions and settings,
            visit the main Permissions page.
          </p>

          {error && <div className="error-message">{error}</div>}

          {loading ? (
            <div className="loading-spinner">Loading permissions...</div>
          ) : (
            <div className="permissions-list">
              {permissionCategories.map((category) => (
                <div key={category.key} className="permission-item">
                  <div className="permission-info">
                    <h3>{category.title}</h3>
                    <p>{category.description}</p>
                  </div>
                  <div className="permission-toggle">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={permissions[category.key] || false}
                        onChange={() => handleToggle(category.key)}
                        disabled={saving}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="permissions-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionsManager;
