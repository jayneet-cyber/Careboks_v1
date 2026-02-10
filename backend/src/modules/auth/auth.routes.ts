import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import {
  createAccessToken,
  createRefreshSession,
  createUserWithProfile,
  findActiveSessionByToken,
  findUserByEmail,
  findUserById,
  revokeAllUserSessions,
  revokeSessionById,
  revokeSessionByToken
} from "./auth.service.js";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1).optional(),
  allDevices: z.boolean().optional()
});

const serializeUser = (user: {
  id: string;
  email: string;
  role: string;
  profile: {
    firstName: string | null;
    lastName: string | null;
    language: string;
  } | null;
}) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  profile: user.profile
});

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/signup", async (request, reply) => {
    const bodyResult = signupSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ message: bodyResult.error.message });
    }

    const existingUser = await findUserByEmail(bodyResult.data.email);
    if (existingUser) {
      return reply.code(409).send({ message: "Email already in use" });
    }

    const passwordHash = await hashPassword(bodyResult.data.password);
    const user = await createUserWithProfile({
      email: bodyResult.data.email,
      passwordHash,
      firstName: bodyResult.data.firstName,
      lastName: bodyResult.data.lastName
    });

    const accessToken = await createAccessToken(app, user);
    const refreshSession = await createRefreshSession(user.id);

    return reply.code(201).send({
      accessToken,
      refreshToken: refreshSession.refreshToken,
      refreshTokenExpiresAt: refreshSession.refreshTokenExpiresAt,
      user: serializeUser(user)
    });
  });

  app.post("/login", async (request, reply) => {
    const bodyResult = loginSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ message: bodyResult.error.message });
    }

    const user = await findUserByEmail(bodyResult.data.email);
    if (!user) {
      return reply.code(401).send({ message: "Invalid credentials" });
    }

    const isPasswordValid = await verifyPassword(bodyResult.data.password, user.passwordHash);
    if (!isPasswordValid) {
      return reply.code(401).send({ message: "Invalid credentials" });
    }

    const accessToken = await createAccessToken(app, user);
    const refreshSession = await createRefreshSession(user.id);

    return reply.send({
      accessToken,
      refreshToken: refreshSession.refreshToken,
      refreshTokenExpiresAt: refreshSession.refreshTokenExpiresAt,
      user: serializeUser(user)
    });
  });

  app.post("/refresh", async (request, reply) => {
    const bodyResult = refreshSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ message: bodyResult.error.message });
    }

    const activeSession = await findActiveSessionByToken(bodyResult.data.refreshToken);
    if (!activeSession) {
      return reply.code(401).send({ message: "Invalid refresh token" });
    }

    await revokeSessionById(activeSession.id);
    const accessToken = await createAccessToken(app, activeSession.user);
    const refreshSession = await createRefreshSession(activeSession.userId);

    return reply.send({
      accessToken,
      refreshToken: refreshSession.refreshToken,
      refreshTokenExpiresAt: refreshSession.refreshTokenExpiresAt,
      user: serializeUser(activeSession.user)
    });
  });

  app.get("/me", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.sub;
    const user = await findUserById(userId);
    if (!user) {
      return reply.code(404).send({ message: "User not found" });
    }

    return reply.send({ user: serializeUser(user) });
  });

  app.post("/logout", { preHandler: app.authenticate }, async (request, reply) => {
    const bodyResult = logoutSchema.safeParse(request.body ?? {});
    if (!bodyResult.success) {
      return reply.code(400).send({ message: bodyResult.error.message });
    }

    const { refreshToken, allDevices } = bodyResult.data;
    const userId = request.user.sub;

    if (allDevices || !refreshToken) {
      await revokeAllUserSessions(userId);
      return reply.send({ message: "Logged out from all devices" });
    }

    await revokeSessionByToken(refreshToken, userId);
    return reply.send({ message: "Logged out" });
  });
};

export default authRoutes;
