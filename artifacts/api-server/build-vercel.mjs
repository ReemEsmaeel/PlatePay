import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(apiDir, "../..");
const output = path.join(root, ".vercel/output");
const functionDir = path.join(output, "functions/api.func");
const run = (args, basePath = "/") => execFileSync("pnpm", args, {
  cwd: root, stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production", PORT: "19380", BASE_PATH: basePath },
});

run(["run", "typecheck:libs"]);
run(["--filter", "@workspace/api-server", "run", "typecheck"]);
run(["--filter", "@workspace/platepay", "run", "typecheck"]);
run(["--filter", "@workspace/platepay", "run", "build"]);
run(["--filter", "@workspace/platepay-guide-video", "run", "build"], "/walkthrough/");
await rm(output, { recursive: true, force: true });
await mkdir(functionDir, { recursive: true });
await cp(path.join(root, "artifacts/platepay/dist/public"), path.join(output, "static"), { recursive: true });
await cp(
  path.join(root, "artifacts/platepay-guide-video/dist/public"),
  path.join(output, "static/walkthrough"),
  { recursive: true },
);

await build({
  absWorkingDir: apiDir,
  entryPoints: ["src/vercel.ts"],
  outfile: path.join(functionDir, "index.mjs"),
  bundle: true, platform: "node", target: "node24", format: "esm",
  // This native Replit dependency is lazy-loaded only outside Vercel.
  external: ["stripe-replit-sync", "mongodb-client-encryption", "kerberos", "snappy", "pino-pretty"],
  define: { "process.env.NODE_ENV": '"production"' },
  banner: { js: "import { createRequire } from 'node:module'; globalThis.require = createRequire(import.meta.url);" },
  logLevel: "info",
});
await writeFile(path.join(functionDir, ".vc-config.json"), JSON.stringify({
  runtime: "nodejs24.x", handler: "index.mjs", launcherType: "Nodejs",
  shouldAddHelpers: false, maxDuration: 60,
}, null, 2));
await writeFile(path.join(output, "config.json"), JSON.stringify({
  version: 3,
  routes: [
    { src: "/api(?:/.*)?", dest: "/api" },
    { src: "/assets/.*", headers: { "Cache-Control": "public, max-age=31536000, immutable" }, continue: true },
    { handle: "filesystem" },
    { src: "/assets/.*", status: 404 },
    { src: "/.*", dest: "/index.html", headers: { "Cache-Control": "no-cache" } },
  ],
}, null, 2));
console.log("Vercel Build Output ready: PlatePay frontend, public /walkthrough/ video, and one Node.js API function.");
