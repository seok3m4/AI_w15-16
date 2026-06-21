import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const strict = process.argv.includes("--strict") || process.env.ANDROID_DEVICE_STRICT === "1";
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

function parseAdbDevices(output) {
  return output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial, state] = line.split(/\s+/);

      return { serial, state };
    });
}

const sdkPath = findAndroidSdk();
const adbPath = sdkPath ? path.join(sdkPath, "platform-tools", isWindows ? "adb.exe" : "adb") : "";
const emulatorPath = sdkPath ? path.join(sdkPath, "emulator", isWindows ? "emulator.exe" : "emulator") : "";
const avdManagerPath = sdkPath
  ? path.join(sdkPath, "cmdline-tools", "latest", "bin", isWindows ? "avdmanager.bat" : "avdmanager")
  : "";
const sdkManagerPath = sdkPath
  ? path.join(sdkPath, "cmdline-tools", "latest", "bin", isWindows ? "sdkmanager.bat" : "sdkmanager")
  : "";
const systemImagesPath = sdkPath ? path.join(sdkPath, "system-images") : "";
const hasAdb = Boolean(adbPath) && existsSync(adbPath);
const hasEmulator = Boolean(emulatorPath) && existsSync(emulatorPath);
const hasAvdManager = Boolean(avdManagerPath) && existsSync(avdManagerPath);
const hasSdkManager = Boolean(sdkManagerPath) && existsSync(sdkManagerPath);
const hasSystemImages = Boolean(systemImagesPath) && existsSync(systemImagesPath);

console.log("Android device diagnostics:");

if (!sdkPath) {
  console.log("- WARN Android SDK: not found");
  process.exitCode = strict ? 1 : 0;
  process.exit();
}

console.log(`- OK Android SDK: ${sdkPath}`);
console.log(`- ${hasAdb ? "OK" : "WARN"} ADB: ${hasAdb ? adbPath : "not found"}`);
console.log(`- ${hasEmulator ? "OK" : "WARN"} Emulator: ${hasEmulator ? emulatorPath : "not found"}`);
console.log(`- ${hasAvdManager ? "OK" : "WARN"} AVD Manager: ${hasAvdManager ? avdManagerPath : "not found"}`);
console.log(`- ${hasSdkManager ? "OK" : "WARN"} SDK Manager: ${hasSdkManager ? sdkManagerPath : "not found"}`);
console.log(`- ${hasSystemImages ? "OK" : "WARN"} System images: ${hasSystemImages ? systemImagesPath : "not found"}`);

let devices = [];
let avds = [];

if (hasAdb) {
  const adbResult = run(adbPath, ["devices"]);

  if (adbResult.ok) {
    devices = parseAdbDevices(adbResult.stdout);
  } else {
    console.log(`- WARN adb devices failed: ${adbResult.stderr || adbResult.error?.message || "unknown error"}`);
  }
}

if (hasEmulator) {
  const emulatorResult = run(emulatorPath, ["-list-avds"]);

  if (emulatorResult.ok) {
    avds = emulatorResult.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } else {
    console.log(
      `- WARN emulator -list-avds failed: ${emulatorResult.stderr || emulatorResult.error?.message || "unknown error"}`,
    );
  }
}

if (devices.length > 0) {
  console.log("- Connected devices:");

  for (const device of devices) {
    console.log(`  - ${device.serial} (${device.state})`);
  }
} else {
  console.log("- WARN Connected devices: none");
}

if (avds.length > 0) {
  console.log("- Available AVDs:");

  for (const avd of avds) {
    console.log(`  - ${avd}`);
  }
} else {
  console.log("- WARN Available AVDs: none");
}

const hasRunnableTarget =
  devices.some((device) => device.state === "device") || avds.length > 0;

console.log(`\nRunnable Android target ready: ${hasRunnableTarget ? "yes" : "no"}`);

if (!hasRunnableTarget) {
  if (!hasAvdManager || !hasSystemImages) {
    console.log(
      "Next step: in Android Studio, install Android SDK Command-line Tools and an emulator system image, then create a Virtual Device.",
    );
  } else {
    console.log(
      "Next step: create an Android Studio virtual device or connect a physical Android device with USB debugging enabled.",
    );
  }
}

if (strict && !hasRunnableTarget) {
  process.exitCode = 1;
}
