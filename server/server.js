// Runs the API as a long-lived server for local development. On Vercel,
// api/index.js serves the same app and a daily cron replaces the scheduler.
import app from "./app.js";
import { startScheduler } from "./services/notificationService.js";

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  // Daily reminders, price refreshes and the Monday digest
  startScheduler();
});
