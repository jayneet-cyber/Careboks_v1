import type { User } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../db/client.js";
import { generateRefreshToken, hashRefreshToken, refreshTokenExpiryDate } from "../../utils/refreshToken.js";
import type { AccessTokenPayload } from "./auth.types.js";

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { profile: true }
  });
};

export const findUserById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    include: { profile: true }
  });
};

type CreateUserInput = {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
};

export const createUserWithProfile = async (input: CreateUserInput) => {
  const email = input.email.toLowerCase();
  return prisma.user.create({
    data: {
      email,
      passwordHash: input.passwordHash,
      profile: {
        create: {
          firstName: input.firstName,
          lastName: input.lastName
        }
      }
    },
    include: { profile: true }
  });
};

export const createAccessToken = async (app: FastifyInstance, user: User) => {
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role
  };

  return app.jwt.sign(payload);
};

export const createRefreshSession = async (userId: string) => {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = refreshTokenExpiryDate();

  await prisma.session.create({
    data: {
      userId,
      refreshTokenHash,
      expiresAt
    }
  });

  return {
    refreshToken,
    refreshTokenExpiresAt: expiresAt
  };
};

export const findActiveSessionByToken = async (refreshToken: string) => {
  const refreshTokenHash = hashRefreshToken(refreshToken);

  return prisma.session.findFirst({
    where: {
      refreshTokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    include: {
      user: {
        include: { profile: true }
      }
    }
  });
};

export const revokeSessionByToken = async (refreshToken: string, userId?: string) => {
  const refreshTokenHash = hashRefreshToken(refreshToken);

  return prisma.session.updateMany({
    where: {
      refreshTokenHash,
      revokedAt: null,
      ...(userId ? { userId } : {})
    },
    data: { revokedAt: new Date() }
  });
};

export const revokeSessionById = async (id: string) => {
  return prisma.session.update({
    where: { id },
    data: { revokedAt: new Date() }
  });
};

export const revokeAllUserSessions = async (userId: string) => {
  return prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
};
