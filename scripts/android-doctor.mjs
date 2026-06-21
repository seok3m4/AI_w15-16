import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const checks = [
  {
    name: "local SDK path setup",
    args: ["run", "android:setup-local"],
  },
  {
    name: "Android Studio open dry run",
    args: ["run", "android:open:dry-run"],
  },
  {
    name: "Android build environment",
    args: ["run", "verify:android:env"],
  },
  {
    name: "Android device or emulator target",
    args: ["run", "verify:android:devices"],
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

try {
  for (const check of checks) {
    runCheck(check);
  }

  console.log("\nAndroid doctor finished.");
  console.log("If Runnable Android target ready is no, create an AVD in Android Studio or connect a real device.");
  console.log("When a target is ready, run:");
  console.log("  npm.cmd run mobile:dev");
  console.log("  npm.cmd run android:open");
} catch (error) {
  console.error("\nAndroid doctor failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
