import bcrypt from "bcrypt";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  createAdminLoginHandler,
  createAdminMiddleware,
  issueAdminToken,
  isTrustedAdminClaims,
} from "../../src/admin/auth";
import { createSocketAuthenticationMiddleware } from "../../src/realtime/socketSecurity";

const secret = "admin-auth-test-secret";
const adminRecord = {
  _id: "admin-1",
  password: bcrypt.hashSync("CorrectPassword1!", 10),
  role: "admin",
};

const createTestApp = (record: typeof adminRecord | null = adminRecord) => {
  const app = express();
  app.use(express.json());
  app.post(
    "/admin/login",
    createAdminLoginHandler({
      findAdminByEmail: async () => record,
      comparePassword: bcrypt.compare,
      jwtSecret: secret,
    })
  );
  const adminMiddleware = createAdminMiddleware(secret);
  app.get("/admin/ai/analytics", adminMiddleware, (_req, res) => res.json({ success: true }));
  app.get("/admin/orders", adminMiddleware, (_req, res) => res.json({ success: true }));
  app.patch("/admin/orders/:id/status", adminMiddleware, (_req, res) => res.json({ success: true }));
  app.get("/admin/tickets", adminMiddleware, (_req, res) => res.json({ success: true }));
  return app;
};

const customerToken = () => jwt.sign({ userId: "customer-1", mobile: "9999999999" }, secret);
const adminToken = () => issueAdminToken(adminRecord, secret);

describe("Admin account lockdown and authorization", () => {
  it("has no public registration endpoint, including for customer JWT callers", async () => {
    const app = createTestApp();
    await request(app).post("/admin/register").send({ email: "attacker@example.com", password: "Password1!" }).expect(404);
    await request(app)
      .post("/admin/register")
      .set("Authorization", `Bearer ${customerToken()}`)
      .send({ email: "attacker@example.com", password: "Password1!", role: "admin", isAdmin: true })
      .expect(404);
  });

  it("issues an admin JWT only after valid credentials for an existing server-side admin", async () => {
    const response = await request(createTestApp())
      .post("/admin/login")
      .send({ email: "admin@example.com", password: "CorrectPassword1!", role: "user", isAdmin: false })
      .expect(200);

    expect(response.body).toEqual({ success: true, token: expect.any(String) });
    expect(JSON.stringify(response.body)).not.toContain(adminRecord.password);
    expect(jwt.verify(response.body.token, secret)).toMatchObject({ adminId: "admin-1", role: "admin" });
  });

  it("rejects malformed, nonexistent, non-admin, and invalid credentials without enumeration", async () => {
    await request(createTestApp()).post("/admin/login").send({}).expect(400, { message: "Invalid credentials" });
    await request(createTestApp(null))
      .post("/admin/login")
      .send({ email: "unknown@example.com", password: "CorrectPassword1!" })
      .expect(400, { message: "Invalid credentials" });
    await request(createTestApp())
      .post("/admin/login")
      .send({ email: "admin@example.com", password: "WrongPassword1!" })
      .expect(400, { message: "Invalid credentials" });
    await request(createTestApp({ ...adminRecord, role: "viewer" }))
      .post("/admin/login")
      .send({ email: "admin@example.com", password: "CorrectPassword1!" })
      .expect(400, { message: "Invalid credentials" });
  });

  it("rejects anonymous and customer JWT callers from every audited admin API", async () => {
    const app = createTestApp();
    const paths = [
      ["get", "/admin/ai/analytics"],
      ["get", "/admin/orders"],
      ["patch", "/admin/orders/order-1/status"],
      ["get", "/admin/tickets"],
    ] as const;

    for (const [method, path] of paths) {
      await request(app)[method](path).expect(401);
      await request(app)[method](path).set("Authorization", `Bearer ${customerToken()}`).expect(403);
    }
  });

  it("allows a valid admin JWT and rejects forged, expired, or client-role-only tokens", async () => {
    const app = createTestApp();
    await request(app).get("/admin/orders").set("Authorization", `Bearer ${adminToken()}`).expect(200);

    const expired = jwt.sign({ adminId: "admin-1", role: "admin" }, secret, { expiresIn: -1 });
    await request(app).get("/admin/orders").set("Authorization", `Bearer ${expired}`).expect(401);

    const forged = jwt.sign({ adminId: "admin-1", role: "admin" }, "wrong-secret");
    await request(app).get("/admin/orders").set("Authorization", `Bearer ${forged}`).expect(401);

    const customerWithRoleClaim = jwt.sign({ userId: "customer-1", role: "admin" }, secret);
    await request(app).get("/admin/orders").set("Authorization", `Bearer ${customerWithRoleClaim}`).expect(403);
  });

  it("uses an immutable, trusted claim shape shared with Socket.IO authentication", async () => {
    expect(isTrustedAdminClaims({ adminId: "admin-1", role: "admin" })).toBe(true);
    expect(isTrustedAdminClaims({ adminId: "admin-1", role: "admin", userId: "customer-1" })).toBe(false);
    expect(isTrustedAdminClaims({ adminId: "admin-1", role: "viewer" })).toBe(false);

    const socket = {
      handshake: {
        auth: {
          token: jwt.sign({ userId: "customer-1" }, secret),
          role: "admin",
          adminId: "admin-1",
        },
      },
      data: {},
    };
    const middleware = createSocketAuthenticationMiddleware(secret);
    await new Promise<void>((resolve, reject) => middleware(socket as any, (error) => error ? reject(error) : resolve()));
    expect(socket.data.auth).toEqual({ principalType: "user", userId: "customer-1" });
  });

  it("does not modify an existing admin record while authenticating", async () => {
    const before = { ...adminRecord };
    await request(createTestApp(adminRecord))
      .post("/admin/login")
      .send({ email: "admin@example.com", password: "CorrectPassword1!" })
      .expect(200);
    expect(adminRecord).toEqual(before);
  });
});
