import { createApp } from "./app.js";

const app = createApp();

// Only start the HTTP server when running locally (not on Vercel serverless)
if (process.env.NODE_ENV !== "production") {
  const { env } = await import("./config/env.js");
  app.listen(env.PORT, () => {
    console.log(`Bubbleworks API listening on http://localhost:${env.PORT}`);
  });
}

export default app;
