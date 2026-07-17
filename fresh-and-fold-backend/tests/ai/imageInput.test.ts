import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { aiErrorHandler } from "../../src/ai/errors";
import { AI_MAX_IMAGE_BYTES, aiImageUpload, validateAiImage } from "../../src/ai/imageInput";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

const createImageTestApp = () => {
  const app = express();
  app.post("/image", aiImageUpload.single("image"), (req, res) => {
    validateAiImage(req.file);
    res.status(204).end();
  });
  app.use(aiErrorHandler);
  return app;
};

describe("AI image validation", () => {
  it("accepts one signed JPEG image in memory", async () => {
    await request(createImageTestApp())
      .post("/image")
      .attach("image", jpeg, { filename: "shirt.jpg", contentType: "image/jpeg" })
      .expect(204);
  });

  it("rejects a MIME type that is not allowed", async () => {
    const response = await request(createImageTestApp())
      .post("/image")
      .attach("image", Buffer.from("not an image"), {
        filename: "image.gif",
        contentType: "image/gif",
      })
      .expect(400);

    expect(response.body).toMatchObject({ code: "AI_UNSUPPORTED_IMAGE", retryable: false });
  });

  it("rejects a spoofed MIME type with an invalid signature", async () => {
    const response = await request(createImageTestApp())
      .post("/image")
      .attach("image", Buffer.from("not a jpeg"), {
        filename: "image.jpg",
        contentType: "image/jpeg",
      })
      .expect(400);

    expect(response.body.code).toBe("AI_UNSUPPORTED_IMAGE");
  });

  it("rejects oversized images before provider invocation", async () => {
    const response = await request(createImageTestApp())
      .post("/image")
      .attach("image", Buffer.alloc(AI_MAX_IMAGE_BYTES + 1), {
        filename: "large.jpg",
        contentType: "image/jpeg",
      })
      .expect(413);

    expect(response.body.code).toBe("AI_IMAGE_TOO_LARGE");
  });

  it("rejects multiple images", async () => {
    const response = await request(createImageTestApp())
      .post("/image")
      .attach("image", jpeg, { filename: "one.jpg", contentType: "image/jpeg" })
      .attach("image", jpeg, { filename: "two.jpg", contentType: "image/jpeg" })
      .expect(400);

    expect(response.body.code).toBe("AI_INVALID_IMAGE");
  });
});
