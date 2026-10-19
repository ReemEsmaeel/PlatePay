import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import mongoose from "mongoose";
import { connectMongoDB } from "../db/mongo";
import { grantConfiguredAdmin } from "../lib/adminBootstrap";

async function main() {
  if (!process.stdin.isTTY) throw new Error("Run this command in an interactive terminal. Do not pass passwords as arguments.");
  await connectMongoDB();
  process.stdout.write("Password for the owner-configured account (hidden): ");
  const mutedOutput = new Writable({ write(_chunk, _encoding, done) { done(); } });
  const prompt = createInterface({ input: process.stdin, output: mutedOutput, terminal: true });
  let password: string;
  try { password = await prompt.question(""); }
  finally { prompt.close(); process.stdout.write("\n"); }
  await grantConfiguredAdmin(password);
  process.stdout.write("Initial administrator access granted. Refresh your PlatePay session.\n");
}
main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : "Admin setup failed."}\n`);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
