import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const rootDir = process.cwd();
const nextEnvPath = path.join(rootDir, "next-env.d.ts");
const nextEnvBefore = readFileSync(nextEnvPath, "utf8");

const checks = [
  {
    name: "mobile app integrated check",
    args: ["run", "mobile:check"],
  },
  {
    name: "production build",
    args: ["run", "build"],
  },
  {
    name: "Android deep link and share smoke test",
    args: ["run", "android:smoke"],
  },
];

function createProcessEnv() {
  if (process.platform !== "win32") {
    return process.env;
  }

  const normalized = {};
  let pathValue;

  for (const [key, value] of Object.entries(process.env)) {
    if (key.toLowerCase() === "path") {
      pathValue ||= value;
      continue;
    }

    normalized[key] = value;
  }

  if (pathValue) {
    normalized.Path = pathValue;
  }

  return normalized;
}

function runCheck(check) {
  console.log(`\n== ${check.name} ==`);

  const command = process.platform === "win32" ? "cmd.exe" : npmCommand;
  const args =
    process.platform === "win32"
      ? ["/d", "/s", "/c", npmCommand, ...check.args]
      : check.args;
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    env: createProcessEnv(),
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${check.name} failed with exit code ${result.status}.`);
  }
}

function restoreNextEnvIfNeeded() {
  const nextEnvAfter = readFileSync(nextEnvPath, "utf8");

  if (nextEnvAfter !== nextEnvBefore) {
    writeFileSync(nextEnvPath, nextEnvBefore, "utf8");
    console.log("\nRestored next-env.d.ts after Next.js build.");
  }
}

try {
  for (const check of checks) {
    runCheck(check);
  }

  console.log("\nKBO app release verification passed.");
  console.log(
    "Note: Android Studio still needs an emulator or connected device for the final native run check.",
  );
} catch (error) {
  console.error("\nKBO app release verification failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  restoreNextEnvIfNeeded();
}
