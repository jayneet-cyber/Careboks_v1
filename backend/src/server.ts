import { env } from "./config/env.js";
import { prisma } from "./db/client.js";
import { buildApp } from "./app.js";

const start = async () => {
  const app = buildApp();

  const close = async () => {
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", close);
  process.on("SIGTERM", close);

  try {
    await app.listen({
      host: env.API_HOST,
      port: env.API_PORT
    });
  } catch (error) {
    app.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

void start();
