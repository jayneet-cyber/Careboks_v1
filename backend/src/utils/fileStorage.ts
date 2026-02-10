import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";

const sanitizeFileName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
};

const decodeBase64Payload = (payload: string): Buffer => {
  const dataUriMatch = payload.match(/^data:.*;base64,(.*)$/);
  const base64Value = dataUriMatch ? dataUriMatch[1] : payload;
  return Buffer.from(base64Value, "base64");
};

export const writeUserFile = async (userId: string, originalName: string, payload: string) => {
  const safeName = sanitizeFileName(originalName);
  const relativePath = path.join("user-documents", userId, `${Date.now()}_${safeName}`);
  const fullPath = path.resolve(env.FILE_STORAGE_DIR, relativePath);

  await mkdir(path.dirname(fullPath), { recursive: true });
  const fileBuffer = decodeBase64Payload(payload);
  await writeFile(fullPath, fileBuffer);

  return {
    relativePath,
    size: fileBuffer.length
  };
};

export const readUserFileBase64 = async (relativePath: string) => {
  const fullPath = path.resolve(env.FILE_STORAGE_DIR, relativePath);
  const fileBuffer = await readFile(fullPath);
  return fileBuffer.toString("base64");
};

export const deleteUserFile = async (relativePath: string) => {
  const fullPath = path.resolve(env.FILE_STORAGE_DIR, relativePath);
  await rm(fullPath, { force: true });
};
