import multer from "multer";
import { AiError } from "./errors";

export const AI_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Provider-neutral, in-memory image input. Never log its data value. */
export type AiImageInput = {
  mimeType: string;
  data: Buffer;
};

const allowedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const hasPrefix = (buffer: Buffer, bytes: readonly number[]) =>
  buffer.length >= bytes.length && bytes.every((byte, index) => buffer[index] === byte);

const hasImageSignature = (mimeType: string, buffer: Buffer): boolean => {
  if (mimeType === "image/jpeg") {
    return hasPrefix(buffer, [0xff, 0xd8, 0xff]);
  }

  if (mimeType === "image/png") {
    return hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }

  return (
    mimeType === "image/webp" &&
    hasPrefix(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    buffer.length >= 12 &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
};

/** In-memory only multipart middleware for future image capabilities. */
export const aiImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: AI_MAX_IMAGE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedImageMimeTypes.has(file.mimetype)) {
      return callback(new AiError("AI_UNSUPPORTED_IMAGE"));
    }
    callback(null, true);
  },
});

export const validateAiImage = (file: Express.Multer.File | undefined): Express.Multer.File => {
  if (!file) {
    throw new AiError("AI_INVALID_IMAGE");
  }

  if (file.size > AI_MAX_IMAGE_BYTES) {
    throw new AiError("AI_IMAGE_TOO_LARGE");
  }

  if (!allowedImageMimeTypes.has(file.mimetype) || !hasImageSignature(file.mimetype, file.buffer)) {
    throw new AiError("AI_UNSUPPORTED_IMAGE");
  }

  return file;
};

/** Exposes validated bytes to an AI adapter without persisting them. */
export const toAiImageInput = (file: Express.Multer.File): AiImageInput => ({
  mimeType: file.mimetype,
  data: file.buffer,
});
