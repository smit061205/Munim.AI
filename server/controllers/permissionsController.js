import UserPermissions from "../models/UserPermissions.js";
import { requireAuth } from "@clerk/clerk-sdk-node";

// Get user permissions
export const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.auth;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log(`🔐 Getting permissions for user: ${userId}`);

    const permissions = await UserPermissions.getUserPermissions(userId);

    res.json({
      success: true,
      permissions,
    });
  } catch (error) {
    console.error("❌ Error getting user permissions:", error);
    res.status(500).json({
      error: "Failed to get user permissions",
      details: error.message,
    });
  }
};

// Update user permission for a specific category
export const updatePermission = async (req, res) => {
  try {
    const { userId } = req.auth;
    const { category, allowed } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!category || typeof allowed !== "boolean") {
      return res.status(400).json({
        error: "Invalid request. Category and allowed (boolean) are required.",
      });
    }

    const validCategories = [
      "assets",
      "liabilities",
      "transactions",
      "investments",
      "epf",
      "creditScore",
    ];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: `Invalid category. Must be one of: ${validCategories.join(
          ", "
        )}`,
      });
    }

    console.log(
      `🔐 Updating permission for user ${userId}: ${category} = ${allowed}`
    );

    const updatedPermissions = await UserPermissions.updatePermission(
      userId,
      category,
      allowed
    );

    res.json({
      success: true,
      permissions: updatedPermissions,
      message: `Permission for ${category} ${allowed ? "granted" : "revoked"}`,
    });
  } catch (error) {
    console.error("❌ Error updating user permission:", error);
    res.status(500).json({
      error: "Failed to update permission",
      details: error.message,
    });
  }
};

// Update multiple permissions at once
export const updateMultiplePermissions = async (req, res) => {
  try {
    const { userId } = req.auth;
    const { permissions } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!permissions || typeof permissions !== "object") {
      return res.status(400).json({
        error: "Invalid request. Permissions object is required.",
      });
    }

    console.log(
      `🔐 Updating multiple permissions for user ${userId}:`,
      permissions
    );

    // Update each permission individually
    let updatedPermissions;
    for (const [category, allowed] of Object.entries(permissions)) {
      updatedPermissions = await UserPermissions.updatePermission(
        userId,
        category,
        allowed
      );
    }

    res.json({
      success: true,
      permissions: updatedPermissions,
      message: "Permissions updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating multiple permissions:", error);
    res.status(500).json({
      error: "Failed to update permissions",
      details: error.message,
    });
  }
};
