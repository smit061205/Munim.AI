import https from "https";

export const startKeepAlive = () => {
  // Render spins down free tier instances after 15 minutes of inactivity.
  // We ping our own /health endpoint every 14 minutes to keep it awake.
  const interval = 14 * 60 * 1000;
  const url =
    process.env.PING_URL || "https://munim-ai-rfed.onrender.com/health";

  console.log(
    `⏱️ Keep-alive script initialized. Pinging ${url} every 14 minutes.`,
  );

  setInterval(() => {
    https
      .get(url, (res) => {
        console.log(`⏰ Keep-alive ping successful: ${res.statusCode}`);
      })
      .on("error", (err) => {
        console.error("❌ Keep-alive ping failed:", err.message);
      });
  }, interval);
};
