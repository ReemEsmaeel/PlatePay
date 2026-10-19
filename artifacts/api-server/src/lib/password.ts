import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// OWASP's scrypt N=2^15, r=8, p=3 option; bounded memory and async work.
const parameters = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, parameters, (error, result) => {
      if (error) reject(error); else resolve(result);
    });
  });
}
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$32768$8$3$${salt.toString("hex")}$${key.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts.slice(0, 4).join("$") !== "scrypt$32768$8$3" ||
      !/^[a-f0-9]{32}$/.test(parts[4]!) || !/^[a-f0-9]{128}$/.test(parts[5]!)) return false;
  const actual = await derive(password, Buffer.from(parts[4]!, "hex"));
  return timingSafeEqual(actual, Buffer.from(parts[5]!, "hex"));
}
// Unknown accounts perform the same expensive verification, without a real user's hash.
export const dummyPasswordHash = `scrypt$32768$8$3$${"00".repeat(16)}$${"00".repeat(64)}`;
