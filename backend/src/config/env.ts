import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:8080"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(14),
  MY_IBM_KEY: z.string().optional(),
  WATSONX_PROJECT_ID: z.string().optional(),
  FILE_STORAGE_DIR: z.string().default("./storage")
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Invalid environment variables: ${parsedEnv.error.message}`);
}

const corsOrigins = parsedEnv.data.CORS_ORIGIN.split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export const env = {
  ...parsedEnv.data,
  corsOrigins
};
