import type { UserRole } from "@prisma/client";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
};
