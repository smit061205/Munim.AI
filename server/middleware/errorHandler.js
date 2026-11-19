export const errorHandler = (err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    err.statusCode = 413;
    err.message = "That file is over 4 MB. Export a shorter date range, or split the statement, and try again.";
  }
  const statusCode = err.statusCode || 500;
  const message = statusCode >= 500 && process.env.NODE_ENV === "production" ? "Something went wrong on our side. Try again." : err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
};

export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    Error.captureStackTrace(this, this.constructor);
  }
}

// Async handler wrapper to catch errors
export const handleAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Health check middleware
export const healthCheck = (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
  });
};
