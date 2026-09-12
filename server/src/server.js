import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/db.js";

const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`Event Management Platform listening on port ${env.PORT}`);
});
let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`${signal} received. Closing server.`);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
