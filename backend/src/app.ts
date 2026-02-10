import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import fastify from "fastify";
import { env } from "./config/env.js";
import aiRoutes from "./modules/ai/ai.routes.js";
import accountRoutes from "./modules/account/account.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import casesRoutes from "./modules/cases/cases.routes.js";
import documentsRoutes from "./modules/documents/documents.routes.js";
import healthRoutes from "./modules/health/health.routes.js";
import publicRoutes from "./modules/public/public.routes.js";
import authenticatePlugin from "./plugins/authenticate.js";

export const buildApp = () => {
  const app = fastify({ logger: true });

  app.register(cors, {
    origin: env.corsOrigins.length === 1 && env.corsOrigins[0] === "*"
      ? true
      : env.corsOrigins,
    credentials: true
  });

  app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
  });

  app.register(authenticatePlugin);
  app.register(healthRoutes);
  app.register(authRoutes, { prefix: "/auth" });
  app.register(accountRoutes, { prefix: "/account" });
  app.register(casesRoutes, { prefix: "/cases" });
  app.register(documentsRoutes, { prefix: "/documents" });
  app.register(aiRoutes, { prefix: "/ai" });
  app.register(publicRoutes, { prefix: "/public" });

  return app;
};
