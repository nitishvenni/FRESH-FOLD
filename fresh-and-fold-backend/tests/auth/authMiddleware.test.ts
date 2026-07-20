import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { authMiddleware } from "../../src/middleware/authMiddleware";

process.env.JWT_SECRET ||= "stage-4-test-secret";

const response = () => {
  const result: any = { statusCode: 200, body: null, locals: {} };
  result.status = (statusCode: number) => { result.statusCode = statusCode; return result; };
  result.json = (body: unknown) => { result.body = body; return result; };
  return result;
};

describe("customer JWT middleware", () => {
  it("accepts a valid customer identity and discards untrusted role claims", () => {
    const token = jwt.sign({ userId: "customer-1", role: "admin" }, process.env.JWT_SECRET as string);
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = response();
    let nextCalled = false;
    authMiddleware(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(req.user).toEqual({ userId: "customer-1" });
  });

  it("rejects tokens without a customer identity", () => {
    const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET as string);
    const res = response();
    authMiddleware({ headers: { authorization: `Bearer ${token}` } } as any, res, () => undefined);
    expect(res.statusCode).toBe(401);
  });
});
