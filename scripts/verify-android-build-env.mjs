import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const rootDir = process.cwd();
const isWindows = process.platform === "win32";
const strict = process.argv.includes("--strict") || process.env.ANDROID_ENV_STRICT === "1";

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

function commandExists(command) {
  const result = run(isWindows ? "where" : "which", [command]);

  return result.ok;
}

function getVersion(command, args) {
  const result = run(command, args);

  if (!result.ok) {
    return null;
  }

  const output = [result.stdout, result.stderr].filter(Boolean).join("\n");

  return output.split(/\r?\n/).find(Boolean) ?? output;
}

function findAndroidStudio() {
  const explicitPath = process.env.ANDROID_STUDIO_PATH;

  if (explicitPath && existsSync(explicitPath)) {
    return explicitPath;
  }

  if (isWindows) {
    const candidates = [
      path.join("C:", "Program Files", "Android", "Android Studio", "bin", "studio64.exe"),
      path.join("C:", "Program Files", "Android", "Android Studio", "bin", "studio.bat"),
      path.join(os.homedir(), "AppData", "Local", "Programs", "Android Studio", "bin", "studio64.exe"),
    ];

    return candidates.find((candidate) => existsSync(candidate)) ?? null;
  }

  if (process.platform === "darwin") {
    const macPath = "/Applications/Android Studio.app";

    return existsSync(macPath) ? macPath : null;
  }

  return null;
}

function findBundledJava(androidStudioPath) {
  if (!androidStudioPath || !isWindows) {
    return null;
  }

  const studioRoot = androidStudioPath.includes(`${path.sep}bin${path.sep}`)
    ? path.dirname(path.dirname(androidStudioPath))
    : androidStudioPath;
  const bundledJava = path.join(studioRoot, "jbr", "bin", "java.exe");

  return existsSync(bundledJava) ? bundledJava : null;
}

function findAndroidSdk() {
  const explicitPath = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  const candidates = [
    explicitPath,
    isWindows ? path.join(os.homedir(), "AppData", "Local", "Android", "Sdk") : "",
    process.platform === "darwin" ? path.join(os.homedir(), "Library", "Android", "sdk") : "",
    process.platform === "linux" ? path.join(os.homedir(), "Android", "Sdk") : "",
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) ?? "";
}

const gradleWrapperPath = isWindows
  ? path.join(rootDir, "android", "gradlew.bat")
  : path.join(rootDir, "android", "gradlew");
const localPropertiesPath = path.join(rootDir, "android", "local.properties");
const hasGradleWrapper = existsSync(gradleWrapperPath);
const hasSystemGradle = commandExists("gradle");
const androidStudioPath = findAndroidStudio();
const bundledJavaPath = findBundledJava(androidStudioPath);
const hasJavaOnPath = commandExists("java");
const hasBundledJava = Boolean(bundledJavaPath);
const hasJava = hasJavaOnPath || hasBundledJava;
const javaCommand = hasJavaOnPath ? "java" : bundledJavaPath;
const javaVersion = javaCommand ? getVersion(javaCommand, ["-version"]) : null;
const androidHome = findAndroidSdk();
const hasAndroidSdkEnv = Boolean(androidHome);
const hasAndroidSdkDir = hasAndroidSdkEnv && existsSync(androidHome);
const adbPath = hasAndroidSdkEnv
  ? path.join(androidHome, "platform-tools", isWindows ? "adb.exe" : "adb")
  : "";
const hasAdbFromSdk = Boolean(adbPath) && existsSync(adbPath);
const hasAdbOnPath = commandExists("adb");
const hasLocalProperties = existsSync(localPropertiesPath);
const localPropertiesContent = hasLocalProperties
  ? readFileSync(localPropertiesPath, "utf8")
  : "";
const localPropertiesHasSdkDir = /sdk\.dir=/.test(localPropertiesContent);

const checks = [
  {
    label: "Android Studio",
    ok: Boolean(androidStudioPath),
    detail: androidStudioPath ?? "not found automatically",
    requiredForIdeRun: true,
  },
  {
    label: "Gradle wrapper",
    ok: hasGradleWrapper,
    detail: hasGradleWrapper
      ? gradleWrapperPath
      : "not found; Android Studio can still sync using its bundled Gradle, or add a wrapper later.",
    requiredForCliBuild: true,
  },
  {
    label: "System Gradle",
    ok: hasSystemGradle,
    detail: hasSystemGradle ? "gradle found on PATH" : "not found on PATH",
    requiredForCliBuild: !hasGradleWrapper,
  },
  {
    label: "Java",
    ok: hasJava,
    detail: javaVersion
      ? hasJavaOnPath
        ? javaVersion
        : `${javaVersion} (${bundledJavaPath})`
      : "not found on PATH or Android Studio bundled JBR",
    requiredForCliBuild: true,
  },
  {
    label: "Android SDK",
    ok: hasAndroidSdkEnv,
    detail: hasAndroidSdkEnv ? androidHome : "ANDROID_HOME/ANDROID_SDK_ROOT not set and default SDK not found",
    requiredForCliBuild: true,
  },
  {
    label: "Android SDK directory",
    ok: hasAndroidSdkDir,
    detail: hasAndroidSdkEnv
      ? hasAndroidSdkDir
        ? androidHome
        : `${androidHome} does not exist`
      : "skipped because SDK env is not set",
    requiredForCliBuild: true,
  },
  {
    label: "Android local.properties",
    ok: hasLocalProperties && localPropertiesHasSdkDir,
    detail: hasLocalProperties
      ? localPropertiesHasSdkDir
        ? localPropertiesPath
        : `${localPropertiesPath} exists but sdk.dir is missing`
      : "not found; run `npm.cmd run android:setup-local` before Android Studio sync",
    requiredForIdeRun: true,
  },
  {
    label: "ADB",
    ok: hasAdbFromSdk || hasAdbOnPath,
    detail: hasAdbFromSdk
      ? adbPath
      : hasAdbOnPath
        ? "adb found on PATH"
        : "not found",
    requiredForEmulatorRun: true,
  },
];

const cliBuildReady =
  (hasGradleWrapper || hasSystemGradle) && hasJava && hasAndroidSdkEnv && hasAndroidSdkDir;
const ideRunReady =
  Boolean(androidStudioPath) &&
  hasJava &&
  hasAndroidSdkDir &&
  hasLocalProperties &&
  localPropertiesHasSdkDir &&
  (hasAdbFromSdk || hasAdbOnPath);
const emulatorReady = cliBuildReady && (hasAdbFromSdk || hasAdbOnPath);

console.log("Android build environment diagnostics:");

for (const check of checks) {
  console.log(`- ${check.ok ? "OK" : "WARN"} ${check.label}: ${check.detail}`);
}

console.log(`\nCLI APK build ready: ${cliBuildReady ? "yes" : "no"}`);
console.log(`Android Studio IDE run ready: ${ideRunReady ? "yes" : "no"}`);
console.log(`Emulator/device command-line run ready: ${emulatorReady ? "yes" : "no"}`);

if (!cliBuildReady) {
  console.log(
    "\nNext step: run `npm.cmd run android:open`, let Android Studio finish Gradle Sync, then run the app from the IDE.",
  );
}

if (strict && !cliBuildReady) {
  process.exitCode = 1;
}
