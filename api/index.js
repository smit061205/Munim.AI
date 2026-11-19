// Vercel serves every /api request through this one function, which runs
// the same Express app as local development
import app from "../server/app.js";

export default app;
