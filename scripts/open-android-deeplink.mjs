import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const APP_PACKAGE = "com.kominsuk.kbofanhub";
const isWindows = process.platform === "win32";

function findAndroidSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    isWindows ? path.join(os.homedir(), "AppData", "Local", "Android", "Sdk") : "",
    process.platform === "darwin" ? path.join(os.homedir(), "Library", "Android", "sdk") : "",
    process.platform === "linux" ? path.join(os.homedir(), "Android", "Sdk") : "",
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) ?? "";
}

function run(command, args = []) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
    error: result.error,
  };
}

function parseDevices(output) {
  return output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial, state] = line.split(/\s+/);

      return { serial, state };
    })
    .filter((device) => device.state === "device");
}

function quoteForAndroidShell(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function printUsage() {
  console.log(`Usage:
  npm.cmd run android:deep-link -- app
  npm.cmd run android:deep-link -- post <postId>
  npm.cmd run android:deep-link -- game <gameId> [YYYY-MM-DD]
  npm.cmd run android:deep-link -- write [title]
  npm.cmd run android:deep-link -- raw <kbofanhub://...>

Options:
  --serial <deviceSerial>  Use a specific adb device
  --dry-run                Print the adb command without running it
`);
}

function requireValue(value, message) {
  if (!value) {
    console.error(message);
    printUsage();
    process.exit(1);
  }
}

function buildDeepLink(args) {
  const [target = "app", ...rest] = args;

  if (target === "app") {
    return "kbofanhub://app";
  }

  if (target === "post" || target === "posts") {
    const postId = rest[0];
    requireValue(postId, "postId is required.");

    return `kbofanhub://posts/${encodeURIComponent(postId)}`;
  }

  if (target === "game" || target === "games") {
    const gameId = rest[0];
    const date = rest[1];
    requireValue(gameId, "gameId is required.");

    const query = date ? `?date=${encodeURIComponent(date)}` : "";

    return `kbofanhub://games/${encodeURIComponent(gameId)}${query}`;
  }

  if (target === "write") {
    const title = rest.join(" ").trim();

    if (!title) {
      return "kbofanhub://write";
    }

    const params = new URLSearchParams({
      tags: "KBO",
      title,
    });

    return `kbofanhub://write?${params.toString()}`;
  }

  if (target === "raw") {
    const rawDeepLink = rest[0];
    requireValue(rawDeepLink, "raw deep link is required.");

    if (!rawDeepLink.startsWith("kbofanhub://")) {
      console.error("raw deep link must start with kbofanhub://");
      process.exit(1);
    }

    return rawDeepLink;
  }

  console.error(`Unknown deep link target: ${target}`);
  printUsage();
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const help = args.includes("--help") || args.includes("-h");
const serialIndex = args.indexOf("--serial");
let serial = "";

if (serialIndex >= 0) {
  serial = args[serialIndex + 1] ?? "";
  args.splice(serialIndex, 2);
}

if (dryRun) {
  args.splice(args.indexOf("--dry-run"), 1);
}

if (help) {
  printUsage();
  process.exit(0);
}

const sdkPath = findAndroidSdk();
const adbPath = sdkPath
  ? path.join(sdkPath, "platform-tools", isWindows ? "adb.exe" : "adb")
  : "";
const hasAdb = Boolean(adbPath) && existsSync(adbPath);
const deepLink = buildDeepLink(args);
const adbArgs = [
  ...(serial ? ["-s", serial] : []),
  "shell",
  "am",
  "start",
  "-W",
  "-a",
  "android.intent.action.VIEW",
  "-d",
  quoteForAndroidShell(deepLink),
  APP_PACKAGE,
];

console.log(`Deep link: ${deepLink}`);
console.log(`ADB command: ${adbPath || "adb"} ${adbArgs.join(" ")}`);

if (dryRun) {
  console.log("Dry run only. Nothing was opened.");
  process.exit(0);
}

if (!hasAdb) {
  console.error("ADB was not found.");
  console.error("Install Android Studio or set ANDROID_HOME/ANDROID_SDK_ROOT first.");
  process.exit(1);
}

const devicesResult = run(adbPath, ["devices"]);

if (!devicesResult.ok) {
  console.error("Failed to read connected Android devices.");
  console.error(devicesResult.stderr || devicesResult.error?.message || "Unknown adb error.");
  process.exit(1);
}

const devices = parseDevices(devicesResult.stdout);

if (devices.length === 0) {
  console.error("No runnable Android device was found.");
  console.error("Start an emulator or connect a physical device with USB debugging enabled.");
  process.exit(1);
}

if (!serial && devices.length > 1) {
  console.error("More than one Android device is connected.");
  console.error("Use --serial <deviceSerial> to choose a target.");
  for (const device of devices) {
    console.error(`- ${device.serial}`);
  }
  process.exit(1);
}

const result = run(adbPath, adbArgs);

if (!result.ok) {
  console.error("Failed to open KBO Fan Hub deep link.");
  console.error(result.stderr || result.stdout || result.error?.message || "Unknown adb error.");
  process.exit(1);
}

console.log("KBO Fan Hub deep link was sent.");

if (result.stdout) {
  console.log(result.stdout);
}
