import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import type { AccessTokenPayload } from "../modules/auth/auth.types.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AccessTokenPayload;
    user: AccessTokenPayload;
  }
}

const authenticatePlugin: FastifyPluginAsync = async (app) => {
  app.decorate("authenticate", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ message: "Unauthorized" });
    }
  });
};

export default fp(authenticatePlugin);
