import express from "express";
import { requireAuth } from "../middleware/clerkAuth.js";
import {
  getUserPermissions,
  updatePermission,
  updateMultiplePermissions,
} from "../controllers/permissionsController.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// GET /api/permissions - Get user's current permissions
router.get("/", getUserPermissions);

// PUT /api/permissions - Update a specific permission
router.put("/", updatePermission);

// PUT /api/permissions/bulk - Update multiple permissions at once
router.put("/bulk", updateMultiplePermissions);

export default router;
