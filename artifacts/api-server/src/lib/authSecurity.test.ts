import test from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import { hashPassword, verifyPassword, dummyPasswordHash } from "./password";
import { requireSameOriginMutation } from "../middlewares/requestSecurity";
import { requireRole, type PlatePayRequest } from "../middlewares/auth";
import { sessionCookieName, sessionToken } from "./sessions";
import { LoginAccountBody, RegisterAccountBody } from "@workspace/api-zod";

test("passwords are salted; only the exact password verifies", async () => {
  const password = "A long demo passphrase 2076!";
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.ok(!first.includes(password));
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(`${password}x`, first), false);
  assert.equal(await verifyPassword(password, dummyPasswordHash), false);
  assert.equal(await verifyPassword(password, "invalid"), false);
});
test("signup validates credentials and refuses client-chosen privilege fields", () => {
  const input = { email: "auth-test@example.invalid", displayName: "Auth test", password: "A secure demo passphrase!" };
  assert.equal(RegisterAccountBody.strict().safeParse(input).success, true);
  assert.equal(RegisterAccountBody.strict().safeParse({ ...input, password: "short" }).success, false);
  assert.equal(RegisterAccountBody.strict().safeParse({ ...input, password: "x".repeat(7) }).success, false);
  assert.equal(RegisterAccountBody.strict().safeParse({ ...input, password: "x".repeat(8) }).success, true);
  assert.equal(RegisterAccountBody.strict().safeParse({ ...input, password: "x".repeat(128) }).success, true);
  assert.equal(RegisterAccountBody.strict().safeParse({ ...input, password: "x".repeat(129) }).success, false);
  assert.equal(RegisterAccountBody.strict().safeParse({ ...input, email: "invalid" }).success, false);
  assert.equal(RegisterAccountBody.strict().safeParse({ ...input, role: "admin" }).success, false);
  assert.equal(LoginAccountBody.strict().safeParse({ email: input.email, password: "x".repeat(129) }).success, false);
});
function securityCheck(method: string, headers: Record<string, string>) {
  let status = 0;
  let advanced = false;
  const req = { method, get: (key: string) => headers[key] } as Request;
  const res = { status(code: number) { status = code; return this; }, json() {} } as unknown as Response;
  requireSameOriginMutation(req, res, () => { advanced = true; });
  return { status, advanced };
}
test("unsafe browser requests need the custom header and a same-origin source", () => {
  assert.equal(securityCheck("POST", { host: "platepay.example" }).status, 403);
  assert.equal(securityCheck("POST", {
    host: "platepay.example", origin: "https://attacker.invalid", "x-platepay-request": "1",
  }).status, 403);
  assert.equal(securityCheck("POST", {
    host: "platepay.example", "sec-fetch-site": "cross-site", "x-platepay-request": "1",
  }).status, 403);
  assert.equal(securityCheck("GET", {}).advanced, true);
  assert.equal(securityCheck("POST", { "x-platepay-request": "1" }).advanced, true);
});
test("TLS sessions use host-only cookies and reject malformed session tokens", () => {
  const req = { secure: true, cookies: { "__Host-platepay_session": "a".repeat(43) } } as unknown as Request;
  assert.equal(sessionCookieName(req), "__Host-platepay_session");
  assert.equal(sessionToken(req), "a".repeat(43));
  req.cookies["__Host-platepay_session"] = "malformed";
  assert.equal(sessionToken(req), undefined);
});
test("role guards reject public callers and driver access to admin routes", () => {
  for (const [role, expected] of [[undefined, 401], ["driver", 403], ["merchant", 403], ["admin", 0]] as const) {
    let status = 0;
    let advanced = false;
    const req = { platepayUser: role ? { role } : undefined } as PlatePayRequest;
    const res = { status(code: number) { status = code; return this; }, json() {} } as unknown as Response;
    requireRole("admin")(req, res, () => { advanced = true; });
    assert.equal(status, expected);
    assert.equal(advanced, expected === 0);
  }
});
