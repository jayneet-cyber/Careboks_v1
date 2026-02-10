import { createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

export const generateRefreshToken = (): string => {
  return randomBytes(48).toString("hex");
};

export const hashRefreshToken = (token: string): string => {
  return createHash("sha256").update(token).digest("hex");
};

export const refreshTokenExpiryDate = (): Date => {
  const ttlInMs = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ttlInMs);
};
