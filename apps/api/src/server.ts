import { createApp } from "./app.js";

const app = createApp();

// Start a real HTTP server everywhere except Vercel serverless.
if (process.env.VERCEL !== "1") {
  const { env } = await import("./config/env.js");
  app.listen(env.PORT, () => {
    console.log(`Bubbleworks API listening on http://localhost:${env.PORT}`);
  });
}

export default app;
