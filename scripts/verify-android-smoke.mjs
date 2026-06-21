import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const runMode = process.argv.includes("--run");
const serialIndex = process.argv.indexOf("--serial");
const serial =
  serialIndex >= 0 ? (process.argv[serialIndex + 1] ?? "").trim() : "";

const smokeChecks = [
  {
    name: "device diagnostics",
    args: ["run", "verify:android:devices"],
  },
  {
    name: "open app home deep link",
    args: ["run", "android:deep-link", "--", "app"],
  },
  {
    name: "open write deep link",
    args: ["run", "android:deep-link", "--", "write", "오늘 경기 리뷰"],
  },
  {
    name: "open game room deep link",
    args: [
      "run",
      "android:deep-link",
      "--",
      "game",
      "KIA-vs-HANWHA",
      "2026-06-09",
    ],
  },
  {
    name: "receive shared news text",
    args: [
      "run",
      "android:share",
      "--",
      "--subject",
      "KBO 뉴스",
      "https://sports.news.example/kbo",
    ],
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

function withTargetArgs(args) {
  if (args.includes("verify:android:devices")) {
    return args;
  }

  const result = [...args];
  const doubleDashIndex = result.indexOf("--");

  if (!runMode) {
    result.splice(doubleDashIndex + 1, 0, "--dry-run");
  }

  if (serial) {
    result.splice(doubleDashIndex + 1, 0, "--serial", serial);
  }

  return result;
}

function runCheck(check) {
  console.log(`\n== ${check.name} ==`);

  const command = process.platform === "win32" ? "cmd.exe" : npmCommand;
  const npmArgs = withTargetArgs(check.args);
  const args =
    process.platform === "win32"
      ? ["/d", "/s", "/c", npmCommand, ...npmArgs]
      : npmArgs;
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
  console.log(
    runMode
      ? "Android smoke test will send commands to a connected device."
      : "Android smoke test is running in dry-run mode.",
  );

  for (const check of smokeChecks) {
    runCheck(check);
  }

  console.log("\nAndroid smoke test passed.");

  if (!runMode) {
    console.log("To run against a real target, use:");
    console.log("  npm.cmd run android:smoke -- --run");
  }
} catch (error) {
  console.error("\nAndroid smoke test failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
