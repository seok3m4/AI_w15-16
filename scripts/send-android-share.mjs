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
  npm.cmd run android:share -- "https://news.example.com/kbo"
  npm.cmd run android:share -- --subject "KBO 뉴스" "https://news.example.com/kbo"

Options:
  --subject <title>       Send Android EXTRA_SUBJECT
  --serial <deviceSerial> Use a specific adb device
  --dry-run               Print the adb command without running it
`);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const help = args.includes("--help") || args.includes("-h");
const serialIndex = args.indexOf("--serial");
const subjectIndex = args.indexOf("--subject");
let serial = "";
let subject = "";

if (serialIndex >= 0) {
  serial = args[serialIndex + 1] ?? "";
  args.splice(serialIndex, 2);
}

if (subjectIndex >= 0) {
  subject = args[subjectIndex + 1] ?? "";
  args.splice(subjectIndex, 2);
}

if (dryRun) {
  args.splice(args.indexOf("--dry-run"), 1);
}

if (help) {
  printUsage();
  process.exit(0);
}

const text = args.join(" ").trim();

if (!text) {
  console.error("Shared text is required.");
  printUsage();
  process.exit(1);
}

const sdkPath = findAndroidSdk();
const adbPath = sdkPath
  ? path.join(sdkPath, "platform-tools", isWindows ? "adb.exe" : "adb")
  : "";
const hasAdb = Boolean(adbPath) && existsSync(adbPath);
const adbArgs = [
  ...(serial ? ["-s", serial] : []),
  "shell",
  "am",
  "start",
  "-W",
  "-a",
  "android.intent.action.SEND",
  "-t",
  "text/plain",
  ...(subject
    ? ["--es", "android.intent.extra.SUBJECT", quoteForAndroidShell(subject)]
    : []),
  "--es",
  "android.intent.extra.TEXT",
  quoteForAndroidShell(text),
  "-p",
  APP_PACKAGE,
];

console.log(`Shared text: ${text}`);
if (subject) {
  console.log(`Shared subject: ${subject}`);
}
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
  console.error("Failed to send text to KBO Fan Hub.");
  console.error(result.stderr || result.stdout || result.error?.message || "Unknown adb error.");
  process.exit(1);
}

console.log("Shared text was sent to KBO Fan Hub.");

if (result.stdout) {
  console.log(result.stdout);
}
