import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const checks = [
  {
    name: "static app and Android shell verification",
    args: ["run", "verify:kbo-app"],
  },
  {
    name: "runtime route verification",
    args: ["run", "verify:kbo-app:runtime"],
  },
  {
    name: "Android build environment diagnostics",
    args: ["run", "verify:android:env"],
  },
  {
    name: "Android device diagnostics",
    args: ["run", "verify:android:devices"],
  },
  {
    name: "lint",
    args: ["run", "lint"],
  },
];

function runCheck(check) {
  console.log(`\n== ${check.name} ==`);

  const command = process.platform === "win32" ? "cmd.exe" : npmCommand;
  const args =
    process.platform === "win32"
      ? ["/d", "/s", "/c", npmCommand, ...check.args]
      : check.args;

  const result = spawnSync(command, args, {
    cwd: process.cwd(),
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

try {
  for (const check of checks) {
    runCheck(check);
  }

  console.log("\nKBO app check passed.");
  console.log(
    "Note: Android APK build/run still needs Android Studio or a configured Android SDK/Gradle environment.",
  );
} catch (error) {
  console.error("\nKBO app check failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
