import {
  ClerkExpressRequireAuth,
  ClerkExpressWithAuth,
} from "@clerk/clerk-sdk-node";

// Middleware to validate Clerk session (strict - requires auth)
export const requireAuth = ClerkExpressRequireAuth();

// Middleware to optionally attach auth data (lenient - allows no auth)
export const withAuth = ClerkExpressWithAuth();

// Middleware to attach user data to request and handle auth errors gracefully
export const attachUser = async (req, res, next) => {
  try {
    // If auth is present, attach userId
    if (req.auth && req.auth.userId) {
      req.userId = req.auth.userId;
    }
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    next(error);
  }
};

// Middleware to ensure authentication is required for protected routes
export const ensureAuth = (req, res, next) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({
      error: "Authentication required",
      message: "Please sign in to access this resource",
    });
  }
  next();
};
