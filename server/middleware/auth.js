import jwt from "jsonwebtoken";

const JWT_ALGORITHM = "HS256";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
};

// Sign a session token for a user
export const signToken = (userId) =>
  jwt.sign({ sub: userId }, getJwtSecret(), {
    algorithm: JWT_ALGORITHM,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// Middleware to optionally attach auth data (lenient - allows no auth)
export const withAuth = (req, res, next) => {
  req.auth = { userId: null };

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: [JWT_ALGORITHM],
    });
    req.auth.userId = payload.sub;
  } catch {
    // Expired or tampered tokens are treated as signed out
    req.auth.userId = null;
  }
  next();
};

// Middleware to ensure authentication is required for protected routes
export const requireAuth = (req, res, next) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({
      error: "Authentication required",
      message: "Please sign in to access this resource",
    });
  }
  next();
};
